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

1. **Supabase Auth**: Add production URLs to redirect allowlist
2. **RLS**: Create second restaurant + staff, confirm staff A cannot see restaurant B data
3. **QR link**: Generate QR from admin, scan on phone, confirm customer app loads
4. **Order flow**: Place order from customer app, confirm it appears in admin Live Orders

## Two-tenant RLS check

1. Sign up restaurant A via onboarding
2. Sign up restaurant B (different email) via onboarding
3. Log in as restaurant A staff — verify only A’s menu, orders, tables visible
4. Log in as restaurant B staff — verify only B’s data visible
