-- Allow anonymous (customer app) to read restaurants by slug for menu and session resolution.
-- Complements staff-only SELECT in 20240321000001; multiple permissive policies are OR'd.
CREATE POLICY "Public read restaurants for menu"
  ON restaurants FOR SELECT
  USING (true);
