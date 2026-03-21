from typing import Annotated, Optional, Tuple

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

    try:
        return build_table_qr_payload(
            origin=origin,
            restaurant_slug=slug,
            restaurant_name=name,
            table_count=body.table_count,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
