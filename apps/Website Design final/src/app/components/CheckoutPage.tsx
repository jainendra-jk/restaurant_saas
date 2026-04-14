import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { StripePoweredByBadge } from "./StripePoweredByBadge";
import { supabase } from "../../lib/supabase";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "./ui/input-otp";
import { verifySignupOtp, resendSignupOtp } from "../utils/verifySignupOtp";
import { Eye, EyeOff } from "lucide-react";

type PlanId = "starter" | "professional";

type CheckoutFnResponse = {
  error?: string;
  url?: string | null;
  provider?: string;
};

const RESEND_COOLDOWN_SECONDS = 60;

async function checkoutInvokeErrorMessage(error: { message: string; context?: Response }): Promise<string> {
  if (error.context && typeof error.context.json === "function") {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      /* keep message */
    }
  }
  return error.message;
}

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") as PlanId | null;
  const canceled = searchParams.get("canceled") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // OTP step state
  const [authStep, setAuthStep] = useState<"form" | "otp">("form");
  const [otpValue, setOtpValue] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validPlan = plan === "starter" || plan === "professional";

  const refreshSession = useCallback(async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    setSessionReady(!!session);
    if (session?.user?.email) setEmail(session.user.email);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    refreshSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshSession();
    });
    return () => subscription.unsubscribe();
  }, [refreshSession]);

  useEffect(() => {
    if (!validPlan && typeof window !== "undefined") {
      window.location.replace("/#pricing");
    }
  }, [validPlan]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Enter email and password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        if (!data.session) {
          // Email confirmation required — show OTP step
          setOtpValue("");
          setAuthStep("otp");
          startResendCooldown();
          setBusy(false);
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (otpValue.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      const errMsg = await verifySignupOtp(supabase, email.trim(), otpValue);
      if (errMsg) throw new Error(errMsg);
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    if (!supabase) return;
    setBusy(true);
    try {
      const errMsg = await resendSignupOtp(supabase, email.trim());
      if (errMsg) throw new Error(errMsg);
      startResendCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    const redirect =
      typeof window !== "undefined" ? `${window.location.origin}/checkout?plan=${plan}` : undefined;
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect },
    });
    setBusy(false);
    if (err) setError(err.message);
  };

  const startPaidCheckout = async () => {
    setError(null);
    if (!supabase || !plan) {
      setError("Billing is not configured (set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and deploy Edge Functions).");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sign in or create an account first.");
      return;
    }
    setBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<CheckoutFnResponse>("create-billing-checkout", {
        body: { plan },
      });
      if (fnError) {
        throw new Error(await checkoutInvokeErrorMessage(fnError as { message: string; context?: Response }));
      }
      if (!data) throw new Error("Checkout failed");
      if (data.error) throw new Error(data.error);

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Checkout did not return a payment URL");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  };

  if (!validPlan) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <Navbar />
      <main className="flex-1 max-w-md mx-auto w-full px-6 py-16">
        <Link to="/#pricing" className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block">
          ← Back to pricing
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {plan === "starter" ? "Starter" : "Professional"} plan
        </h1>
        <p className="text-sm text-gray-500 mb-8">Monthly subscription — sign in, then pay securely with Stripe.</p>

        {canceled && (
          <div className="mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Payment was canceled. You can try again when you are ready.
          </div>
        )}

        {!sessionReady ? (
          authStep === "otp" ? (
            /* ── OTP verification step ── */
            <div className="space-y-6 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Verify your email</h2>
                <p className="text-sm text-gray-500">
                  We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>.
                  Enter it below to confirm your account.
                </p>
              </div>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={setOtpValue}
                    disabled={busy}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={busy || otpValue.length !== 6}
                  className="w-full py-3.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm disabled:opacity-50"
                >
                  {busy ? "Verifying…" : "Verify email"}
                </button>
              </form>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={busy || resendCooldown > 0}
                  className="text-orange-600 hover:text-orange-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("form");
                    setOtpValue("");
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-800"
                >
                  ← Back
                </button>
              </div>
            </div>
          ) : (
            /* ── Email / password form ── */
            <div className="space-y-6 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  className={mode === "signup" ? "font-semibold text-gray-900" : "text-gray-500"}
                  onClick={() => { setMode("signup"); setError(null); }}
                >
                  Create account
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  className={mode === "signin" ? "font-semibold text-gray-900" : "text-gray-500"}
                  onClick={() => { setMode("signin"); setError(null); }}
                >
                  Sign in
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/30"
                    placeholder="you@restaurant.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/30"
                      placeholder="••••••••"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm disabled:opacity-50"
                >
                  {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
                </button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-400">
                  <span className="bg-white px-2">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="w-full py-3.5 rounded-xl border border-gray-200 font-semibold text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
                  <path
                    fill="#FFC107"
                    d="M43.61 20.08H42V20H24v8h11.3C33.65 32.66 29.19 36 24 36c-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.95 3.03l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.31 14.69l6.57 4.82C14.67 15.11 18.99 12 24 12c3.06 0 5.84 1.15 7.95 3.03l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.66 8.34 6.31 14.69z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.17 0 9.86-1.98 13.41-5.2l-6.19-5.24C29.16 35.08 26.68 36 24 36c-5.17 0-9.61-3.31-11.25-7.91l-6.52 5.02C9.54 39.56 16.24 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.61 20.08H42V20H24v8h11.3c-.79 2.34-2.3 4.33-4.08 5.56l.01-.01 6.19 5.24C37 39.06 44 34 44 24c0-1.34-.14-2.65-.39-3.92z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
          )
        ) : (
          <div className="relative space-y-4 bg-white rounded-2xl border border-gray-200 p-6 pb-12 shadow-sm">
            <p className="text-sm text-gray-600">
              Signed in as <span className="font-medium text-gray-900">{email}</span>
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={startPaidCheckout}
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm disabled:opacity-50"
            >
              {busy ? "Redirecting…" : "Continue to Stripe checkout"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase?.auth.signOut();
                setSessionReady(false);
                setAuthStep("form");
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-800"
            >
              Use a different account
            </button>
            <div className="absolute bottom-4 right-6">
              <StripePoweredByBadge />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
