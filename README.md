# Restaurant SaaS

Multi-tenant restaurant management: onboarding, admin dashboard, and customer ordering app (QR menu).

## Apps

| App | Path | Purpose |
|-----|------|---------|
| Admin Dashboard | `apps/admin_dashboard` | Staff: orders, tables, menu, analytics, settings |
| Customer App | `apps/customer_app` | Diners: browse menu, cart, checkout (via QR) |
| Onboarding Flow | `apps/onboarding_flow` | New restaurant signup wizard |

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

## Running locally

```bash
# Install all dependencies
pnpm install

# Run all apps in parallel
pnpm dev

# Or run individually
pnpm dev:admin      # Admin dashboard (tablet/desktop)
pnpm dev:customer   # Customer app (mobile-first)
pnpm dev:onboard    # Onboarding flow
pnpm dev:api        # FastAPI (apps/api) — menu PDF + QR endpoints
```

## Environment variables

Create `.env.local` in each app directory (or root) as needed. **Never commit secrets.**

| Variable | App(s) | Description |
|----------|--------|-------------|
| `VITE_SUPABASE_URL` | admin, customer, onboarding | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | admin, customer, onboarding | Supabase anon/public key |
| `VITE_CUSTOMER_APP_ORIGIN` | admin | Base URL for QR links (e.g. `https://order.example.com`) |
| `VITE_API_BASE_URL` | admin | Base URL for `apps/api` (e.g. `http://localhost:8000`) |
| `GOOGLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CUSTOMER_APP_ORIGIN` | apps/api | Server-side only; see `.env.example` |

**Supabase RLS note:** the customer app reads `restaurants` with the anon key; migration `20240321000003_public_restaurant_select.sql` allows public `SELECT` on `restaurants`, so anyone with the anon key can list restaurant rows—treat the QR URL/slug as the access boundary, or replace with a `SECURITY DEFINER` RPC later for stricter isolation.

## Build

```bash
pnpm build           # Build all apps
pnpm build:admin     # Admin only
pnpm build:customer  # Customer only
pnpm build:onboard   # Onboarding only
```

Output: `apps/<name>/dist/`

## CI

On push and pull requests to `main` or `master`, [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `pnpm install --frozen-lockfile` and `pnpm build`.

## Verification checklist (local / staging)

Use this before calling the stack “done” or after changing Supabase or env:

- [ ] **Migrations:** Apply SQL in `supabase/migrations/` to your Supabase project in filename order (`00000` → `00003`).
- [ ] **Env:** Each app that talks to Supabase has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; admin has `VITE_CUSTOMER_APP_ORIGIN`; onboarding has `VITE_ADMIN_DASHBOARD_ORIGIN` if you redirect after signup.
- [ ] **Onboarding → admin:** Complete signup, sign in to the admin dashboard, confirm your restaurant and tables exist.
- [ ] **Customer / QR:** Open `/order/{restaurant-slug}/table/{n}` (or `/r/{slug}/t/{n}`), confirm menu loads from the DB when configured; place an order and see `orders` / `order_items` in Supabase or in admin live orders.
- [ ] **Build:** `pnpm build` passes locally (same as CI).

**Next hardening (when you go wider than a pilot):** tighten open RLS (e.g. who may `INSERT` into `restaurants`), handle Supabase email confirmation vs immediate inserts after onboarding, and consider a slug-scoped RPC instead of public `SELECT` on `restaurants` if you need stricter isolation.

## Deploy

Each app has `vercel.json` and `netlify.toml`. Deploy as 3 separate projects:

| App | Root Directory | Notes |
|-----|----------------|-------|
| Admin | `apps/admin_dashboard` | Set `VITE_SUPABASE_*`, `VITE_CUSTOMER_APP_ORIGIN` |
| Customer | `apps/customer_app` | Set `VITE_SUPABASE_*` |
| Onboarding | `apps/onboarding_flow` | Set `VITE_SUPABASE_*`, `VITE_ADMIN_DASHBOARD_ORIGIN` |

Add production URLs to Supabase Auth redirect allowlist.

## Deployment

**Customer app (SPA):** QR URLs use paths like `/order/{restaurant-slug}/table/{n}`. Ensure your host serves `index.html` for these deep links. Example configs:

- **Netlify:** `apps/customer_app/public/_redirects` is bundled into `dist/` and handles this.
- **Vercel:** Add to `vercel.json`: `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]` for the customer app.

## Pushing to GitHub

1. Create an empty repository on GitHub.
2. Add remote and push:
   ```bash
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git branch -M main
   git add -A && git commit -m "Initial commit"
   git push -u origin main
   ```

## Project structure

```
apps/
  admin_dashboard/   # Staff dashboard
  api/               # FastAPI: /v1/menu/extract, /v1/qr/generate
  customer_app/      # QR menu / ordering
  onboarding_flow/   # Restaurant signup
  ai_service.py      # PDF→menu JSON (Colab; not deployed)
packages/
  api-client/        # Shared fetch helpers for apps/api
supabase/
  migrations/        # SQL migrations
```
