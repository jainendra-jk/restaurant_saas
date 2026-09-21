import asyncio
import uuid
from typing import Annotated, Optional, Tuple
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import settings
from dependencies import get_supabase_user_id, verify_staff_for_restaurant
from http_client import get_client
from services.qr_generate import build_table_qr_payload, slugify_restaurant_name

router = APIRouter()

# Bounds concurrent qr_token backfill writes so a 500-table restaurant does not
# open 500 simultaneous connections to PostgREST.
_QR_TOKEN_WRITE_CONCURRENCY = 8


def _service_config() -> Tuple[str, str]:
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured on the API server",
        )
    return base, key


class QrGenerateBody(BaseModel):
    restaurant_id: str
    table_count: int = Field(..., ge=1, le=500)
    origin: Optional[str] = None


async def _fetch_restaurant(restaurant_id: str) -> Tuple[str, str]:
    base, key = _service_config()
    r = await get_client().get(
        f"{base}/rest/v1/restaurants",
        params={"id": f"eq.{restaurant_id}", "select": "slug,name", "limit": "1"},
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
        },
    )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to load restaurant")
    rows = r.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    row = rows[0]
    slug = (row.get("slug") or "").strip()
    name = (row.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Restaurant has no name")
    if not slug:
        slug = slugify_restaurant_name(name)
    return slug, name


async def _fetch_tables_for_qr(restaurant_id: str, table_count: int) -> list[dict]:
    base, key = _service_config()
    client = get_client()
    r = await client.get(
        f"{base}/rest/v1/tables",
        params={
            "restaurant_id": f"eq.{restaurant_id}",
            "select": "id,number,qr_token",
            "order": "number.asc",
            "limit": str(table_count),
        },
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
        },
    )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to load tables")
    rows = r.json()
    if not rows:
        raise HTTPException(status_code=400, detail="No tables found for restaurant")

    # Backfill missing qr_tokens. This used to be a strictly serial loop, so a
    # first-time generate for N tables cost N sequential PostgREST round-trips
    # (seconds for a large restaurant). The writes are independent, so run them
    # concurrently under a small semaphore.
    missing = [row for row in rows if not (row.get("qr_token") or "").strip()]
    if missing:
        semaphore = asyncio.Semaphore(_QR_TOKEN_WRITE_CONCURRENCY)
        write_headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        async def assign_token(row: dict) -> None:
            generated = str(uuid.uuid4())
            async with semaphore:
                up = await client.patch(
                    f"{base}/rest/v1/tables",
                    params={"id": f"eq.{row['id']}"},
                    headers=write_headers,
                    json={"qr_token": generated},
                )
            if up.status_code not in (200, 204):
                raise HTTPException(status_code=502, detail="Failed to assign table qr_token")
            row["qr_token"] = generated

        await asyncio.gather(*(assign_token(row) for row in missing))

    return [
        {
            "table_number": int(row["number"]),
            "qr_token": str(row["qr_token"]).strip(),
        }
        for row in rows
    ]


@router.post("/qr/generate")
async def qr_generate_endpoint(
    user_id: Annotated[str, Depends(get_supabase_user_id)],
    body: QrGenerateBody,
) -> dict:
    await verify_staff_for_restaurant(user_id, body.restaurant_id)

    origin = (body.origin or settings.customer_app_origin or "").strip()
    if not origin:
        raise HTTPException(
            status_code=400,
            detail="Missing origin: set CUSTOMER_APP_ORIGIN or pass origin in body",
        )
    # `origin` is echoed into every printed QR code. Restrict it to an http(s)
    # origin so a caller cannot mint QR codes pointing at javascript:/data: URLs.
    parsed = urlparse(origin)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="origin must be an http(s) URL")

    # Independent reads; issuing them together removes one serial round-trip.
    (slug, name), tables_data = await asyncio.gather(
        _fetch_restaurant(body.restaurant_id),
        _fetch_tables_for_qr(body.restaurant_id, body.table_count),
    )

    try:
        # Rendering up to 500 QR PNGs is CPU-bound; on the event loop it stalled
        # every other in-flight request for the duration.
        return await asyncio.to_thread(
            build_table_qr_payload,
            origin=origin,
            restaurant_slug=slug,
            restaurant_name=name,
            tables_data=tables_data,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
