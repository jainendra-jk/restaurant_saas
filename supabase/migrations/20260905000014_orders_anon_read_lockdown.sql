-- Close cross-tenant disclosure of orders to the anon (customer app) role.
--
-- 20240321000001 shipped:
--
--   CREATE POLICY "Read orders for QR tables" ON orders FOR SELECT
--     USING (EXISTS (SELECT 1 FROM tables t
--                    WHERE t.id = orders.table_id AND t.qr_token IS NOT NULL));
--
-- Every table gets a qr_token from the set_table_qr_token trigger, so that
-- predicate is true for every row of every tenant. Anyone holding the public
-- anon key could therefore `SELECT * FROM orders` and read customer names,
-- special instructions and order totals for every restaurant on the platform.
--
-- The policy existed for two mechanical reasons, both of which are removed here
-- instead of being paid for with a blanket read grant:
--
--   1. `INSERT ... RETURNING id` (PostgREST `return=representation`) requires a
--      SELECT policy. The customer app now generates the order UUID client-side
--      and inserts with `return=minimal`, so nothing is returned.
--   2. The `order_items` INSERT policy does `EXISTS (SELECT 1 FROM orders ...)`.
--      Tables referenced inside a policy expression have their own RLS applied,
--      so that subquery needed anon SELECT on orders. It now goes through a
--      SECURITY DEFINER helper (same pattern as public.is_staff_of), which
--      evaluates the parent-order check without exposing the rows.
--
-- Staff access is untouched: "Staff can manage orders" is FOR ALL and already
-- covers SELECT for authenticated staff of the owning restaurant.

-- Validates that `p_order_id` is an existing order sitting at a QR-enabled
-- table. SECURITY DEFINER so the check itself does not require the caller to be
-- able to read `orders`; it returns only a boolean, never row contents.
CREATE OR REPLACE FUNCTION public.order_accepts_customer_items(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.tables t ON t.id = o.table_id
    WHERE o.id = p_order_id
      AND t.qr_token IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.order_accepts_customer_items(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_accepts_customer_items(uuid) TO anon, authenticated;

-- Same acceptance criteria as before, evaluated without anon SELECT on orders.
DROP POLICY IF EXISTS "Insert order item with order" ON public.order_items;
CREATE POLICY "Insert order item with order"
  ON public.order_items FOR INSERT
  WITH CHECK (public.order_accepts_customer_items(order_id));

-- The blanket anon read is no longer needed by any code path.
DROP POLICY IF EXISTS "Read orders for QR tables" ON public.orders;
