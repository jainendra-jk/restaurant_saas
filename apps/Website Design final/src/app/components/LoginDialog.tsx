import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { supabase } from "../../lib/supabase";
import { useWebsiteAuth } from "../context/WebsiteAuthContext";
import { toast } from "sonner";
import { PasswordRecoveryDialog } from "@restaurant-saas/supabase-auth";
import {
  isSafeInternalPath,
  resolveWebsitePostLoginPath,
  WEBSITE_DASHBOARD_PATH,
} from "../utils/accessRouting";
import { Eye, EyeOff } from "lucide-react";

type LoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const navigate = useNavigate();
  const {
    setPostLoginRedirect,
    postLoginRedirect,
    refreshProfile,
    accessState,
  } = useWebsiteAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const resolveFreshPostLoginState = async (): Promise<"no_subscription" | "setup_incomplete" | "ready"> => {
    if (!supabase) return accessState;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return accessState;

    const [{ data: ent }, { data: staffRows }] = await Promise.all([
      supabase
        .from("saas_entitlements")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("staff_profiles")
        .select("role, restaurants(menu_import_completed_at)")
        .eq("user_id", userId),
    ]);

    const hasActiveEntitlement = ent?.status === "active" || ent?.status === "trialing";
    if (!hasActiveEntitlement) return "no_subscription";

    const rows = Array.isArray(staffRows) ? staffRows : [];
    const ownerRow = rows.find((r) => r.role === "owner");
    const pickedRow = ownerRow ?? rows[0] ?? null;
    const menuDone = Boolean(
      pickedRow &&
        typeof pickedRow === "object" &&
        pickedRow !== null &&
        "restaurants" in pickedRow &&
        (pickedRow as { restaurants?: { menu_import_completed_at?: string | null } | null }).restaurants
          ?.menu_import_completed_at,
    );
    return menuDone ? "ready" : "setup_incomplete";
  };

  const redirectAfterLogin = async () => {
    const target = postLoginRedirect;
    setPostLoginRedirect(null);
    onOpenChange(false);
    const freshState = await resolveFreshPostLoginState();
    if (freshState === "no_subscription") {
      toast("Buy a plan to unleash full potential", { closeButton: false });
      navigate("/#pricing", { replace: true });
      return;
    }
    const fallback = isSafeInternalPath(target) ? target : WEBSITE_DASHBOARD_PATH;
    const nextPath = resolveWebsitePostLoginPath(freshState, fallback);
    navigate(nextPath, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      await refreshProfile();
      await redirectAfterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
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
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fallback = isSafeInternalPath(postLoginRedirect)
      ? postLoginRedirect
      : WEBSITE_DASHBOARD_PATH;
    const redirect = origin ? `${origin}${fallback}` : fallback;
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect },
    });
    setBusy(false);
    if (err) setError(err.message);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Log in to QResto</DialogTitle>
          <DialogDescription className="text-gray-500">
            Use your account to access the dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900"
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
                className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900"
                placeholder="••••••••"
                autoComplete="current-password"
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              disabled={busy}
              className="text-xs font-semibold text-[#f97316] hover:text-[#ea580c] disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Log in"}
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
      </DialogContent>
    </Dialog>
    <PasswordRecoveryDialog
      supabase={supabase}
      open={forgotOpen}
      onOpenChange={setForgotOpen}
      initialEmail={email.trim()}
      onSuccess={() =>
        toast.success("Password updated successfully.", { closeButton: false })
      }
    />
    </>
  );
}
