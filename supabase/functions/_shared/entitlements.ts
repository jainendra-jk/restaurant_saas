import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

export type PlanTier = "starter" | "professional";

export function planToMaxTables(plan: string): number {
  if (plan === "starter") return 20;
  if (plan === "professional") return 50;
  throw new Error(`Invalid plan: ${plan}`);
}

export async function upsertSaasEntitlement(
  admin: SupabaseClient,
  row: {
    user_id: string;
    plan_tier: PlanTier;
    max_tables: number;
    status: string;
    billing_provider: "stripe" | "razorpay";
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    razorpay_customer_id?: string | null;
    razorpay_subscription_id?: string | null;
  },
): Promise<{ error: Error | null }> {
  const { error } = await admin.from("saas_entitlements").upsert(
    {
      user_id: row.user_id,
      plan_tier: row.plan_tier,
      max_tables: row.max_tables,
      status: row.status,
      billing_provider: row.billing_provider,
      stripe_customer_id: row.stripe_customer_id ?? null,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      razorpay_customer_id: row.razorpay_customer_id ?? null,
      razorpay_subscription_id: row.razorpay_subscription_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return { error: error ? new Error(error.message) : null };
}
