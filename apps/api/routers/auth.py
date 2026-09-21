import asyncio
import logging
from typing import Annotated, Dict, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import settings
from dependencies import get_supabase_user_id
from http_client import get_client

router = APIRouter()
logger = logging.getLogger(__name__)

# Scheduled "close the store, then sign out" tasks, keyed by a caller-supplied
# event_id. The cap bounds memory: the endpoint is reachable by anyone holding a
# valid access token and each call inserts an entry, so an unbounded dict was a
# slow memory-growth vector.
_MAX_PENDING_LOGOUTS = 1000
_pending_logout_tasks: Dict[str, "asyncio.Task[None]"] = {}
_pending_logout_lock = asyncio.Lock()


class LogoutOnCloseBody(BaseModel):
    access_token: str = Field(..., min_length=20)
    event_id: str = Field(..., min_length=8, max_length=128)
    delay_ms: int = Field(default=2500, ge=500, le=10000)


class CancelLogoutOnCloseBody(BaseModel):
    event_id: str = Field(..., min_length=8, max_length=128)


async def _supabase_logout(access_token: str) -> None:
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        return
    try:
        await get_client().post(
            f"{base}/auth/v1/logout",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": key,
            },
        )
    except httpx.RequestError as e:
        logger.warning("logout-on-close: Supabase logout failed: %s", type(e).__name__)


def _service_headers(key: str) -> dict:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


async def _resolve_user_id(access_token: str) -> Optional[str]:
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        return None
    try:
        user_resp = await get_client().get(
            f"{base}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": key,
            },
        )
    except httpx.RequestError:
        return None
    if user_resp.status_code != 200:
        return None
    return str((user_resp.json() or {}).get("id") or "").strip() or None


async def _resolve_restaurant_id_for_user(user_id: str) -> Optional[str]:
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        return None
    try:
        profile_resp = await get_client().get(
            f"{base}/rest/v1/staff_profiles",
            params={
                "user_id": f"eq.{user_id}",
                "select": "restaurant_id",
                "limit": 1,
            },
            headers=_service_headers(key),
        )
    except httpx.RequestError:
        return None
    if profile_resp.status_code != 200:
        return None
    rows = profile_resp.json() or []
    if not isinstance(rows, list) or not rows:
        return None
    return str((rows[0] or {}).get("restaurant_id") or "").strip() or None


async def _close_store_for_restaurant(restaurant_id: str) -> None:
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        return
    client = get_client()
    headers = {**_service_headers(key), "Prefer": "return=minimal"}
    try:
        # Close the store first so no window exists where tables are inactive but
        # the restaurant still reads as open.
        await client.patch(
            f"{base}/rest/v1/restaurants",
            params={"id": f"eq.{restaurant_id}"},
            json={"is_open": False},
            headers=headers,
        )
        await client.patch(
            f"{base}/rest/v1/tables",
            params={"restaurant_id": f"eq.{restaurant_id}"},
            json={"status": "inactive"},
            headers=headers,
        )
    except httpx.RequestError as e:
        logger.warning("logout-on-close: failed to close store: %s", type(e).__name__)


async def _close_store_for_token(access_token: str) -> None:
    user_id = await _resolve_user_id(access_token)
    if not user_id:
        return
    restaurant_id = await _resolve_restaurant_id_for_user(user_id)
    if not restaurant_id:
        return
    await _close_store_for_restaurant(restaurant_id)


async def _schedule_logout(event_id: str, access_token: str, delay_ms: int) -> None:
    """Close the tenant's store and revoke the session after `delay_ms`.

    Cancelled by /auth/cancel-logout-on-close when the operator reopens a tab
    within the delay window.
    """
    try:
        await asyncio.sleep(delay_ms / 1000.0)
        await _close_store_for_token(access_token)
        await _supabase_logout(access_token)
    except asyncio.CancelledError:
        raise
    except Exception:
        # A background task must not die silently, nor take the worker with it.
        logger.exception("logout-on-close: scheduled logout failed")
    finally:
        async with _pending_logout_lock:
            # Only clear our own entry: a cancelled task's cleanup runs after a
            # replacement task may already have been registered under this id.
            if _pending_logout_tasks.get(event_id) is asyncio.current_task():
                _pending_logout_tasks.pop(event_id, None)


@router.post("/auth/logout-on-close")
async def logout_on_close(body: LogoutOnCloseBody) -> dict:
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        raise HTTPException(status_code=503, detail="Supabase is not configured on the API server")

    try:
        r = await get_client().get(
            f"{base}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {body.access_token}",
                "apikey": key,
            },
        )
    except httpx.RequestError:
        raise HTTPException(status_code=504, detail="Auth provider unreachable")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    async with _pending_logout_lock:
        if (
            len(_pending_logout_tasks) >= _MAX_PENDING_LOGOUTS
            and body.event_id not in _pending_logout_tasks
        ):
            raise HTTPException(status_code=429, detail="Too many pending logout events")
        existing = _pending_logout_tasks.get(body.event_id)
        if existing and not existing.done():
            existing.cancel()
        task = asyncio.create_task(
            _schedule_logout(body.event_id, body.access_token, body.delay_ms)
        )
        _pending_logout_tasks[body.event_id] = task
    return {"queued": True}


@router.post("/auth/cancel-logout-on-close")
async def cancel_logout_on_close(
    body: CancelLogoutOnCloseBody,
    _user_id: Annotated[str, Depends(get_supabase_user_id)],
) -> dict:
    async with _pending_logout_lock:
        task = _pending_logout_tasks.pop(body.event_id, None)
    if task and not task.done():
        task.cancel()
    return {"cancelled": bool(task)}
