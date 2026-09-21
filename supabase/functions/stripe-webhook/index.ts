import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { planToMaxTables, upsertSaasEntitlement, type PlanTier } from "../_shared/entitlements.ts";

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v?.trim() || undefined;
}

function mapStripeStatus(
  s: string,
): "active" | "trialing" | "past_due" | "canceled" | "inactive" {
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due") return "past_due";
  if (s === "canceled" || s === "unpaid" || s === "incomplete_expired") return "canceled";
  return "inactive";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const secret = env("STRIPE_WEBHOOK_SECRET");
  const sk = env("STRIPE_SECRET_KEY");
  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !sk || !supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const stripe = new Stripe(sk, { apiVersion: "2023-10-16" });
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return jsonResponse({ error: "No signature" }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch (e) {
    console.error("stripe-webhook: signature verification failed", e);
    return jsonResponse({ error: "Signature verification failed" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") {
        return jsonResponse({ received: true });
      }
      const userId = session.metadata?.user_id;
      const planTier = session.metadata?.plan_tier as PlanTier | undefined;
      if (!userId || (planTier !== "starter" && planTier !== "professional")) {
        return jsonResponse({ received: true, note: "missing metadata" });
      }
      const subId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
      const customerId = typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
      const maxTables = planToMaxTables(planTier);

      const { error } = await upsertSaasEntitlement(admin, {
        user_id: userId,
        plan_tier: planTier,
        max_tables: maxTables,
        status: "active",
        billing_provider: "stripe",
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subId ?? null,
      });
      // Returning 200 on a failed write would drop the entitlement permanently,
      // since Stripe only retries non-2xx responses.
      if (error) {
        console.error("stripe-webhook: entitlement upsert failed", error.message);
        return jsonResponse({ error: "Failed to persist entitlement" }, 500);
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      const planTier = sub.metadata?.plan_tier as PlanTier | undefined;
      if (!userId || (planTier !== "starter" && planTier !== "professional")) {
        return jsonResponse({ received: true });
      }
      const maxTables = planToMaxTables(planTier);
      const status = event.type === "customer.subscription.deleted"
        ? "canceled"
        : mapStripeStatus(sub.status);

      const { error } = await upsertSaasEntitlement(admin, {
        user_id: userId,
        plan_tier: planTier,
        max_tables: maxTables,
        status,
        billing_provider: "stripe",
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
        stripe_subscription_id: sub.id,
      });
      if (error) {
        console.error("stripe-webhook: entitlement upsert failed", error.message);
        return jsonResponse({ error: "Failed to persist entitlement" }, 500);
      }
    }
  } catch (e) {
    console.error("stripe-webhook: handler error", e);
    return jsonResponse({ error: "Handler error" }, 500);
  }

  return jsonResponse({ received: true });
});
