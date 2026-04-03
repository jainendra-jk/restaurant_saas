from typing import Annotated, Optional, Tuple
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import settings
from dependencies import get_supabase_user_id, verify_staff_for_restaurant
from services.qr_generate import build_table_qr_payload, slugify_restaurant_name

router = APIRouter()


class QrGenerateBody(BaseModel):
    restaurant_id: str
    table_count: int = Field(..., ge=1, le=500)
    origin: Optional[str] = None


async def _fetch_restaurant(restaurant_id: str) -> Tuple[str, str]:
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured on the API server",
        )
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(
            f"{base}/rest/v1/restaurants",
            params={"id": f"eq.{restaurant_id}", "select": "slug,name"},
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
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured on the API server",
        )
    async with httpx.AsyncClient(timeout=30.0) as client:
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

    async with httpx.AsyncClient(timeout=30.0) as client:
        for row in rows:
            if (row.get("qr_token") or "").strip():
                continue
            generated = str(uuid.uuid4())
            up = await client.patch(
                f"{base}/rest/v1/tables",
                params={"id": f"eq.{row['id']}"},
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                },
                json={"qr_token": generated},
            )
            if up.status_code not in (200, 204):
                raise HTTPException(status_code=502, detail="Failed to assign table qr_token")
            row["qr_token"] = generated
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

    slug, name = await _fetch_restaurant(body.restaurant_id)
    tables_data = await _fetch_tables_for_qr(body.restaurant_id, body.table_count)

    try:
        return build_table_qr_payload(
            origin=origin,
            restaurant_slug=slug,
            restaurant_name=name,
            tables_data=tables_data,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
