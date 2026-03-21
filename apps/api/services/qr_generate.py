import base64
import io
import re

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
    table_count: int,
) -> dict:
    base = origin.rstrip("/")
    if table_count < 1:
        raise ValueError("table_count must be at least 1")

    tables: list[dict] = []
    for table in range(1, table_count + 1):
        url = f"{base}/order/{restaurant_slug}/table/{table}"
        tables.append(
            {
                "table_number": table,
                "url": url,
                "png_base64": qr_png_base64(url),
            }
        )

    return {
        "restaurant_name": restaurant_name,
        "restaurant_slug": restaurant_slug,
        "tables": tables,
    }
