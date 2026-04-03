# Restaurant SaaS API (FastAPI)

Run from repo root:

```bash
pnpm dev:api
# or: cd apps/api && pip install -r requirements.txt && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Configure `.env` at the **monorepo root** (see root `.env.example`): `GOOGLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL` or `SUPABASE_URL`, `CUSTOMER_APP_ORIGIN`.

Optional menu extraction tuning:
- `MENU_EXTRACT_MAX_CONCURRENT_PAGES` (default `3`)
- `MENU_EXTRACT_RETRY_COUNT` (default `2`)
- `MENU_EXTRACT_RETRY_BACKOFF_SECONDS` (default `0.75`)
- `MENU_EXTRACT_MAX_PAGES` (default `60`)
- `MENU_EXTRACT_PAGE_CAP_MODE` (default `truncate`, allowed: `truncate` or `error`)
- `MENU_EXTRACT_PDF_DPI` (default `150`)

Completeness vs speed:
- Increase `MENU_EXTRACT_MAX_PAGES` to avoid dropping pages on long menus.
- Use `MENU_EXTRACT_PAGE_CAP_MODE=error` if you prefer explicit failure instead of partial extraction.
- Keep `MENU_EXTRACT_PDF_DPI` near `150` for speed; raise to `180-200` for difficult scans.

**PDF → images:** `pdf2image` requires [Poppler](https://github.com/oschwartz10612/poppler-windows/releases/) on `PATH` (Windows) or `apt install poppler-utils` (Linux).

Endpoints:

- `GET /health`
- `POST /v1/menu/extract` — multipart: `file`, `restaurant_id`, optional `restaurant_name`; `Authorization: Bearer <access_token>`
- `POST /v1/menu/replace` — JSON: `restaurant_id`, `menu` (same shape as extract response); replaces all categories/items; `Authorization: Bearer <access_token>`
- `POST /v1/qr/generate` — JSON: `restaurant_id`, `table_count`, optional `origin`
