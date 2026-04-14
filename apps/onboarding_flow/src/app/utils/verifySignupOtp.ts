import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify a 6-digit signup OTP emailed by Supabase.
 * Returns null on success or an error message string on failure.
 */
export async function verifySignupOtp(
  supabase: SupabaseClient,
  email: string,
  token: string
): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });
  return error ? error.message : null;
}

/**
 * Resend the signup confirmation OTP to the given email.
 * Returns null on success or an error message string on failure.
 */
export async function resendSignupOtp(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });
  return error ? error.message : null;
}
