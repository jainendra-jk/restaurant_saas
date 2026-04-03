import asyncio
import logging
import time
from typing import Annotated, Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from dependencies import get_supabase_user_id, verify_staff_for_restaurant
from services import menu_extract
from services import menu_replace

router = APIRouter()
logger = logging.getLogger(__name__)


class MenuReplaceBody(BaseModel):
    restaurant_id: str
    menu: Dict[str, Any] = Field(..., description="Full menu JSON (same shape as /menu/extract)")


@router.post("/menu/extract")
async def menu_extract_endpoint(
    user_id: Annotated[str, Depends(get_supabase_user_id)],
    file: UploadFile = File(...),
    restaurant_id: str = Form(...),
    restaurant_name: Optional[str] = Form(None),
) -> dict:
    started = time.perf_counter()
    await verify_staff_for_restaurant(user_id, restaurant_id)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Expected a PDF file")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    name_override = (restaurant_name or "").strip() or None

    try:
        result = await asyncio.to_thread(
            menu_extract.extract_menu_from_pdf_bytes,
            raw,
            restaurant_name_override=name_override,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    elapsed_ms = (time.perf_counter() - started) * 1000
    meta = result.get("_meta") if isinstance(result, dict) else None
    total_pages = meta.get("total_pages_in_pdf") if isinstance(meta, dict) else None
    processed_pages = meta.get("processed_pages") if isinstance(meta, dict) else None
    skipped_cap = meta.get("skipped_pages_due_to_cap") if isinstance(meta, dict) else None
    parse_failed = meta.get("parse_failed_pages") if isinstance(meta, dict) else None
    logger.info(
        "POST /v1/menu/extract completed in %.1fms (restaurant_id=%s, filename=%s, bytes=%s, pdf_pages=%s, processed_pages=%s, skipped_cap=%s, parse_failed=%s)",
        elapsed_ms,
        restaurant_id,
        file.filename or "<unknown>",
        len(raw),
        total_pages,
        processed_pages,
        skipped_cap,
        parse_failed,
    )
    return result


@router.post("/menu/replace")
async def menu_replace_endpoint(
    user_id: Annotated[str, Depends(get_supabase_user_id)],
    body: MenuReplaceBody,
) -> dict:
    await verify_staff_for_restaurant(user_id, body.restaurant_id)
    try:
        await menu_replace.replace_menu_for_restaurant(
            body.restaurant_id,
            body.menu,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"ok": True}
