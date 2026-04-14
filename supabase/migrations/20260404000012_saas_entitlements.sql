-- SaaS subscription entitlements (billing for Ratolabs product, not restaurant payment gateways).
CREATE TABLE public.saas_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('starter', 'professional')),
  max_tables INT NOT NULL CHECK (max_tables IN (10, 50)),
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'inactive', 'halted', 'completed')),
  billing_provider TEXT CHECK (billing_provider IS NULL OR billing_provider IN ('stripe', 'razorpay')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saas_entitlements_status ON public.saas_entitlements (status);

ALTER TABLE public.saas_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_entitlements_select_own"
  ON public.saas_entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates only via service role (Edge Functions / webhooks); no client write policies.

COMMENT ON TABLE public.saas_entitlements IS 'Per-user SaaS plan after Stripe/Razorpay subscription; RLS read-only for owners.';
