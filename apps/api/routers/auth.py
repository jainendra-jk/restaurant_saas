import asyncio
from typing import Annotated, Dict, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import settings
from dependencies import get_supabase_user_id

router = APIRouter()

_pending_logout_tasks: Dict[str, asyncio.Task[None]] = {}
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
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.post(
            f"{base}/auth/v1/logout",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": key,
            },
        )


async def _schedule_logout(event_id: str, access_token: str, delay_ms: int) -> None:
    await asyncio.sleep(delay_ms / 1000.0)
    await _supabase_logout(access_token)
    async with _pending_logout_lock:
        _pending_logout_tasks.pop(event_id, None)


@router.post("/auth/logout-on-close")
async def logout_on_close(body: LogoutOnCloseBody) -> dict:
    base = settings.supabase_base()
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        raise HTTPException(status_code=503, detail="Supabase is not configured on the API server")

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{base}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {body.access_token}",
                "apikey": key,
            },
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    task = asyncio.create_task(_schedule_logout(body.event_id, body.access_token, body.delay_ms))
    async with _pending_logout_lock:
        existing = _pending_logout_tasks.get(body.event_id)
        if existing and not existing.done():
            existing.cancel()
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
