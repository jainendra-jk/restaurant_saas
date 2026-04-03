-- Replace always-true restaurants INSERT policy (Supabase linter) with onboarding-scoped check.
-- Idempotent: safe if 20240321000001 was already applied with either policy name.
DROP POLICY IF EXISTS "Anyone can insert restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Authenticated onboarding insert restaurant" ON public.restaurants;

CREATE POLICY "Authenticated onboarding insert restaurant"
  ON public.restaurants FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id = auth.uid()
    )
  );
