import { useEffect, useState } from "react";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { consumeAuthHandoffFromHash, supabase } from "../lib/supabase";
import { getMarketingOriginForRedirect } from "./utils/billingPlan";

export default function App() {
  const [authReady, setAuthReady] = useState(() => !supabase);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void (async () => {
      try {
        await consumeAuthHandoffFromHash();
        if (alive) setAuthReady(true);
      } catch (err) {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : "Session restore failed.";
        setAuthError(msg);
        setAuthReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!authReady) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fff1e6 100%)" }}
      >
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (authError) {
    const marketingOrigin = getMarketingOriginForRedirect();
    const plan = new URLSearchParams(window.location.search).get("plan") ?? "starter";
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fff1e6 100%)" }}
      >
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-orange-100 p-8 text-center space-y-4">
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            We couldn't restore your session after payment. Please sign in again to continue setup.
          </p>
          <a
            href={`${marketingOrigin}/checkout?plan=${plan}`}
            className="inline-block text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            Return to checkout
          </a>
        </div>
      </div>
    );
  }

  return <OnboardingFlow />;
}