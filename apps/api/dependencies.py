import uuid
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings

security = HTTPBearer(auto_error=False)


async def get_supabase_user_id(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
        )
    token = creds.credentials
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured on the API server",
        )
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(
            f"{base}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": key,
            },
        )
    if r.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    data = r.json()
    uid = data.get("id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth response",
        )
    return uid


async def verify_staff_for_restaurant(user_id: str, restaurant_id: str) -> None:
    try:
        uuid.UUID(restaurant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid restaurant_id")

    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured on the API server",
        )

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(
            f"{base}/rest/v1/staff_profiles",
            params={
                "user_id": f"eq.{user_id}",
                "restaurant_id": f"eq.{restaurant_id}",
                "select": "id",
            },
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
            },
        )
    if r.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to verify staff membership",
        )
    rows = r.json()
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a staff member of this restaurant",
        )
