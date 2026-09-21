import uuid
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings
from http_client import get_client

security = HTTPBearer(auto_error=False)


def _require_supabase_config() -> tuple[str, str]:
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured on the API server",
        )
    return base, key


async def get_supabase_user_id(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
        )
    base, key = _require_supabase_config()
    try:
        r = await get_client().get(
            f"{base}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {creds.credentials}",
                "apikey": key,
            },
        )
    except httpx.RequestError:
        # Never surface the upstream URL/exception text to the caller.
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Auth provider unreachable",
        )
    if r.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    uid = (r.json() or {}).get("id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth response",
        )
    return str(uid)


async def verify_staff_for_restaurant(user_id: str, restaurant_id: str) -> None:
    """Authorize `user_id` as staff of `restaurant_id`, or raise 400/403/502.

    Validating the UUID first matters: `restaurant_id` is interpolated into a
    PostgREST `eq.` filter, and a non-UUID value would be passed through to the
    query string rather than rejected.
    """
    try:
        uuid.UUID(restaurant_id)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid restaurant_id")

    base, key = _require_supabase_config()
    try:
        r = await get_client().get(
            f"{base}/rest/v1/staff_profiles",
            params={
                "user_id": f"eq.{user_id}",
                "restaurant_id": f"eq.{restaurant_id}",
                "select": "id",
                "limit": "1",
            },
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
            },
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Failed to verify staff membership",
        )
    if r.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to verify staff membership",
        )
    if not r.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a staff member of this restaurant",
        )
