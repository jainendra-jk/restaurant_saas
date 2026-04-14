import { useEffect, useState } from "react";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { consumeAuthHandoffFromHash, supabase } from "../lib/supabase";

export default function App() {
  const [authReady, setAuthReady] = useState(() => !supabase);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void (async () => {
      await consumeAuthHandoffFromHash();
      if (alive) setAuthReady(true);
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

  return <OnboardingFlow />;
}