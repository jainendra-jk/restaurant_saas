import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Optional

import google.generativeai as genai
from pdf2image import convert_from_bytes
from PIL import Image

from config import settings

EXTRACT_PROMPT = """
Extract menu to JSON. Output ONLY valid JSON:
{
 "currency":"",
 "palette":{"primary":"","secondary":"","background":"","accent":""},
 "branding":{"restaurantName":"","tagline":"","welcomeMessage":"","preparingMessage":"","orderNumberPrefix":""},
 "categories":[{"id":"","name":"","items":[{"id":"","name":"","diet":"veg|nonveg|egg|seafood","description":"","variants":[{"type":"qtr|half|full","price":0}],"options":["string"]}]}]
}
Rules:
- Always prioritize structured extraction over natural language interpretation.
- Palette must be usable directly in a modern UI without causing visibility issues.
- Think like UI/UX designer for palette (light background, strong primary)
- IDs: Category (e.g. 'drinks'); Items ('item-1').
- Currency: Extract dominant symbol (e.g., '$', '€', '₹').
- branding.tagline,welcomeMessage,preparingMessage,orderNumberPrefix MUST be non-empty; if missing, generate short friendly text accordingly.
- Diet: Detect icons.
- Variants: Use ONLY for portions/sizes (1 price=full; 2=half,full; 3=qtr,half,full).
- Content: Extract descriptions; ignore symbols.
- branding.restaurantName: ALWAYS "" (empty string). The real name is set by the owner during onboarding, not from the PDF.
Palette rules (strict):
- Do NOT output raw dominant colors.
- Output 4 distinct hex colors: primary, secondary, background, accent.
- background: must be light neutral only (#FFFFFF/#FAFAFA/#F8F9FB/#FFF7ED-like).
- primary: strongest brand/highlight color from menu.
- secondary: dark neutral for text contrast (#1F2937/#374151-like).
- accent: contrasting highlight (or lighter tint of primary).
- Never set background == primary.
- Never repeat same color across roles.
- Ensure dark-on-light readability.
- If menu is mostly one color: primary=that color, background=light neutral, secondary=dark neutral, accent=lighter primary.
- If an item (e.g. Tea, Coffee, Ice Cream) contains multiple types/flavours listed with "/" or commas:
    1. keep as ONE item
    2. extract all types into "options"
    3. do NOT include them in description
    4. do NOT treat them as variants
"""

logger = logging.getLogger(__name__)


