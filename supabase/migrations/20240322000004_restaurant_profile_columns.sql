-- First-class restaurant profile fields (backward-compatible with legacy branding JSON).
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS fssai_number TEXT;

-- Best-effort backfill from legacy branding payload.
UPDATE public.restaurants
SET
  owner_name = COALESCE(owner_name, NULLIF(branding->>'ownerName', '')),
  phone = COALESCE(phone, NULLIF(branding->>'phone', '')),
  gst_number = COALESCE(gst_number, NULLIF(branding->>'gstNumber', '')),
  fssai_number = COALESCE(fssai_number, NULLIF(branding->>'fssaiNumber', '')),
  address_line1 = COALESCE(address_line1, NULLIF(branding->>'address', ''))
WHERE
  owner_name IS NULL
  OR phone IS NULL
  OR gst_number IS NULL
  OR fssai_number IS NULL
  OR address_line1 IS NULL;
