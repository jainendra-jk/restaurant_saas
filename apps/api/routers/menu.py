import asyncio
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from dependencies import get_supabase_user_id, verify_staff_for_restaurant
from services import menu_extract

router = APIRouter()


@router.post("/menu/extract")
async def menu_extract_endpoint(
    user_id: Annotated[str, Depends(get_supabase_user_id)],
    file: UploadFile = File(...),
    restaurant_id: str = Form(...),
    restaurant_name: Optional[str] = Form(None),
) -> dict:
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

    return result