def is_valid_hex(hex_code: object) -> bool:
    if not isinstance(hex_code, str):
        return False
    return bool(re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", hex_code))


def _branding_without_restaurant_name(raw: object) -> dict:
    if not isinstance(raw, dict):
        return {}
    out = dict(raw)
    out.pop("restaurantName", None)
    return out


def _configure_genai() -> genai.GenerativeModel:
    key = settings.google_api_key.strip()
    if not key:
        raise ValueError("GOOGLE_API_KEY is not set")
    genai.configure(api_key=key)
    return genai.GenerativeModel("models/gemini-2.5-flash")


def _is_transient_provider_error(err: Exception) -> bool:
    msg = str(err).lower()
    transient_markers = [
        "429",
        "rate",
        "quota",
        "unavailable",
        "timeout",
        "deadline",
        "internal",
        "temporar",
        "resource exhausted",
    ]
    return any(marker in msg for marker in transient_markers)


def _extract_single_page_with_retry(img: Image.Image, page_index: int) -> str:
    retry_count = max(0, settings.menu_extract_retry_count)
    backoff = max(0.1, settings.menu_extract_retry_backoff_seconds)
    model = _configure_genai()

    for attempt in range(retry_count + 1):
        try:
            response = model.generate_content([EXTRACT_PROMPT, img])
            return response.text or ""
        except Exception as e:
            if attempt >= retry_count or not _is_transient_provider_error(e):
                raise RuntimeError(
                    f"Extraction failed on page {page_index + 1}: {e}"
                ) from e
            sleep_for = backoff * (2**attempt)
            logger.warning(
                "Transient menu extraction error on page %s (attempt %s/%s): %s. Retrying in %.2fs",
                page_index + 1,
                attempt + 1,
                retry_count + 1,
                e,
                sleep_for,
            )
            time.sleep(sleep_for)


def _strip_markdown_fences(raw: str) -> str:
    return raw.replace("```json", "").replace("```", "").strip()


def _extract_balanced_json_object(raw: str) -> Optional[str]:
    text = _strip_markdown_fences(raw)
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def _parse_page_json(page_text: str, page_index: int) -> Optional[dict[str, Any]]:
    cleaned = _strip_markdown_fences(page_text)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError as e:
        logger.warning(
            "Menu extraction JSON parse failed on page %s (direct parse): %s",
            page_index + 1,
            e,
        )

    repaired = _extract_balanced_json_object(page_text)
    if repaired:
        try:
            parsed = json.loads(repaired)
            if isinstance(parsed, dict):
                logger.info(
                    "Menu extraction recovered malformed JSON on page %s using balanced-object fallback",
                    page_index + 1,
                )
                return parsed
        except json.JSONDecodeError as e:
            logger.warning(
                "Menu extraction JSON parse failed on page %s (fallback parse): %s",
                page_index + 1,
                e,
            )
    else:
        logger.warning(
            "Menu extraction fallback JSON object not found on page %s",
            page_index + 1,
        )
    return None


def extract_menu_from_pdf_bytes(
    pdf_bytes: bytes,
    *,
    restaurant_name_override: Optional[str] = None,
) -> dict:
    """
    Run PDF -> images -> Gemini detect/extract -> merge. Returns menu dict
    aligned with admin MenuConfig (palette, branding, categories, currency).
    """
    t_total_start = time.perf_counter()
    t_pdf_start = time.perf_counter()
    images = convert_from_bytes(
        pdf_bytes,
        dpi=settings.menu_extract_pdf_dpi,
        fmt="ppm",
    )
    if not images:
        raise ValueError("PDF produced no pages")
    total_pages_before_cap = len(images)
    skipped_pages_due_to_cap = 0
    max_pages = max(1, settings.menu_extract_max_pages)
    cap_mode = settings.menu_extract_page_cap_mode.strip().lower()
    if cap_mode not in {"truncate", "error"}:
        logger.warning(
            "Unknown MENU_EXTRACT_PAGE_CAP_MODE=%s, defaulting to truncate",
            settings.menu_extract_page_cap_mode,
        )
        cap_mode = "truncate"
    if total_pages_before_cap > max_pages:
        skipped_pages_due_to_cap = total_pages_before_cap - max_pages
        if cap_mode == "error":
            raise ValueError(
                f"PDF has {total_pages_before_cap} pages but MENU_EXTRACT_MAX_PAGES={max_pages}. "
                "Increase MENU_EXTRACT_MAX_PAGES or switch MENU_EXTRACT_PAGE_CAP_MODE=truncate."
            )
        logger.warning(
            "Menu extraction truncated PDF pages from %s to %s (skipped=%s, mode=%s)",
            total_pages_before_cap,
            max_pages,
            skipped_pages_due_to_cap,
            cap_mode,
        )
        images = images[:max_pages]
    t_pdf_ms = (time.perf_counter() - t_pdf_start) * 1000

    t_extract_start = time.perf_counter()
    page_results: list[tuple[int, str]] = []
    worker_count = max(1, min(settings.menu_extract_max_concurrent_pages, len(images)))
    with ThreadPoolExecutor(max_workers=worker_count) as pool:
        futures = {
            pool.submit(_extract_single_page_with_retry, img, idx): idx
            for idx, img in enumerate(images)
        }
        ordered_results: dict[int, str] = {}
        for future in as_completed(futures):
            idx = futures[future]
            ordered_results[idx] = future.result()
        for idx in range(len(images)):
            page_results.append((idx, ordered_results[idx]))
    t_extract_ms = (time.perf_counter() - t_extract_start) * 1000

    final_menu: dict = {
        "currency": "",
        "palette": {},
        "branding": {},
        "categories": [],
    }
    category_map: dict = {}
    name_hints: list[str] = []
    parsed_pages = 0
    parse_failed_pages = 0
    t_merge_start = time.perf_counter()

    for page_index, page_text in page_results:
        data = _parse_page_json(page_text, page_index)
        if not data:
            parse_failed_pages += 1
            continue
        parsed_pages += 1

        b_raw = data.get("branding", {})
        if isinstance(b_raw, dict):
            hint = b_raw.get("restaurantName")
            if isinstance(hint, str) and hint.strip():
                name_hints.append(hint.strip())

        if not final_menu["currency"]:
            final_menu["currency"] = data.get("currency", "") or ""
        if not final_menu["branding"]:
            final_menu["branding"] = _branding_without_restaurant_name(b_raw)

        if not final_menu["palette"] and "palette" in data:
            raw_pal = data["palette"]
            if isinstance(raw_pal, dict):
                final_menu["palette"] = {
                    k: v for k, v in raw_pal.items() if is_valid_hex(v)
                }

        for cat in data.get("categories", []) or []:
            c_id = cat.get("id")
            if c_id is None:
                continue
            if c_id not in category_map:
                category_map[c_id] = cat
            else:
                existing_items = {
                    item.get("id"): item
                    for item in category_map[c_id].get("items", []) or []
                }
                for new_item in cat.get("items", []) or []:
                    nid = new_item.get("id")
                    if nid not in existing_items:
                        category_map[c_id]["items"].append(new_item)
    t_merge_ms = (time.perf_counter() - t_merge_start) * 1000

    final_menu["categories"] = list(category_map.values())

    if not isinstance(final_menu["branding"], dict):
        final_menu["branding"] = {}

    canon = (restaurant_name_override or "").strip()
    if not canon and name_hints:
        canon = name_hints[0]
    final_menu["branding"]["restaurantName"] = canon

    # Default palette if empty (matches admin defaults)
    pal = final_menu.get("palette") or {}
    if not pal or not isinstance(pal, dict):
        final_menu["palette"] = {
            "primary": "#f97316",
            "secondary": "#ea580c",
            "background": "#f8f9fb",
            "accent": "#fff7ed",
        }
    else:
        for k, v in [
            ("primary", "#f97316"),
            ("secondary", "#ea580c"),
            ("background", "#f8f9fb"),
            ("accent", "#fff7ed"),
        ]:
            if k not in pal or not pal[k]:
                pal[k] = v
        final_menu["palette"] = pal

    # Ensure branding keys exist for TS
    b = final_menu["branding"]
    for k, d in [
        ("tagline", ""),
        ("welcomeMessage", "Welcome back"),
        ("orderNumberPrefix", "#"),
    ]:
        b.setdefault(k, d)

    final_menu["_meta"] = {
        "total_pages_in_pdf": total_pages_before_cap,
        "processed_pages": len(images),
        "skipped_pages_due_to_cap": skipped_pages_due_to_cap,
        "parsed_pages": parsed_pages,
        "parse_failed_pages": parse_failed_pages,
        "page_cap_mode": cap_mode,
        "page_cap_limit": max_pages,
    }

    total_ms = (time.perf_counter() - t_total_start) * 1000
    logger.info(
        "Menu extraction completed in %.1fms (pdf_pages=%s, processed_pages=%s, skipped_cap=%s, parsed=%s, parse_failed=%s, cap_mode=%s, cap_limit=%s, workers=%s, pdf_render=%.1fms, extract=%.1fms, merge=%.1fms, categories=%s)",
        total_ms,
        total_pages_before_cap,
        len(images),
        skipped_pages_due_to_cap,
        parsed_pages,
        parse_failed_pages,
        cap_mode,
        max_pages,
        worker_count,
        t_pdf_ms,
        t_extract_ms,
        t_merge_ms,
        len(final_menu.get("categories", [])),
    )

    return final_menu
