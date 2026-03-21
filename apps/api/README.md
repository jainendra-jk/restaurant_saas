# Restaurant SaaS API (FastAPI)

Run from repo root:

```bash
pnpm dev:api
# or: cd apps/api && pip install -r requirements.txt && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Configure `.env` at the **monorepo root** (see root `.env.example`): `GOOGLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL` or `SUPABASE_URL`, `CUSTOMER_APP_ORIGIN`.

**PDF → images:** `pdf2image` requires [Poppler](https://github.com/oschwartz10612/poppler-windows/releases/) on `PATH` (Windows) or `apt install poppler-utils` (Linux).

Endpoints:

- `GET /health`
- `POST /v1/menu/extract` — multipart: `file`, `restaurant_id`, optional `restaurant_name`; `Authorization: Bearer <access_token>`
- `POST /v1/qr/generate` — JSON: `restaurant_id`, `table_count`, optional `origin`
