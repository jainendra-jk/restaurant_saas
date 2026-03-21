-- Set qr_token for tables that don't have one (required for customer order RLS)
UPDATE tables
SET qr_token = id::text
WHERE qr_token IS NULL;

-- Default qr_token for new tables
CREATE OR REPLACE FUNCTION set_table_qr_token()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_set_table_qr_token ON tables;
CREATE TRIGGER trigger_set_table_qr_token
  BEFORE INSERT ON tables
  FOR EACH ROW
  EXECUTE FUNCTION set_table_qr_token();
