import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { planToMaxTables, upsertSaasEntitlement, type PlanTier } from "../_shared/entitlements.ts";

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v?.trim() || undefined;
}

async function verifyRazorpaySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const digest = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqual(digest, signature);
}

/** Length-independent, byte-wise comparison so verification cannot be probed by timing. */
function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function notesPlan(notes: Record<string, string> | undefined): {
  userId: string | null;
  planTier: PlanTier | null;
  maxTables: number | null;
} {
  if (!notes) return { userId: null, planTier: null, maxTables: null };
  const userId = notes.user_id ?? null;
  const pt = notes.plan_tier;
  const planTier = pt === "starter" || pt === "professional" ? pt : null;
  const mt = notes.max_tables ? parseInt(notes.max_tables, 10) : null;
  return {
    userId,
    planTier,
    maxTables: mt === 20 || mt === 50 ? mt : planTier ? planToMaxTables(planTier) : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const webhookSecret = env("RAZORPAY_WEBHOOK_SECRET");
  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const ok = await verifyRazorpaySignature(rawBody, signature, webhookSecret);
  if (!ok) {
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  let payload: { event?: string; payload?: { subscription?: { entity?: Record<string, unknown> } } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const event = payload.event ?? "";
  const entity = payload.payload?.subscription?.entity as
    | {
      id?: string;
      customer_id?: string;
      notes?: Record<string, string>;
      status?: string;
    }
    | undefined;

  if (!entity?.id) {
    return jsonResponse({ received: true });
  }

  const { userId, planTier, maxTables } = notesPlan(entity.notes);
  if (!userId || !planTier || !maxTables) {
    return jsonResponse({ received: true, note: "missing notes" });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  let status = "inactive";
  if (event === "subscription.activated" || event === "subscription.charged" || event === "subscription.resumed") {
    status = "active";
  } else if (event === "subscription.pending") {
    status = "inactive";
  } else if (
    event === "subscription.cancelled" ||
    event === "subscription.completed" ||
    event === "subscription.halted"
  ) {
    status = "canceled";
  } else if (entity.status === "active" || entity.status === "authenticated") {
    status = "active";
  } else if (entity.status === "cancelled" || entity.status === "completed" || entity.status === "halted") {
    status = "canceled";
  }

  try {
    const { error } = await upsertSaasEntitlement(admin, {
      user_id: userId,
      plan_tier: planTier,
      max_tables: maxTables,
      status,
      billing_provider: "razorpay",
      razorpay_customer_id: entity.customer_id ?? null,
      razorpay_subscription_id: entity.id,
    });
    // Non-2xx makes Razorpay retry, which is what we want if the write failed.
    if (error) {
      console.error("razorpay-webhook: entitlement upsert failed", error.message);
      return jsonResponse({ error: "Failed to persist entitlement" }, 500);
    }
  } catch (e) {
    console.error("razorpay-webhook: handler error", e);
    return jsonResponse({ error: "Handler error" }, 500);
  }

  return jsonResponse({ received: true });
});
