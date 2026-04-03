-- RLS policies for multi-tenant SaaS
-- Staff: access only their restaurant(s). Customer: read public menu, insert orders for valid table.

-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Helper: is user staff of restaurant?
CREATE OR REPLACE FUNCTION public.is_staff_of(rid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE user_id = auth.uid() AND restaurant_id = rid
  );
$$;

-- restaurants: staff can read/update their restaurant
CREATE POLICY "Staff can read own restaurant"
  ON restaurants FOR SELECT
  USING (public.is_staff_of(id));

CREATE POLICY "Staff can update own restaurant"
  ON restaurants FOR UPDATE
  USING (public.is_staff_of(id));

-- Authenticated users only, and only before their first staff_profiles row (onboarding).
-- If signUp yields no session (e.g. email confirmation required), INSERT fails until the user has a JWT.
CREATE POLICY "Authenticated onboarding insert restaurant"
  ON restaurants FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM staff_profiles sp WHERE sp.user_id = auth.uid()
    )
  );

-- staff_profiles: users can read own profile
CREATE POLICY "Users can read own staff profile"
  ON staff_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Insert staff profile"
  ON staff_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- tables: staff full access for their restaurant
CREATE POLICY "Staff can manage tables"
  ON tables FOR ALL
  USING (public.is_staff_of(restaurant_id));

-- Public read tables by qr_token (for customer app to resolve table)
CREATE POLICY "Public read table by qr_token"
  ON tables FOR SELECT
  USING (qr_token IS NOT NULL);

-- menu_categories: staff full access; public read for customer menu
CREATE POLICY "Staff can manage menu categories"
  ON menu_categories FOR ALL
  USING (public.is_staff_of(restaurant_id));

CREATE POLICY "Public read menu categories"
  ON menu_categories FOR SELECT
  USING (true);

-- menu_items: staff full access; public read
CREATE POLICY "Staff can manage menu items"
  ON menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM menu_categories mc
      WHERE mc.id = menu_items.category_id
      AND public.is_staff_of(mc.restaurant_id)
    )
  );

CREATE POLICY "Public read menu items"
  ON menu_items FOR SELECT
  USING (true);

-- orders: staff read/update for their restaurant; allow insert for valid table (customer)
CREATE POLICY "Staff can manage orders"
  ON orders FOR ALL
  USING (public.is_staff_of(restaurant_id));

-- Allow anon to insert orders for tables with qr_token (customer checkout)
CREATE POLICY "Insert order for valid table"
  ON orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_id
      AND t.qr_token IS NOT NULL
    )
  );

-- Allow read orders for QR tables (needed so anon can verify order exists for order_items insert)
CREATE POLICY "Read orders for QR tables"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = orders.table_id AND t.qr_token IS NOT NULL
    )
  );

-- order_items: staff full access via order; insert with order
CREATE POLICY "Staff can manage order items"
  ON order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND public.is_staff_of(o.restaurant_id)
    )
  );

CREATE POLICY "Insert order item with order"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN tables t ON t.id = o.table_id
      WHERE o.id = order_id
      AND t.qr_token IS NOT NULL
    )
  );

-- Storage: logos and menu PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('logos', 'logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('menu-pdfs', 'menu-pdfs', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Logos: public read; staff can upload for their restaurant
CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Staff upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM restaurants WHERE public.is_staff_of(id)
    )
  );

CREATE POLICY "Staff update own logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM restaurants WHERE public.is_staff_of(id)
    )
  );

-- Menu PDFs: staff only (for AI import)
CREATE POLICY "Staff manage menu PDFs"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'menu-pdfs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM restaurants WHERE public.is_staff_of(id)
    )
  );
