import type { SupabaseClient } from "@supabase/supabase-js";

/** Same rules as onboarding_flow password validation. */
export function validateNewPassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Include at least one number";
  return null;
}

export async function requestPasswordResetEmail(
  client: SupabaseClient,
  email: string,
  redirectTo: string | undefined
): Promise<string | null> {
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectTo?.trim() || undefined,
  });
  return error ? error.message : null;
}

export async function verifyRecoveryOtp(
  client: SupabaseClient,
  email: string,
  token: string
): Promise<string | null> {
  const { error } = await client.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "recovery",
  });
  return error ? error.message : null;
}

export async function updatePasswordFromRecoverySession(
  client: SupabaseClient,
  newPassword: string
): Promise<string | null> {
  const { error } = await client.auth.updateUser({ password: newPassword });
  return error ? error.message : null;
}

/**
 * Resend recovery email. Uses the same API as the initial send (reliable across Supabase versions).
 */
export async function resendRecoveryEmail(
  client: SupabaseClient,
  email: string,
  redirectTo: string | undefined
): Promise<string | null> {
  return requestPasswordResetEmail(client, email, redirectTo);
}
