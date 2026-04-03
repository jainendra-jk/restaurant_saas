# How the restaurant SaaS application works

This document describes the **end-to-end flow** of the monorepo: onboarding, admin dashboard, customer ordering, QR generation, and how **Supabase** and **`apps/api`** fit in.

## High-level architecture

| Component | Path | Purpose |
|-----------|------|---------|
| **Onboarding** | `apps/onboarding_flow` | Sign-up wizard: creates auth user, restaurant, staff link, tables; optional menu import + QR codes via API |
| **Admin dashboard** | `apps/admin_dashboard` | Staff login, manage menu/tables/orders/settings, generate or refresh QR codes via API |
| **Customer app** | `apps/customer_app` | Public menu and ordering at URLs embedded in QR codes |
| **Backend API** | `apps/api` (FastAPI) | Authenticated endpoints: menu PDF extraction, QR PNG generation (uses **service role** for Supabase reads) |
| **Supabase** | Cloud project | **Auth** (`auth.users`) + **Postgres** (`restaurants`, `staff_profiles`, `tables`, menu, orders, …) + **RLS** for multi-tenant access |

All three frontends that use Supabase must point at the **same project** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`). The API uses **`SUPABASE_URL`** / **`SUPABASE_SERVICE_ROLE_KEY`** (see `.env.example`).

---

## Data model (conceptual)

- **`auth.users`** — managed by Supabase Auth; login email/password live here.
- **`restaurants`** — one row per restaurant (slug, name, branding, `customer_app_origin`, …).
- **`staff_profiles`** — links `user_id` (auth) → `restaurant_id` + role (e.g. owner). Admin loads “my restaurant” through this table.
- **`tables`** — per-table rows (`number`, `restaurant_id`, optional `order_url`, `qr_png_base64`, …).
- **Menu** — categories/items tied to `restaurant_id`.
- **Orders** — created from the customer app; staff see them in admin when RLS allows.

Row Level Security (RLS) policies (see `supabase/migrations/20240321000001_rls_and_storage.sql`) ensure staff only access rows for restaurants they belong to, while the customer app uses policies that allow public menu reads and order placement as designed.

---

## 1. Onboarding flow

### User experience

1. **Restaurant details** — name, owner, phone, **email** (used for Auth), address, GST/FSSAI, etc.
2. **Menu upload** — optional PDF (used only if the API is available on confirm).
3. **Dashboard setup** — table count, username (UX label; **sign-in uses email**), password, domain (customer app base URL for QR links).
4. **Review** → **Confirm** — writes to Supabase and optionally calls the API.

### What happens on Confirm

Implementation: `apps/onboarding_flow/src/app/utils/persistOnboarding.ts` and `OnboardingFlow.tsx`.

1. **`supabase.auth.signUp({ email, password })`**  
   Creates the user under **Authentication → Users** when successful.

2. **Insert `restaurants`** — slug derived from name, branding JSON, `customer_app_origin` from the domain field.

3. **Insert `staff_profiles`** — `user_id` + `restaurant_id`.  
   **Requires a valid session** for `auth.uid()` in RLS. If **email confirmation** is required and no session is returned, this step can fail while the user still appears in Auth (or partially created rows). For local dev, disabling “Confirm email” in Supabase avoids this.

4. **Insert `tables`** — one row per table for that `restaurant_id`.

5. **Optional API steps** (needs session + `VITE_API_BASE_URL` + running API):  
   - **Menu:** `extractMenuFromPdf` → `replaceMenuFromExtract` (via `@restaurant-saas/api-client`).  
   - **QR:** `generateTableQr` → `POST /v1/qr/generate` with Bearer JWT; response updates `tables.order_url` and `tables.qr_png_base64`.

6. **Welcome PDF** (if enabled in code) — downloads a pack with credentials + QR images while they still exist only in the browser.

7. **Success screen** — “Go to Dashboard” uses **`VITE_ADMIN_DASHBOARD_ORIGIN`**.

### Environment note (onboarding)

Vite loads `.env` from the **app directory** unless `envDir` is set. The **admin** app is configured to load from the **monorepo root** (`apps/admin_dashboard/vite.config.ts`). If your only `.env` is at the repo root, **onboarding may not see `VITE_SUPABASE_*`** unless you duplicate env or align `envDir`. Without those variables, `signUp` never runs against your project → **empty Authentication → Users**.

---

## 2. Admin dashboard

### Routing

`apps/admin_dashboard/src/app/routes.tsx`:

- **`/login`** — email + password → `supabase.auth.signInWithPassword`.
- **`/`**, **`/orders`**, **`/tables`**, **`/menu`**, **`/analytics`**, **`/settings`** — wrapped in **`RequireAuth`** (redirect to login if no session).

### After login

- Session provides a **JWT** on each Supabase request.
- **`staff_profiles`** is queried for `user_id = auth.uid()` to get `restaurant_id`.
- **`restaurants`** (and related tables) are loaded for that tenant.

### QR generation in admin

`apps/admin_dashboard/src/app/components/QRCodeSlider.tsx` (and similar call sites) use `generateTableQr` from `@restaurant-saas/api-client`:

1. Browser sends **`POST {VITE_API_BASE_URL}/v1/qr/generate`** with **`Authorization: Bearer <access_token>`** and body `restaurant_id`, `table_count`, optional `origin`.
2. API validates the user is staff for that restaurant (`dependencies.py`), reads slug/name from **`restaurants`** with the **service role**, builds URLs:

   `{origin}/order/{restaurant_slug}/table/{n}`

3. Python **`qrcode`** library produces PNG → base64 in the JSON response (`apps/api/services/qr_generate.py`).
4. Admin can persist to **`tables`** or display/download.

**Required env:** `VITE_API_BASE_URL`, API’s `SUPABASE_SERVICE_ROLE_KEY`, and customer origin (`CUSTOMER_APP_ORIGIN` or passed `origin`).

---

## 3. Customer app and QR URLs

QR codes encode a URL on the **customer app** deployment, e.g.:

`https://<customer-host>/order/<restaurant-slug>/table/<table-number>`

