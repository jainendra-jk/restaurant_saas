import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp";
import { Eye, EyeOff, X } from "lucide-react";
import {
  requestPasswordResetEmail,
  verifyRecoveryOtp,
  updatePasswordFromRecoverySession,
  resendRecoveryEmail,
  validateNewPassword,
} from "./passwordRecovery";

type Step = "email" | "otp" | "password";

const DEFAULT_PRIMARY =
  "w-full rounded-xl bg-[#f97316] py-3 text-sm font-semibold text-white hover:bg-[#ea580c] disabled:opacity-50";

function OtpSlot({ index }: { index: number }) {
  const ctx = React.useContext(OTPInputContext);
  const slot = ctx?.slots[index];
  const char = slot?.char ?? null;
  const isActive = slot?.isActive ?? false;
  const hasFakeCaret = slot?.hasFakeCaret ?? false;

  return (
    <div
      className={`relative flex h-10 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-900 ${
        isActive ? "z-10 ring-2 ring-[#f97316]/35" : ""
      }`}
    >
      {char}
      {hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-pulse bg-gray-400" />
        </div>
      ) : null}
    </div>
  );
}

export type PasswordRecoveryDialogProps = {
  supabase: SupabaseClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  /** Passed to resetPasswordForEmail (required by Supabase even for OTP UX). */
  redirectTo?: string;
  onSuccess: () => void;
  /** Tailwind classes for primary buttons (optional). */
  primaryButtonClassName?: string;
};

export function PasswordRecoveryDialog({
  supabase,
  open,
  onOpenChange,
  initialEmail = "",
  redirectTo,
  onSuccess,
  primaryButtonClassName = DEFAULT_PRIMARY,
}: PasswordRecoveryDialogProps) {
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const cooldownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const resolvedRedirect = React.useMemo(() => {
    if (redirectTo?.trim()) return redirectTo.trim();
    if (typeof window !== "undefined") return `${window.location.origin}/`;
    return undefined;
  }, [redirectTo]);

  React.useEffect(() => {
    if (!open) return;
    setStep("email");
    setEmail(initialEmail.trim());
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setInfo(null);
    setBusy(false);
    setShowNew(false);
    setShowConfirm(false);
    setResendCooldown(0);
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
  }, [open, initialEmail]);

  React.useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startResendCooldown = React.useCallback(() => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (cooldownRef.current) {
            clearInterval(cooldownRef.current);
            cooldownRef.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!supabase) {
      setError("Authentication is not configured.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setBusy(true);
    try {
      const errMsg = await requestPasswordResetEmail(supabase, email, resolvedRedirect);
      if (errMsg) throw new Error(errMsg);
      setInfo("If an account exists for this email, we sent a 6-digit code. Check your inbox.");
      setStep("otp");
      startResendCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!supabase) {
      setError("Authentication is not configured.");
      return;
    }
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      const errMsg = await verifyRecoveryOtp(supabase, email, otp);
      if (errMsg) throw new Error(errMsg);
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!supabase || resendCooldown > 0) return;
    setError(null);
    setBusy(true);
    try {
      const errMsg = await resendRecoveryEmail(supabase, email, resolvedRedirect);
      if (errMsg) throw new Error(errMsg);
      setInfo("If an account exists for this email, we sent a new code.");
      startResendCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setBusy(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!supabase) {
      setError("Authentication is not configured.");
      return;
    }
    const v = validateNewPassword(newPassword);
    if (v) {
      setError(v);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const errMsg = await updatePasswordFromRecoverySession(supabase, newPassword);
      if (errMsg) throw new Error(errMsg);
      await supabase.auth.signOut();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  const goBackToEmail = () => {
    setError(null);
    setInfo(null);
    setOtp("");
    setStep("email");
  };

  const title =
    step === "email"
      ? "Reset password"
      : step === "otp"
        ? "Enter verification code"
        : "Choose a new password";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[200] bg-black/50" />
        <DialogPrimitive.Content
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-[200] grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-lg duration-200"
          onOpenAutoFocus={(ev) => ev.preventDefault()}
        >
          <div className="flex flex-col gap-1 pr-8">
            <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-gray-500">
              {step === "email"
                ? "We will email a 6-digit code to reset your password."
                : step === "otp"
                  ? `Enter the code sent to ${email.trim() || "your email"}.`
                  : "Use at least 8 characters with one uppercase letter and one number."}
            </DialogPrimitive.Description>
          </div>

          <DialogPrimitive.Close
            type="button"
            className="absolute top-4 right-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {info ? <p className="text-sm text-green-600">{info}</p> : null}

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-[#f97316]/30"
                  placeholder="you@restaurant.com"
                />
              </div>
              <button type="submit" disabled={busy} className={primaryButtonClassName}>
                {busy ? "Please wait…" : "Send code"}
              </button>
            </form>
          ) : null}

          {step === "otp" ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-center">
                <OTPInput
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={otp}
                  onChange={setOtp}
                  disabled={busy}
                  containerClassName="flex flex-col items-center gap-2"
                >
                  <div className="flex gap-1">
                    {Array.from({ length: 6 }, (_, i) => (
                      <OtpSlot key={i} index={i} />
                    ))}
                  </div>
                </OTPInput>
              </div>
              <button type="submit" disabled={busy} className={primaryButtonClassName}>
                {busy ? "Please wait…" : "Verify code"}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  className="font-semibold text-[#f97316] hover:text-[#ea580c] disabled:opacity-50"
                  disabled={busy || resendCooldown > 0}
                  onClick={() => void handleResend()}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  disabled={busy}
                  onClick={goBackToEmail}
                >
                  Change email
                </button>
              </div>
            </form>
          ) : null}

          {step === "password" ? (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">New password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-gray-900 outline-none focus:ring-2 focus:ring-[#f97316]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-gray-900 outline-none focus:ring-2 focus:ring-[#f97316]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={busy} className={primaryButtonClassName}>
                {busy ? "Please wait…" : "Update password"}
              </button>
            </form>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
