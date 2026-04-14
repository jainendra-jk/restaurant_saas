import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { supabase, hasSupabase, setRememberMePreference } from '../../lib/supabase';
import { closeStoreAndDeactivateTables, openStore } from '../utils/storeStatus';
import { createLastTabLogoutController } from '../utils/lastTabLogout';
import { writeLoginBrandingCache } from '../utils/loginBrandingCache';

export interface RestaurantInfo {
  id: string;
  slug: string;
  name: string;
  branding: Record<string, unknown>;
  palette: Record<string, string>;
  currency: string;
  /** Per-tenant customer app base URL for QR/order links */
  customerAppOrigin: string | null;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstNumber: string | null;
  fssaiNumber: string | null;
  isOpen: boolean;
  sessionTimeoutMinutes: number;
}

export type AccessState = 'ready' | 'no_subscription' | 'onboarding_incomplete';

interface AuthState {
  user: { id: string; email?: string } | null;
  restaurant: RestaurantInfo | null;
  hasActiveEntitlement: boolean;
  hasCompletedOnboarding: boolean;
  accessState: AccessState;
  /** Supabase access JWT for calling apps/api (Bearer). */
  accessToken: string | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: (
    redirectPath?: string,
    rememberMe?: boolean
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setSessionTimeoutMinutes: (minutes: number) => void;
}

const AuthContext = createContext<AuthState | null>(null);

function normalizeText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [hasActiveEntitlement, setHasActiveEntitlement] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivityAt, setLastActivityAt] = useState<number>(() => Date.now());

  const fetchRestaurant = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('restaurant_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profile?.restaurant_id) {
      setHasCompletedOnboarding(false);
      setRestaurant(null);
      return;
    }
    setHasCompletedOnboarding(true);
    const { data: rest } = await supabase
      .from('restaurants')
      .select(
        'id, slug, name, branding, palette, currency, customer_app_origin, owner_name, phone, email, address_line1, city, state, pincode, gst_number, fssai_number, is_open, session_timeout_minutes'
      )
      .eq('id', profile.restaurant_id)
      .single();
    if (rest) {
      const pal = (rest.palette as Record<string, string>) ?? {};
      const branding = (rest.branding as Record<string, unknown>) ?? {};
      setRestaurant({
        id: rest.id,
        slug: rest.slug,
        name: rest.name,
        branding,
        palette: {
          primary: pal.primary ?? '#f97316',
          secondary: pal.secondary ?? '#ea580c',
          background: pal.background ?? '#f8f9fb',
          accent: pal.accent ?? '#fff7ed',
        },
        currency: rest.currency ?? 'Rs',
        customerAppOrigin:
          typeof rest.customer_app_origin === 'string' && rest.customer_app_origin.trim()
            ? rest.customer_app_origin.trim().replace(/\/+$/, '')
            : null,
        ownerName: normalizeText(rest.owner_name) ?? normalizeText(branding.ownerName),
        phone: normalizeText(rest.phone) ?? normalizeText(branding.phone),
        email: normalizeText(rest.email),
        addressLine1: normalizeText(rest.address_line1) ?? normalizeText(branding.address),
        city: normalizeText(rest.city),
        state: normalizeText(rest.state),
        pincode: normalizeText(rest.pincode),
        gstNumber: normalizeText(rest.gst_number) ?? normalizeText(branding.gstNumber),
        fssaiNumber:
          normalizeText(rest.fssai_number) ?? normalizeText(branding.fssaiNumber),
        isOpen: rest.is_open !== false,
        sessionTimeoutMinutes: Number(rest.session_timeout_minutes) || 60,
      });
      return;
    }
    setRestaurant(null);
  }, []);

  const fetchEntitlement = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('saas_entitlements')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    const status = data?.status;
    setHasActiveEntitlement(status === 'active' || status === 'trialing');
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      setAccessToken(session?.access_token ?? null);
      if (session?.user) {
        await Promise.all([fetchRestaurant(session.user.id), fetchEntitlement(session.user.id)]);
      } else {
        setRestaurant(null);
        setHasCompletedOnboarding(false);
        setHasActiveEntitlement(false);
      }
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      setAccessToken(session?.access_token ?? null);
      if (session?.user) {
        await Promise.all([fetchRestaurant(session.user.id), fetchEntitlement(session.user.id)]);
      } else {
        setRestaurant(null);
        setHasCompletedOnboarding(false);
        setHasActiveEntitlement(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchEntitlement, fetchRestaurant]);

  useEffect(() => {
    if (!restaurant) return;
    const b = restaurant.branding;
    const tagline = typeof b.tagline === 'string' ? b.tagline.trim() : '';
    const welcomeRaw = typeof b.welcomeMessage === 'string' ? b.welcomeMessage.trim() : '';
    writeLoginBrandingCache({
      restaurantName: restaurant.name.trim(),
      tagline,
      welcomeMessage: welcomeRaw || 'Welcome back',
    });
  }, [restaurant]);

  const signIn = useCallback(
    async (email: string, password: string, rememberMe: boolean = true) => {
      if (!supabase) return { error: new Error('Supabase not configured') };
      setRememberMePreference(rememberMe);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        try {
          const userId = data.session?.user?.id;
          if (userId) {
            const { data: profile } = await supabase
              .from('staff_profiles')
              .select('restaurant_id')
              .eq('user_id', userId)
              .maybeSingle();
            if (profile?.restaurant_id) {
              await openStore(supabase, profile.restaurant_id);
            }
          }
        } catch (e) {
          console.error('Failed to auto-open store after login', e);
        }
      }
      return { error: error ?? null };
    },
    []
  );

  const signInWithGoogle = useCallback(
    async (redirectPath?: string, rememberMe: boolean = true) => {
      if (!supabase) return { error: new Error('Supabase not configured') };
      setRememberMePreference(rememberMe);
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : import.meta.env.VITE_ADMIN_DASHBOARD_ORIGIN?.trim() || '';
      const safePath =
        typeof redirectPath === 'string' &&
        redirectPath.startsWith('/') &&
        !redirectPath.startsWith('//') &&
        !redirectPath.includes('://')
          ? redirectPath
          : '/login';
      const redirectTo = origin ? `${origin}${safePath}` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo } : undefined,
      });
      return { error: error ?? null };
    },
    []
  );

  const signOut = useCallback(async () => {
    const restaurantId = restaurant?.id ?? null;
    const client = supabase;

    // Optimistically clear client auth state so route guards react immediately.
    setUser(null);
    setRestaurant(null);
    setAccessToken(null);
    setHasCompletedOnboarding(false);
    setHasActiveEntitlement(false);

    if (!client) return;

    if (restaurantId) {
      try {
        await closeStoreAndDeactivateTables(client, restaurantId);
      } catch (e) {
        console.error('Failed to close store on logout', e);
      }
    }

    const { error } = await client.auth.signOut();
    if (error) {
      console.error('Failed to sign out from auth provider', error);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    if (!user) return;
    const markActivity = () => setLastActivityAt(Date.now());
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'visibilitychange'];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity));
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !restaurant) return;
    const timeoutMs = restaurant.sessionTimeoutMinutes * 60 * 1000;
    if (timeoutMs <= 0) return;
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityAt >= timeoutMs) {
        toast.info('Logged out due to inactivity.', { closeButton: false });
        signOut().catch((e) => console.error('Auto logout failed', e));
      }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [lastActivityAt, restaurant, signOut, user?.id]);

  useEffect(() => {
    if (!user?.id || !accessToken) return;
    const controller = createLastTabLogoutController(accessToken);
    controller.start();
    return () => controller.stop();
  }, [accessToken, user?.id]);

  const setSessionTimeoutMinutes = useCallback((minutes: number) => {
    setRestaurant((prev) => {
      if (!prev) return prev;
      return { ...prev, sessionTimeoutMinutes: Math.max(0, Math.min(240, Math.floor(minutes))) };
    });
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    restaurant,
    hasActiveEntitlement,
    hasCompletedOnboarding,
    accessState: !hasActiveEntitlement
      ? 'no_subscription'
      : hasCompletedOnboarding
        ? 'ready'
        : 'onboarding_incomplete',
    accessToken,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    setSessionTimeoutMinutes,
  }), [
    user,
    restaurant,
    hasActiveEntitlement,
    hasCompletedOnboarding,
    accessToken,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    setSessionTimeoutMinutes,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthOptional(): AuthState | null {
  return useContext(AuthContext);
}

/** When Supabase is configured, auth is required. When not, allow all. */
export function requiresAuth(): boolean {
  return hasSupabase;
}
