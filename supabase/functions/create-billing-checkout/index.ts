import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { planToMaxTables, type PlanTier } from "../_shared/entitlements.ts";

const PLANS: PlanTier[] = ["starter", "professional"];

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v?.trim() || undefined;
}

/** Same browser site (scheme + host + port) — shared auth storage across paths. */
function sameSiteOrigin(a: string, b: string): boolean {
  try {
    const ua = new URL(a.trim().replace(/\/+$/, "") || "http://localhost");
    const ub = new URL(b.trim().replace(/\/+$/, "") || "http://localhost");
    return ua.origin === ub.origin;
  } catch {
    return false;
  }
}

async function getUserFromRequest(req: Request) {
  const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!auth) return { user: null as null, error: "Missing Authorization" };

  const url = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY");
  if (!url || !anon) return { user: null as null, error: "Server misconfigured" };

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.getUser(auth);
  if (error || !data.user) return { user: null as null, error: error?.message ?? "Invalid session" };
  return { user: data.user, error: null as null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const { user, error: authErr } = await getUserFromRequest(req);
  if (!user || authErr) {
    return jsonResponse({ error: authErr ?? "Unauthorized" }, 401);
  }

  let body: { plan?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const plan = body.plan as PlanTier;
  if (!PLANS.includes(plan)) {
    return jsonResponse({ error: "Invalid plan" }, 400);
  }

  const rawProvider = body.provider;
  if (rawProvider != null && String(rawProvider).trim() !== "" && String(rawProvider).toLowerCase() !== "stripe") {
    return jsonResponse({ error: "Only Stripe billing is enabled" }, 400);
  }

  const marketing = env("MARKETING_SITE_URL") ?? "http://localhost:5173";
  const onboarding = env("ONBOARDING_SITE_URL") ?? "http://localhost:5176";
  const marketingBase = marketing.replace(/\/+$/, "");
  const onboardingBase = onboarding.replace(/\/+$/, "");
  const maxTables = planToMaxTables(plan);
  const meta = {
    user_id: user.id,
    plan_tier: plan,
    max_tables: String(maxTables),
  };

  const sk = env("STRIPE_SECRET_KEY");
  const priceId =
    plan === "starter"
      ? env("STRIPE_PRICE_STARTER_MONTHLY")
      : env("STRIPE_PRICE_PROFESSIONAL_MONTHLY");
  if (!sk || !priceId) {
    return jsonResponse({ error: "Stripe billing is not configured" }, 503);
  }

  const stripe = new Stripe(sk, { apiVersion: "2023-10-16" });

  const successUrl = sameSiteOrigin(marketing, onboarding)
    ? `${onboardingBase}/?plan=${plan}&billing=success`
    : `${marketingBase}/checkout/billing-return?plan=${plan}&billing=success`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: `${marketingBase}/checkout?plan=${plan}&canceled=1`,
    metadata: meta,
    subscription_data: { metadata: meta },
  });

  if (!session.url) {
    return jsonResponse({ error: "Stripe did not return a checkout URL" }, 500);
  }
  return jsonResponse({ provider: "stripe", url: session.url });
});
