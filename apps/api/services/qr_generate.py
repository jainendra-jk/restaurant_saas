import base64
import io
import re
from typing import Iterable

import qrcode


def slugify_restaurant_name(name: str) -> str:
    if not name or not isinstance(name, str):
        raise ValueError("restaurant name must be a non-empty string")
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    s = s.strip("-")
    if not s:
        raise ValueError(f"restaurant name '{name}' yields empty slug after slugify")
    return s


def qr_png_base64(url: str) -> str:
    qr = qrcode.make(url)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def build_table_qr_payload(
    *,
    origin: str,
    restaurant_slug: str,
    restaurant_name: str,
    tables_data: Iterable[dict],
) -> dict:
    base = origin.rstrip("/")

    tables: list[dict] = []
    for row in tables_data:
        table_number = int(row["table_number"])
        qr_token = str(row["qr_token"]).strip()
        if not qr_token:
            raise ValueError(f"table {table_number} has empty qr_token")
        url = f"{base}/order/{restaurant_slug}/t/{qr_token}"
        tables.append(
            {
                "table_number": table_number,
                "url": url,
                "png_base64": qr_png_base64(url),
            }
        )

    return {
        "restaurant_name": restaurant_name,
        "restaurant_slug": restaurant_slug,
        "tables": tables,
    }
