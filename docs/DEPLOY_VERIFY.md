# Deployment verification

Manual checklist for validating the restaurant SaaS deployment.

## Local pre-deploy

1. Run migrations: `supabase db push` (or apply SQL in Supabase dashboard)
2. Set `.env.local` in each app with `VITE_SUPABASE_*`
3. `pnpm install && pnpm build` — all 3 apps build without errors
4. Run each app and smoke test:
   - **Onboarding**: Complete flow, verify restaurant + staff created in Supabase
   - **Admin**: Login with created user, see dashboard
   - **Customer**: Visit `/r/{slug}/t/1`, browse menu, place order

## Post-deploy (production)

1. **Auth / OAuth / marketing SPA** (required for Google sign-in and checkout; see below)
2. **RLS**: Create second restaurant + staff, confirm staff A cannot see restaurant B data
3. **QR link**: Generate QR from admin, scan on phone, confirm customer app loads
4. **Order flow**: Place order from customer app, confirm it appears in admin Live Orders

### Auth / OAuth / marketing site (`apps/Website Design final`)

Without these steps, Google OAuth can fail or the browser can show **404** on `/checkout` or `/dashboard` after login.

**Google Cloud Console** (OAuth 2.0 Client ID used in Supabase):

- **Authorized redirect URIs**: add exactly  
  `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`  
  (not your marketing domain — Google returns to Supabase first.)
- **Authorized JavaScript origins**: include `https://<YOUR_PROJECT_REF>.supabase.co`, your production marketing origin (e.g. `https://www.example.com`), and `http://localhost:5173` for local dev if needed.
- Paste **Client ID** and **Client secret** into **Supabase → Authentication → Providers → Google**.

**Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL**: canonical marketing origin (same host users type in the browser; should match **`VITE_WEBSITE_ORIGIN`** in `.env`).
- **Redirect URLs**: allow every URL the app uses as `redirectTo`, for example:
  - `https://www.example.com/`
  - `https://www.example.com/checkout`
  - `https://www.example.com/checkout?plan=starter`
  - `https://www.example.com/checkout?plan=professional`
  - `https://www.example.com/dashboard`
  - Same paths on `http://localhost:5173` for local testing  
  Wildcards such as `https://www.example.com/**` are supported on current Supabase projects; see [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

**Static hosting (SPA fallback)** so deep links and OAuth returns load the app:

- The marketing app ships **`vercel.json`** (rewrite all paths to `index.html`) and **`public/_redirects`** for Netlify (`/*` → `index.html` with 200). Deploy `dist/` with those files at the site root.
- **Cloudflare Pages**: add a rule or `_routes.json` / “SPA” behavior so unknown paths serve `index.html`.
- **S3 + CloudFront** or **nginx**: default object / `try_files` to `index.html` for non-file routes.

**Verify**: open production `https://your-domain/checkout?plan=starter` in a new tab (hard refresh). You should get **200** and the checkout UI, not a JSON or HTML 404 from the CDN.

## Two-tenant RLS check

1. Sign up restaurant A via onboarding
2. Sign up restaurant B (different email) via onboarding
3. Log in as restaurant A staff — verify only A’s menu, orders, tables visible
4. Log in as restaurant B staff — verify only B’s data visible