Routes: `apps/customer_app/src/app/routes.tsx`

- `/order/:restaurantSlug/table/:tableNumber/...`
- `/r/:slug/t/:tableNum/...` (short form)

The app resolves restaurant/table (and menu) using Supabase **anon** key + RLS/public policies. Exact resolution logic lives in the customer app loaders/contexts.

---

## 4. Backend API (`apps/api`)

- **Auth:** Expects **`Authorization: Bearer <Supabase access JWT>`**; resolves `user_id` and checks **`staff_profiles`** for restaurant access.
- **QR:** `routers/qr.py` → `build_table_qr_payload`.
- **Menu:** `routers/menu.py` (e.g. PDF extract, persist menu) — server-side keys, never expose **service role** to the browser.

Run locally: `pnpm dev:api` (see root `package.json`).

---

## 5. Environment variables (summary)

| Variable | Used by | Role |
|----------|---------|------|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | onboarding, admin, customer | Browser Supabase client |
| `VITE_API_BASE_URL` | admin, onboarding | Calls FastAPI |
| `VITE_CUSTOMER_APP_ORIGIN` | admin (QR display), onboarding domain | Base URL in QR links |
| `VITE_ADMIN_DASHBOARD_ORIGIN` | onboarding success link | Redirect after signup |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CUSTOMER_APP_ORIGIN` | `apps/api` | Server-side Supabase + default QR origin |

Full template: `.env.example`.

**Local Vite ports** (so each app has a distinct URL): admin **5174**, customer **5175**, onboarding **5176** (`strictPort: true` in each app’s `vite.config.ts`). Point `VITE_CUSTOMER_APP_ORIGIN` at the customer URL and `VITE_ADMIN_DASHBOARD_ORIGIN` at the admin URL in root `.env`.

---

## 6. Supabase migrations

Apply SQL files under `supabase/migrations/` **in filename order** to your project. They create tables, RLS, storage, and later columns (e.g. `customer_app_origin`, `order_url`, `qr_png_base64`).

---

## 7. Common issues (quick reference)

| Symptom | Likely cause |
|---------|----------------|
| **Authentication → Users** empty | Onboarding not loading Supabase env; or wrong project URL |
| **Invalid credentials** (admin) | No user in that project; wrong email/password; email not confirmed |
| **User in Auth, no `staff_profiles`** | Sign-up without session + RLS on `staff_profiles` insert |
| **QR / menu API fails** | API not running; missing `VITE_API_BASE_URL`; missing service role on API |
| **QR link 404 on customer app** | `VITE_CUSTOMER_APP_ORIGIN` doesn’t match deployed customer app; SPA rewrites |

---

## 8. Related docs

- **[README.md](../README.md)** — run scripts, build, deploy, troubleshooting (e.g. Vite / `motion`).
- **`.env.example`** — variable list for API and Vite apps.

This file is the canonical **narrative** description of how the apps behave in this repository.
