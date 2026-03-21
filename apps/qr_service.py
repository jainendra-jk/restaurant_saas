# -*- coding: utf-8 -*-
"""Generate QR codes for restaurant table ordering.

URL format: {CUSTOMER_APP_ORIGIN}/order/{restaurant_slug}/table/{tableNumber}

Run locally: python apps/qr_service.py (requires .env with CUSTOMER_APP_ORIGIN, RESTAURANT_NAME, TABLE_COUNT)
For Colab: run pip install -r apps/requirements.txt first, then run this script.
"""

import json
import os
import re
from pathlib import Path

import qrcode
from dotenv import load_dotenv


def slugify_restaurant_name(name: str) -> str:
    """URL-safe slug: lowercase, spaces -> hyphens, strip non-alphanumeric except hyphen."""
    if not name or not isinstance(name, str):
        raise ValueError("restaurant name must be a non-empty string")
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    s = s.strip("-")
    if not s:
        raise ValueError(f"restaurant name '{name}' yields empty slug after slugify")
    return s


def _in_colab() -> bool:
    try:
        import google.colab  # noqa: F401
        return True
    except ImportError:
        return False


def main() -> None:
    # Load .env from project root
    try:
        _project_root = Path(__file__).resolve().parents[1]
    except NameError:
        _project_root = Path.cwd()
    load_dotenv(_project_root / ".env")

    origin = os.environ.get("CUSTOMER_APP_ORIGIN", "").strip()
    restaurant_name = os.environ.get("RESTAURANT_NAME", "").strip()
    table_count_str = os.environ.get("TABLE_COUNT", "10").strip()

    if not origin:
        raise ValueError("CUSTOMER_APP_ORIGIN is not set. Add it to .env (see .env.example).")
    if not restaurant_name:
        raise ValueError("RESTAURANT_NAME is not set. Add it to .env (see .env.example).")

    try:
        table_count = int(table_count_str)
    except ValueError:
        raise ValueError(f"TABLE_COUNT must be an integer, got: {table_count_str}")

    if table_count < 1:
        raise ValueError("TABLE_COUNT must be at least 1")

    slug = slugify_restaurant_name(restaurant_name)
    base = origin.rstrip("/")

    os.makedirs("table_qrs", exist_ok=True)
    tables = []

    for table in range(1, table_count + 1):
        url = f"{base}/order/{slug}/table/{table}"
        qr = qrcode.make(url)
        file_path = f"table_qrs/table_{table}.png"
        qr.save(file_path)

        tables.append({
            "table_number": table,
            "url": url,
        })

    result = {
        "restaurant_name": restaurant_name,
        "restaurant_slug": slug,
        "tables": tables,
    }

    print(json.dumps(result, indent=2))

    with open("tables.json", "w") as f:
        json.dump(result, f, indent=2)

    print("JSON file created: tables.json")
    print(f"QR images saved to table_qrs/ (table_1.png .. table_{table_count}.png)")

    if _in_colab():
        import subprocess
        subprocess.run(["zip", "-r", "table_qrs.zip", "table_qrs"], check=True)
        from google.colab import files
        files.download("tables.json")
        files.download("table_qrs.zip")
    else:
        print("Run locally: QR images and tables.json are ready in the current directory.")


if __name__ == "__main__":
    main()
