import { supabase } from '../../lib/supabase';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Customer app origin for QR links (local-first). */
export function getCustomerAppOriginFromEnv(): string {
  const raw =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CUSTOMER_APP_ORIGIN) ||
    '';
  const t = String(raw).trim().replace(/\/+$/, '');
  return t || 'http://localhost:5175';
}

export interface OnboardingFormData {
  restaurantName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  fssaiNumber: string;
  tables: string;
  password: string;
}

export interface PersistOnboardingResult {
  error: string | null;
  restaurantId: string | null;
  accessToken: string | null;
  /** True when Supabase did not return a session (e.g. email confirmation required). PDF/QR/API steps must be skipped or deferred. */
  needsEmailConfirmation: boolean;
}

export interface PersistOnboardingOptions {
  /** Use existing Supabase session instead of signUp (billing funnel). */
  skipAuthSignup?: boolean;
  /** Fixed table count from plan tier. */
  tableCountOverride?: number;
}

export async function persistOnboardingToSupabase(
  formData: OnboardingFormData,
  options?: PersistOnboardingOptions
): Promise<PersistOnboardingResult> {
  if (!supabase) {
    return {
      error: 'Supabase not configured',
      restaurantId: null,
      accessToken: null,
      needsEmailConfirmation: false,
    };
  }

  const slug = slugify(formData.restaurantName) || 'restaurant-' + Date.now();
  const tableCount =
    typeof options?.tableCountOverride === 'number' && options.tableCountOverride > 0
      ? Math.min(50, Math.max(1, options.tableCountOverride))
      : Math.min(50, Math.max(1, parseInt(formData.tables, 10) || 5));
  const customerAppOrigin = getCustomerAppOriginFromEnv();

  let accessToken: string | null;
  let needsEmailConfirmation = false;
  let shouldUpdatePasswordFromSession = false;
  let effectiveEmail = formData.email.trim();

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const session = sessionData.session;
  const hasSessionUser = Boolean(!sessionErr && session?.user);

  if (options?.skipAuthSignup || hasSessionUser) {
    if (!session?.user) {
      return {
        error: 'You must be signed in to complete onboarding.',
        restaurantId: null,
        accessToken: null,
        needsEmailConfirmation: false,
      };
    }
    const sessionEmail = session.user.email?.trim().toLowerCase() ?? '';
    const formEmail = formData.email.trim().toLowerCase();
    if (sessionEmail.length > 0 && formEmail.length > 0 && sessionEmail !== formEmail) {
      return {
        error: 'Email must match your signed-in account.',
        restaurantId: null,
        accessToken: null,
        needsEmailConfirmation: false,
      };
    }
    effectiveEmail = formData.email.trim() || session.user.email?.trim() || '';
    accessToken = session.access_token ?? null;
    needsEmailConfirmation = false;
    shouldUpdatePasswordFromSession = Boolean(formData.password.trim());
  } else {
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });
    if (authErr) {
      return {
        error: authErr.message,
        restaurantId: null,
        accessToken: null,
        needsEmailConfirmation: false,
      };
    }
    const uid = authData.user?.id;
    if (!uid) {
      return {
        error: 'Sign up failed',
        restaurantId: null,
        accessToken: null,
        needsEmailConfirmation: false,
      };
    }
    const session = authData.session;
    accessToken = session?.access_token ?? null;
    needsEmailConfirmation = !session;
    if (!session) {
      // Email confirmation is required — return success with needsEmailConfirmation: true
      // so the caller can display an OTP step rather than blocking with a hard error.
      return {
        error: null,
        restaurantId: null,
        accessToken: null,
        needsEmailConfirmation: true,
      };
    }
  }

  const { data: onboardingData, error: onboardingErr } = await supabase.rpc('complete_onboarding', {
    p_restaurant_name: formData.restaurantName,
    p_slug_base: slug,
    p_customer_app_origin: customerAppOrigin,
    p_owner_name: formData.ownerName.trim() || null,
    p_phone: formData.phone.trim() || null,
    p_email: effectiveEmail || null,
    p_address_line1: formData.address.trim() || null,
    p_city: formData.city.trim() || null,
    p_state: formData.state.trim() || null,
    p_pincode: formData.pincode.trim() || null,
    p_gst_number: formData.gstNumber.trim() || null,
    p_fssai_number: formData.fssaiNumber.trim() || null,
    p_requested_tables: tableCount,
  });

  if (onboardingErr) {
    const msg = onboardingErr.message || 'Onboarding failed';
    return {
      error: msg,
      restaurantId: null,
      accessToken,
      needsEmailConfirmation,
    };
  }

  const restaurantId =
    onboardingData && typeof onboardingData === 'object' && 'restaurant_id' in onboardingData
      ? String((onboardingData as { restaurant_id?: unknown }).restaurant_id ?? '')
      : '';
  if (!restaurantId) {
    return {
      error: 'Failed to create restaurant',
      restaurantId: null,
      accessToken,
      needsEmailConfirmation,
    };
  }

  if (shouldUpdatePasswordFromSession) {
    const { error: pwdErr } = await supabase.auth.updateUser({
      password: formData.password,
    });
    if (pwdErr) {
      return {
        error: `Onboarding completed, but password was not saved: ${pwdErr.message}`,
        restaurantId,
        accessToken,
        needsEmailConfirmation,
      };
    }
  }

  return {
    error: null,
    restaurantId,
    accessToken,
    needsEmailConfirmation,
  };
}
