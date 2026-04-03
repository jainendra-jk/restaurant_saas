-- Onboarding: customer ordering base URL for QR links; per-table stored QR payload
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS customer_app_origin TEXT;

ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS order_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_png_base64 TEXT;

COMMENT ON COLUMN restaurants.customer_app_origin IS 'Public base URL of customer ordering app for this tenant (e.g. https://order.example.com)';
COMMENT ON COLUMN tables.order_url IS 'Full URL encoded in table QR';
COMMENT ON COLUMN tables.qr_png_base64 IS 'PNG QR image as base64 (no data: prefix)';
