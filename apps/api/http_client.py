"""Process-wide HTTP client for outbound Supabase calls.

Every request handler previously opened its own ``httpx.AsyncClient`` via
``async with``, which tears the connection pool down on exit. That meant a fresh
TCP connect plus a full TLS handshake for *each* Supabase call — and an
authenticated endpoint makes at least two (verify the JWT, then check staff
membership) before it does any real work. On a hosted Supabase project that is
roughly 100-200 ms of avoidable round-trips per API request.

A single shared client keeps connections alive between requests, so those calls
reuse a warm HTTP/2 connection. The client is created on startup and closed on
shutdown so nothing leaks between reloads.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

import httpx
from fastapi import FastAPI

# Connect fast or fail fast; allow longer read budgets for the heavier
# Supabase writes (bulk menu inserts) that previously used a 120 s ceiling.
_DEFAULT_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=30.0, pool=5.0)
_MENU_WRITE_TIMEOUT = httpx.Timeout(connect=5.0, read=120.0, write=120.0, pool=5.0)
_LIMITS = httpx.Limits(max_connections=50, max_keepalive_connections=20)

_client: Optional[httpx.AsyncClient] = None


def get_client() -> httpx.AsyncClient:
    """Shared client. Falls back to lazy creation so imports/tests work standalone."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT, limits=_LIMITS)
    return _client


def menu_write_timeout() -> httpx.Timeout:
    """Longer read budget for bulk menu replacement writes."""
    return _MENU_WRITE_TIMEOUT


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    get_client()
    try:
        yield
    finally:
        global _client
        if _client is not None and not _client.is_closed:
            await _client.aclose()
        _client = None
