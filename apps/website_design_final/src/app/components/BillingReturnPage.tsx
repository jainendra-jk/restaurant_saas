import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { supabase } from "../../lib/supabase";
import { getOnboardingHref } from "../utils/routeTargets";

type PlanId = "starter" | "professional";

const POLL_MS = 1000;
const MAX_MS = 45_000;

function isActiveEntitlement(
  row: { plan_tier: string; status: string } | null,
  plan: PlanId,
): boolean {
  return Boolean(
    row &&
      (row.status === "active" || row.status === "trialing") &&
      row.plan_tier === plan,
  );
}

/**
 * Stripe success_url lands here (same origin as checkout) so the Supabase session
 * still exists; we poll for webhook-written entitlements then redirect to onboarding
 * with tokens in the hash so the other origin can call setSession.
 */
export function BillingReturnPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") as PlanId | null;
  const billingOk = searchParams.get("billing") === "success";

  const [message, setMessage] = useState("Confirming your subscription…");
  const [error, setError] = useState<string | null>(null);

  const validPlan = plan === "starter" || plan === "professional";

  useEffect(() => {
    if (!validPlan || !billingOk) return;
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    let cancelled = false;

    async function run() {
      // Read session early only to get the user id for entitlement polling.
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (!initialSession?.user.id) {
        setError("Your session expired. Sign in again to continue setup.");
        return;
      }

      const deadline = Date.now() + MAX_MS;
      let ent: { plan_tier: string; status: string } | null = null;

      while (!cancelled && Date.now() < deadline) {
        const { data } = await supabase
          .from("saas_entitlements")
          .select("plan_tier,status")
          .eq("user_id", initialSession.user.id)
          .maybeSingle();
        ent = data ?? null;
        if (isActiveEntitlement(ent, plan!)) break;
        await new Promise((r) => setTimeout(r, POLL_MS));
      }

      if (cancelled) return;

      if (!isActiveEntitlement(ent, plan!)) {
        setError(
          "We could not confirm your subscription yet. Return to checkout or contact support if you were charged.",
        );
        return;
      }

      // Re-fetch the session right before redirecting so the tokens are as
      // fresh as possible — the access token may have been silently refreshed
      // during the entitlement polling window above.
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (!freshSession?.access_token || !freshSession.refresh_token) {
        setError("Your session expired during setup. Please sign in again.");
        return;
      }

      if (cancelled) return;

      setMessage("Opening onboarding…");
      const onboarding = getOnboardingHref().replace(/\/+$/, "");
      const handoff = new URLSearchParams({
        access_token: freshSession.access_token,
        refresh_token: freshSession.refresh_token,
        token_type: "bearer",
        expires_in: String(freshSession.expires_in ?? 3600),
      });
      window.location.href = `${onboarding}/?plan=${plan}&billing=success#${handoff.toString()}`;
    }

    void run().catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.");
    });

    return () => {
      cancelled = true;
    };
  }, [validPlan, billingOk, plan]);

  if (!validPlan || !billingOk) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-6 py-16">
          <p className="text-sm text-gray-600 mb-4">This link is invalid or incomplete.</p>
          <Link to="/checkout?plan=starter" className="text-orange-600 text-sm font-medium">
            Go to checkout
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Navbar />
      <main className="flex-1 max-w-md mx-auto w-full px-6 py-16 text-center">
        {!error ? (
          <>
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">{message}</p>
          </>
        ) : (
          <div className="text-left space-y-4">
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
            <Link
              to={`/checkout?plan=${plan}`}
              className="inline-block text-sm font-medium text-orange-600"
            >
              Back to checkout
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
