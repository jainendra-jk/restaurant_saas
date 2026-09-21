-- Require a customer name on every new order.
--
-- Orders are created by the customer app via a direct PostgREST insert (anon
-- role); there is no application server in that path, so the database is the
-- only place the requirement cannot be bypassed by calling the API directly.
--
-- The constraint is added NOT VALID on purpose: it is enforced on every INSERT
-- and UPDATE from this point on, but Postgres does NOT re-check the rows already
-- in the table. Historical orders placed while the name was optional (which may
-- hold NULL customer_name) are therefore preserved untouched. We deliberately do
-- not run `VALIDATE CONSTRAINT`, which would scan and reject those legacy rows.
--
-- Rule: name must be present, non-empty after trimming whitespace, and bounded
-- to a sane length (guards against oversized payloads via a raw API call).
ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_name_required
  CHECK (
    customer_name IS NOT NULL
    AND btrim(customer_name) <> ''
    AND char_length(btrim(customer_name)) <= 120
  )
  NOT VALID;
