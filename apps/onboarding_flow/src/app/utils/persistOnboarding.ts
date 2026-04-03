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

export async function persistOnboardingToSupabase(
  formData: OnboardingFormData
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
  const tableCount = Math.min(50, Math.max(1, parseInt(formData.tables, 10) || 5));
  const customerAppOrigin = getCustomerAppOriginFromEnv();

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
  const userId = authData.user?.id;
  if (!userId) {
    return {
      error: 'Sign up failed',
      restaurantId: null,
      accessToken: null,
      needsEmailConfirmation: false,
    };
  }

  const session = authData.session;
  const accessToken = session?.access_token ?? null;
  const needsEmailConfirmation = !session;

  const branding: Record<string, string> = {
    tagline: '',
    welcomeMessage: 'Welcome back',
    orderNumberPrefix: '#',
  };

  const { data: restaurant, error: restErr } = await supabase
    .from('restaurants')
    .insert({
      slug,
      name: formData.restaurantName,
      customer_app_origin: customerAppOrigin,
      branding,
      owner_name: formData.ownerName.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address_line1: formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      pincode: formData.pincode.trim() || null,
      gst_number: formData.gstNumber.trim() || null,
      fssai_number: formData.fssaiNumber.trim() || null,
    })
    .select('id')
    .single();

  if (restErr) {
    return {
      error: restErr.message,
      restaurantId: null,
      accessToken,
      needsEmailConfirmation,
    };
  }
  if (!restaurant?.id) {
    return {
      error: 'Failed to create restaurant',
      restaurantId: null,
      accessToken,
      needsEmailConfirmation,
    };
  }

  const { error: profileErr } = await supabase.from('staff_profiles').insert({
    user_id: userId,
    restaurant_id: restaurant.id,
    role: 'owner',
  });
  if (profileErr) {
    return {
      error: profileErr.message,
      restaurantId: restaurant.id,
      accessToken,
      needsEmailConfirmation,
    };
  }

  const tables = Array.from({ length: tableCount }, (_, i) => ({
    restaurant_id: restaurant.id,
    number: i + 1,
    status: 'inactive',
    seats: i % 3 === 0 ? 6 : i % 3 === 1 ? 4 : 2,
  }));
  const { error: tablesErr } = await supabase.from('tables').insert(tables);
  if (tablesErr) {
    return {
      error: tablesErr.message,
      restaurantId: restaurant.id,
      accessToken,
      needsEmailConfirmation,
    };
  }

  return {
    error: null,
    restaurantId: restaurant.id,
    accessToken,
    needsEmailConfirmation,
  };
}
