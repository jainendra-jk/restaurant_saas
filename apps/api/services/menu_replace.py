"""
Replace all menu_categories + menu_items for a restaurant from extract JSON (same shape as /menu/extract).
Uses Supabase REST with service role.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, List, Tuple

import httpx

from config import settings

DIETS = frozenset({"veg", "nonveg", "egg", "seafood"})
VARIANT_TYPES = frozenset({"qtr", "half", "full"})


def _supabase_headers() -> dict:
    key = settings.supabase_service_role_key.strip()
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def normalize_menu_payload(raw: object) -> dict:
    """Validate and normalize extract JSON; raises ValueError on invalid."""
    if not raw or not isinstance(raw, dict):
        raise ValueError("Invalid menu payload")
    o = raw
    cats_raw = o.get("categories")
    if not isinstance(cats_raw, list) or len(cats_raw) == 0:
        raise ValueError("No categories in menu payload")

    categories: List[dict] = []
    for c in cats_raw:
        if not c or not isinstance(c, dict):
            continue
        cid = str(c.get("id") or "").strip()
        name = str(c.get("name") or "").strip()
        if not cid or not name:
            continue
        items_raw = c.get("items")
        if not isinstance(items_raw, list):
            continue
        items: List[dict] = []
        for it in items_raw:
            if not it or not isinstance(it, dict):
                continue
            item_id = str(it.get("id") or "").strip()
            item_name = str(it.get("name") or "").strip()
            if not item_id or not item_name:
                continue
            diet_raw = str(it.get("diet") or "veg").lower()
            diet = diet_raw if diet_raw in DIETS else "veg"
            options = it.get("options")
            opt_list: List[str] = []
            if isinstance(options, list):
                opt_list = [str(x) for x in options if isinstance(x, str)]
            variants_raw = it.get("variants")
            variants: List[dict] = []
            if isinstance(variants_raw, list):
                for v in variants_raw:
                    if not v or not isinstance(v, dict):
                        continue
                    t = str(v.get("type") or "full").lower()
                    if t not in VARIANT_TYPES:
                        continue
                    price = v.get("price")
                    try:
                        p = float(price)
                    except (TypeError, ValueError):
                        continue
                    if not (p == p):  # NaN
                        continue
                    variants.append({"type": t, "price": p})
            if not variants:
                variants.append({"type": "full", "price": 0.0})
            items.append(
                {
                    "slug": _slug_fragment(item_id),
                    "name": item_name,
                    "diet": diet,
                    "description": str(it.get("description") or ""),
                    "options": opt_list,
                    "variants": variants,
                }
            )
        if items:
            categories.append(
                {
                    "slug": _slug_fragment(cid),
                    "name": name,
                    "items": items,
                }
            )

    if not categories:
        raise ValueError("No valid menu items in payload")
    out: dict = {"categories": categories}
    cur = o.get("currency")
    if isinstance(cur, str) and cur.strip():
        out["currency"] = cur.strip()
    raw_palette = o.get("palette")
    if isinstance(raw_palette, dict):
        palette: dict[str, str] = {}
        for key in ("primary", "secondary", "background", "accent"):
            value = raw_palette.get(key)
            if isinstance(value, str) and value.strip():
                palette[key] = value.strip()
        if palette:
            out["palette"] = palette
    raw_branding = o.get("branding")
    if isinstance(raw_branding, dict):
        branding: dict[str, str] = {}
        for key in (
            "restaurantName",
            "tagline",
            "welcomeMessage",
            "preparingMessage",
            "orderNumberPrefix",
        ):
            value = raw_branding.get(key)
            if isinstance(value, str):
                branding[key] = value
        if branding:
            out["branding"] = branding
    return out


def _slug_fragment(s: str) -> str:
    x = s.strip().lower()
    x = re.sub(r"[^\w\s-]", "", x)
    x = re.sub(r"[\s_]+", "-", x)
    x = re.sub(r"-+", "-", x).strip("-")
    return x or "item"


def _find_duplicate_slugs(normalized_menu: dict) -> Tuple[str | None, str | None]:
    """Return (duplicate_category_slug, duplicate_item_slug_with_category)."""
    categories = normalized_menu.get("categories") or []
    cat_seen: set[str] = set()
    for cat in categories:
        slug = str(cat.get("slug") or "").strip()
        if not slug:
            continue
        if slug in cat_seen:
            return slug, None
        cat_seen.add(slug)

    for cat in categories:
        cat_slug = str(cat.get("slug") or "").strip()
        item_seen: set[str] = set()
        for it in cat.get("items") or []:
            item_slug = str(it.get("slug") or "").strip()
            if not item_slug:
                continue
            if item_slug in item_seen:
                return None, f"{cat_slug}:{item_slug}"
            item_seen.add(item_slug)
    return None, None


def _supabase_error_text(resp: httpx.Response) -> str:
    try:
        body = resp.json()
    except ValueError:
        text = resp.text.strip()
        return text or f"status={resp.status_code}"
    if isinstance(body, dict):
        message = str(body.get("message") or "").strip()
        details = str(body.get("details") or "").strip()
        hint = str(body.get("hint") or "").strip()
        parts = [p for p in (message, details, hint) if p]
        if parts:
            return " | ".join(parts)
    return str(body)


def _ensure_supabase_success(resp: httpx.Response, operation: str, ok_codes: tuple[int, ...]) -> None:
    if resp.status_code not in ok_codes:
        raise RuntimeError(f"{operation} failed ({resp.status_code}): {_supabase_error_text(resp)}")


async def replace_menu_for_restaurant(restaurant_id: str, menu_payload: dict) -> None:
    try:
        uuid.UUID(restaurant_id)
    except ValueError as e:
        raise ValueError("Invalid restaurant_id") from e

    base = settings.supabase_base().rstrip("/")
    key = settings.supabase_service_role_key.strip()
    if not base or not key:
        raise RuntimeError("Supabase is not configured on the API server")

    normalized = normalize_menu_payload(menu_payload)
    dup_cat, dup_item = _find_duplicate_slugs(normalized)
    if dup_cat:
        raise ValueError(f"Duplicate category slug in payload: {dup_cat}")
    if dup_item:
        raise ValueError(f"Duplicate item slug in payload: {dup_item}")

    headers = _supabase_headers()

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Full replacement semantics: remove existing categories (items cascade-delete), then insert current menu.
            del_categories = await client.delete(
                f"{base}/rest/v1/menu_categories",
                headers={**headers, "Prefer": "return=minimal"},
                params={"restaurant_id": f"eq.{restaurant_id}"},
            )
            _ensure_supabase_success(del_categories, "Delete existing menu categories", (200, 204))

            category_rows: list[dict[str, Any]] = []
            for idx, cat in enumerate(normalized["categories"]):
                category_rows.append(
                    {
                        "restaurant_id": restaurant_id,
                        "slug": cat["slug"],
                        "name": cat["name"],
                        "sort_order": idx,
                    }
                )

            create_categories = await client.post(
                f"{base}/rest/v1/menu_categories",
                headers={**headers, "Prefer": "return=representation"},
                json=category_rows,
            )
            _ensure_supabase_success(create_categories, "Insert menu categories", (200, 201))

            created_categories = create_categories.json()
            if not isinstance(created_categories, list) or not created_categories:
                raise RuntimeError("Insert menu categories failed: empty response")

            category_id_by_slug: dict[str, str] = {}
            for row in created_categories:
                if not isinstance(row, dict):
                    continue
                slug = str(row.get("slug") or "").strip()
                cat_id = str(row.get("id") or "").strip()
                if slug and cat_id:
                    category_id_by_slug[slug] = cat_id

            item_rows: list[dict[str, Any]] = []
            for cat in normalized["categories"]:
                cat_slug = cat["slug"]
                category_id = category_id_by_slug.get(cat_slug)
                if not category_id:
                    raise RuntimeError(f"Missing created category id for slug: {cat_slug}")
                for item_idx, it in enumerate(cat["items"]):
                    item_rows.append(
                        {
                            "category_id": category_id,
                            "slug": it["slug"],
                            "name": it["name"],
                            "diet": it["diet"],
                            "description": it["description"],
                            "variants": it["variants"],
                            "options": it["options"],
                            "is_available": True,
                            "sort_order": item_idx,
                        }
                    )

            create_items = await client.post(
                f"{base}/rest/v1/menu_items",
                headers={**headers, "Prefer": "return=minimal"},
                json=item_rows,
            )
            _ensure_supabase_success(create_items, "Insert menu items", (200, 201, 204))

            currency = normalized.get("currency")
            palette = normalized.get("palette")
            branding = normalized.get("branding")
            now_iso = datetime.now(timezone.utc).isoformat()
            restaurant_patch: dict[str, Any] = {
                "menu_import_completed_at": now_iso,
                "onboarding_completed_at": now_iso,
            }
            if isinstance(palette, dict) and palette:
                restaurant_patch["palette"] = palette
            if isinstance(currency, str) and currency.strip():
                restaurant_patch["currency"] = currency.strip()
            if isinstance(branding, dict) and branding:
                restaurant_patch["branding"] = branding

            update_restaurant = await client.patch(
                f"{base}/rest/v1/restaurants",
                headers={**headers, "Prefer": "return=minimal"},
                params={"id": f"eq.{restaurant_id}"},
                json=restaurant_patch,
            )
            _ensure_supabase_success(update_restaurant, "Update restaurant profile fields", (200, 204))
    except httpx.RequestError as e:
        raise RuntimeError(f"Supabase request failed: {e}") from e
