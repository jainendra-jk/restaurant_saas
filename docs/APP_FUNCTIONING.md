# How the restaurant SaaS application works

This document describes the **end-to-end flow** of the monorepo: onboarding, admin dashboard, customer ordering, QR generation, and how **Supabase** and **`apps/api`** fit in.

## High-level architecture

| Component | Path | Purpose |
|-----------|------|---------|
| **Onboarding** | `apps/onboarding_flow` | Sign-up wizard: creates auth user, restaurant, staff link, tables; optional menu import + QR codes via API |
| **Marketing site** | `apps/Website Design final` | Landing + **`/checkout`**: email/Google auth, then **Stripe** subscription checkout (Edge Function) |
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
- **`saas_entitlements`** — one row per **`auth.users`** who bought a SaaS plan (`plan_tier`, `max_tables`, `status`, Stripe ids; Razorpay columns reserved for a future integration). **RLS:** users can **read** their own row; **writes** only via Edge Functions (service role) and webhooks.
- **Menu** — categories/items tied to `restaurant_id`.
- **Orders** — created from the customer app; staff see them in admin when RLS allows.

Row Level Security (RLS) policies (see `supabase/migrations/20240321000001_rls_and_storage.sql`) ensure staff only access rows for restaurants they belong to, while the customer app uses policies that allow public menu reads and order placement as designed.

---

## 1. Onboarding flow

### User experience

**A. Paid funnel (after Stripe checkout)** — user lands on onboarding with **`?plan=starter`** or **`?plan=professional`**. The app checks **session + `saas_entitlements`** (active/trialing, matching `plan_tier`); otherwise redirects to **`VITE_WEBSITE_ORIGIN/checkout?plan=...`**. Email is prefilled and locked; **table count is fixed** (20 for Starter, 50 for Professional); **dashboard password step is skipped** (account already exists). On confirm, **`persistOnboardingToSupabase`** uses **`skipAuthSignup: true`** and does **not** call `signUp` again.

**B. Legacy / direct onboarding** — no `plan` query param: same steps as before.

1. **Restaurant details** — name, owner, phone, **email** (used for Auth), address, GST/FSSAI, etc.
2. **Menu upload** — optional PDF (used only if the API is available on confirm).
3. **Dashboard setup** — table count, password (legacy); customer app base URL comes from env (`VITE_CUSTOMER_APP_ORIGIN`).
4. **Review** → **Confirm** — writes to Supabase and optionally calls the API.

### What happens on Confirm

Implementation: `apps/onboarding_flow/src/app/utils/persistOnboarding.ts` and `OnboardingFlow.tsx`.

1. **Auth** — **Legacy:** **`supabase.auth.signUp({ email, password })`** creates the user. **Paid funnel:** existing session only; email must match the signed-in user.

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

Onboarding **`vite.config.ts`** sets **`envDir`** to the **monorepo root** (same idea as admin). Use **`VITE_WEBSITE_ORIGIN`** so paid-funnel redirects target the deployed marketing app (e.g. `http://localhost:5173` in dev).

---

## 1b. Marketing checkout and SaaS billing

SaaS subscription checkout is **Stripe-only** for now. The **`razorpay-webhook`** function remains in the repo for a possible future Razorpay path but is **not** used by **`create-billing-checkout`** or the marketing UI.

### Email confirmation and 6-digit OTP

When **Confirm email** is enabled in your Supabase project, new email-password signups require the user to verify inbox ownership before a session is issued. The checkout and legacy onboarding pages handle this with an **in-app 6-digit OTP step** (no redirect needed).

**Supabase dashboard setup (one-time, per project):**

1. **Authentication → Providers → Email** — keep email enabled; toggle **Confirm email** on for production; you may leave it off locally to skip OTP during development.
2. **Authentication → Email Templates → Confirm signup** — change the body to send the OTP token as a plain code. Use the `{{ .Token }}` placeholder (or `{{ .OtpCode }}` depending on your Supabase version) in the email body so the user receives a 6-digit number.
3. **Authentication → Settings → OTP Expiry** — recommended value: **600 seconds (10 minutes)** for the signup OTP.
4. **Authentication → URL Configuration** — ensure your marketing site origin (e.g. `http://localhost:5173` locally, your deployed URL in prod) is in the **Redirect URLs** allow-list (already required for Google OAuth; harmless to add for consistency). Also add the **manual linking** return URL for the owner dashboard settings page: **`http://localhost:5173/dashboard/settings`** (dev) and **`https://<your-marketing-host>/dashboard/settings`** (production) so **`linkIdentity({ provider: 'google' })`** can redirect back after Google OAuth.

