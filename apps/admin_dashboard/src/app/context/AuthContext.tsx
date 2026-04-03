import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { supabase, hasSupabase, setRememberMeCookieMode } from '../../lib/supabase';
import { closeStoreAndDeactivateTables, openStore } from '../utils/storeStatus';
import { createLastTabLogoutController } from '../utils/lastTabLogout';

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

interface AuthState {
  user: { id: string; email?: string } | null;
  restaurant: RestaurantInfo | null;
  /** Supabase access JWT for calling apps/api (Bearer). */
  accessToken: string | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
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
    if (!profile?.restaurant_id) return;
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
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      setAccessToken(session?.access_token ?? null);
      if (session?.user) {
        fetchRestaurant(session.user.id);
      } else {
        setRestaurant(null);
      }
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      setAccessToken(session?.access_token ?? null);
      if (session?.user) {
        fetchRestaurant(session.user.id);
      } else {
        setRestaurant(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchRestaurant]);

  const signIn = useCallback(
    async (email: string, password: string, rememberMe: boolean = true) => {
      if (!supabase) return { error: new Error('Supabase not configured') };
      setRememberMeCookieMode(rememberMe);

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData.session?.user?.id;
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

  const signOut = useCallback(async () => {
    if (supabase && restaurant?.id) {
      try {
        await closeStoreAndDeactivateTables(supabase, restaurant.id);
      } catch (e) {
        console.error('Failed to close store on logout', e);
      }
    }
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setRestaurant(null);
    setAccessToken(null);
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

  const value: AuthState = {
    user,
    restaurant,
    accessToken,
    loading,
    signIn,
    signOut,
    setSessionTimeoutMinutes,
  };

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
