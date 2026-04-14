-- Starter tier: allow 20 tables (was 10). Professional remains 50.
UPDATE public.saas_entitlements
SET
  max_tables = 20,
  updated_at = now()
WHERE
  plan_tier = 'starter'
  AND max_tables = 10;

ALTER TABLE public.saas_entitlements
  DROP CONSTRAINT IF EXISTS saas_entitlements_max_tables_check;

ALTER TABLE public.saas_entitlements
  ADD CONSTRAINT saas_entitlements_max_tables_check CHECK (max_tables IN (20, 50));