### Forgot password (recovery OTP)

The marketing login dialog (**`apps/Website Design final`**) and **admin login** (**`apps/admin_dashboard`**) use a shared flow: **send code** → **`verifyOtp` with `type: 'recovery'`** → **new password** (`@restaurant-saas/supabase-auth`). For users to see a **6-digit code** in email (not only a magic link), configure **Authentication → Email Templates → Reset password** so the template includes the OTP token placeholder (e.g. `{{ .Token }}` per current Supabase docs). **`resetPasswordForEmail`** still requires a valid **`redirectTo`** URL in allow-lists even when the UX is OTP-in-app.

### Google identity linking (same email, one user)

In **Supabase → Authentication**, enable **Allow manual linking** so the JS client can call **`supabase.auth.linkIdentity`**.

- **Marketing app:** signed-in owners use **Dashboard → Settings** → **Connect Google** to attach Google to the **same** `auth.users` row as their email/password account (avoids duplicate users for the same inbox).
- **Redirect URLs** must include **`/dashboard/settings`** as above.
- **Restaurant admin login** (`apps/admin_dashboard`) is **email + password only** (no Google button); owners who linked Google can still use email/password there, or you can add Google to admin later if desired.

**How the app handles it:**

- `signUp({ email, password })` is called first. If Supabase returns `session: null` (email confirmation required), the UI switches to an OTP entry step **on the same page** — no page navigation.
- On submit, the client calls `supabase.auth.verifyOtp({ email, token, type: 'signup' })`. Success yields a session; errors are shown inline.
- A **Resend code** button (enabled after a 60-second cooldown) calls `supabase.auth.resend({ type: 'signup', email })`.
- If `signUp` immediately returns a session (confirmations disabled in local/dev), the OTP step is skipped automatically.

### Flow

1. **Pricing** (`PricingSection`) — Starter/Professional link to **`/checkout?plan=...`**. Enterprise opens **Gmail compose** to `support@ratolabs.com`.
2. **`/checkout`** — user signs up or signs in (**email/password** or **Google**). On signup with email confirmation enabled, an OTP entry step is shown inline. Configure **Google** and **redirect URLs** in Supabase (add your marketing site origin, e.g. `http://localhost:5173/checkout?plan=starter`, or the default Site URL + redirect allow list).
3. **Pay** — browser calls **`supabase.functions.invoke('create-billing-checkout', { body: { plan } })`** (includes **`apikey`** + session JWT). The Edge Function returns **`{ url }`** → redirect to **Stripe Checkout** (subscription mode). Success redirects to **`{ONBOARDING}/?plan=...&billing=success`**.
4. **Webhooks** — **`stripe-webhook`** verifies the signing secret and **upserts `saas_entitlements`**.

### Edge Function secrets

Set with Supabase CLI or Dashboard (not `VITE_`):

- **`MARKETING_SITE_URL`**, **`ONBOARDING_SITE_URL`** — used for Stripe cancel/success URLs.
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_PROFESSIONAL_MONTHLY`.
- **`SUPABASE_SERVICE_ROLE_KEY`** (for DB writes from webhooks).

Deploy: **`supabase functions deploy create-billing-checkout stripe-webhook`**. Register the Stripe webhook URL in the Stripe dashboard.

### Future: Razorpay (optional)

If you re-enable Razorpay later, restore checkout UI + **`create-billing-checkout`** branches, set Razorpay secrets, and deploy **`razorpay-webhook`**. See commented variables in **`.env.example`**.

---

## 2. Admin dashboard

### Routing

`apps/admin_dashboard/src/app/routes.tsx`:

- **`/login`** — **email + password only** → `supabase.auth.signInWithPassword` (Google sign-in is not offered on this screen).
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
