import json
import re
import time
from typing import Optional

import google.generativeai as genai
from pdf2image import convert_from_bytes
from PIL import Image

from config import settings

DETECT_PROMPT = """
Does this page contain restaurant menu items with prices?
Respond ONLY with: YES or NO
Ignore: cover pages, food photos, advertisements, decorative pages.
"""

EXTRACT_PROMPT = """
Extract menu to JSON. Output ONLY valid JSON:
{
 "currency":"",
 "palette":{"primary":"","secondary":"","background":"","accent":""},
 "branding":{"restaurantName":"","tagline":"","welcomeMessage":"","preparingMessage":"","orderNumberPrefix":""},
 "categories":[{"id":"","name":"","items":[{"id":"","name":"","diet":"veg|nonveg|egg|seafood","description":"","variants":[{"type":"qtr|half|full","price":0}],"options":["string"]}]}]
}
Rules:
- IDs: Category (e.g. 'drinks'); Items ('item-1').
- Currency: Extract dominant symbol (e.g., '$', '€', '₹').
- Palette: Extract dominant hex colors.
- Diet: Detect icons.
- Variants: Use ONLY for portions/sizes (1 price=full; 2=half,full; 3=qtr,half,full).
- Content: Extract descriptions; ignore symbols.
- branding.restaurantName: ALWAYS "" (empty string). The real name is set by the owner during onboarding, not from the PDF.
"""


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


def extract_menu_from_pdf_bytes(
    pdf_bytes: bytes,
    *,
    restaurant_name_override: Optional[str] = None,
) -> dict:
    """
    Run PDF -> images -> Gemini detect/extract -> merge. Returns menu dict
    aligned with admin MenuConfig (palette, branding, categories, currency).
    """
    model = _configure_genai()
    images = convert_from_bytes(pdf_bytes, fmt="pdf")
    if not images:
        raise ValueError("PDF produced no pages")

    valid_pages: list[tuple[int, Image.Image]] = []
    for i, img in enumerate(images):
        response = model.generate_content([DETECT_PROMPT, img])
        text = (response.text or "").strip().upper()
        if "YES" in text:
            valid_pages.append((i, img))

    if not valid_pages:
        raise ValueError("No menu-like pages detected in PDF")

    page_results: list[str] = []
    for idx, img in valid_pages:
        try:
            response = model.generate_content([EXTRACT_PROMPT, img])
            page_results.append(response.text or "")
            time.sleep(2)
        except Exception as e:
            raise RuntimeError(f"Extraction failed on page {idx + 1}: {e}") from e

    final_menu: dict = {
        "currency": "",
        "palette": {},
        "branding": {},
        "categories": [],
    }
    category_map: dict = {}
    name_hints: list[str] = []

    for r in page_results:
        try:
            json_str = r.replace("```json", "").replace("```", "").strip()
            data = json.loads(json_str)

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
        except json.JSONDecodeError:
            continue

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

    return final_menu
