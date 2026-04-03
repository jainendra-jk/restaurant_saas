-- Immutable search_path for set_table_qr_token (Supabase security linter)
CREATE OR REPLACE FUNCTION set_table_qr_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$;
