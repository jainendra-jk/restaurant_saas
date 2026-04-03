-- Customer orders: require table to be active (not just QR-enabled).
DROP POLICY IF EXISTS "Insert order for valid table" ON orders;

CREATE POLICY "Insert order for valid table"
  ON orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND t.qr_token IS NOT NULL
      AND t.status = 'active'
    )
  );
