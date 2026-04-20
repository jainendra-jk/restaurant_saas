-- Add soft-hide + abandonment lifecycle for orders.
-- Also create analytics_snapshots to avoid missing-table 404 noise.

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'abandoned';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS abandoned_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_placed_visible
  ON orders (restaurant_id, placed_at DESC)
  WHERE is_hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status_placed_visible
  ON orders (restaurant_id, status, placed_at DESC)
  WHERE is_hidden = FALSE;

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  most_ordered_dish TEXT,
  peak_hours TEXT,
  orders_per_hour JSONB NOT NULL DEFAULT '[]'::jsonb,
  revenue_trend JSONB NOT NULL DEFAULT '[]'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_restaurant_captured_at
  ON analytics_snapshots (restaurant_id, captured_at DESC);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read analytics snapshots"
  ON analytics_snapshots FOR SELECT
  USING (public.is_staff_of(restaurant_id));

CREATE POLICY "Staff can manage analytics snapshots"
  ON analytics_snapshots FOR ALL
  USING (public.is_staff_of(restaurant_id))
  WITH CHECK (public.is_staff_of(restaurant_id));
