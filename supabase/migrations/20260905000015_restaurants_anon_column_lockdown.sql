-- Restrict the anon (customer app) role to only the restaurant columns the
-- public ordering flow actually needs.
--
-- 20240321000003 shipped `CREATE POLICY "Public read restaurants for menu" ON
-- restaurants FOR SELECT USING (true)`. RLS is row-level only, so with the
-- table-level SELECT grant the anon role holds, anyone with the public anon key
-- (shipped in every customer bundle) could
--
--   GET /rest/v1/restaurants?select=owner_name,email,customer_app_origin
--
-- and dump owner personal names, owner emails and internal config for every
-- tenant on the platform in a single request. Later migrations widened
-- `restaurants` with owner_name / email / customer_app_origin /
-- session_timeout_minutes, none of which the customer app reads.
--
-- Fix: swap the anon role's blanket table SELECT for a column-scoped grant.
-- Postgres column privileges are additive over a table grant, so the blanket
-- grant must be REVOKEd first for the column list to take effect. The
-- `authenticated` role (staff dashboards, onboarding) keeps full access via its
-- own table grant and the is_staff_of() policies, so admin reads/writes of the
-- private columns are untouched.
--
-- The retained columns are exactly what the customer app selects today:
--   * id / slug            -> tenant + table resolution and eq() filters
--   * name / branding /
--     palette / currency /
--     logo_url / is_open    -> menu rendering
--   * address_line1 / city /
--     state / pincode / phone /
--     gst_number / fssai_number -> printed on the customer bill (legally
--                                   required on Indian restaurant receipts),
--                                   so already public per tenant.
--
-- Withheld from anon: owner_name, email, customer_app_origin,
-- session_timeout_minutes, created_at, updated_at.
--
-- The "Public read restaurants for menu" policy stays as-is; it is still needed
-- for anon to read any row at all. This only narrows *which columns* come back.
-- The realtime subscriptions on `restaurants` in the customer app are filtered
-- to the viewer's own restaurant and discard the payload (they only trigger a
-- REST refetch), so this REST-layer scoping is where the mass-disclosure risk
-- lives.

REVOKE SELECT ON public.restaurants FROM anon;

GRANT SELECT (
  id,
  slug,
  name,
  branding,
  palette,
  currency,
  logo_url,
  is_open,
  address_line1,
  city,
  state,
  pincode,
  phone,
  gst_number,
  fssai_number
) ON public.restaurants TO anon;
