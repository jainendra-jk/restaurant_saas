import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, hasSupabase } from '../../lib/supabase';

export interface RestaurantInfo {
  id: string;
  slug: string;
  name: string;
  branding: Record<string, unknown>;
  palette: Record<string, string>;
  currency: string;
}

interface AuthState {
  user: { id: string; email?: string } | null;
  restaurant: RestaurantInfo | null;
  /** Supabase access JWT for calling apps/api (Bearer). */
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      .select('id, slug, name, branding, palette, currency')
      .eq('id', profile.restaurant_id)
      .single();
    if (rest) {
      const pal = (rest.palette as Record<string, string>) ?? {};
      setRestaurant({
        id: rest.id,
        slug: rest.slug,
        name: rest.name,
        branding: (rest.branding as Record<string, unknown>) ?? {},
        palette: {
          primary: pal.primary ?? '#f97316',
          secondary: pal.secondary ?? '#ea580c',
          background: pal.background ?? '#f8f9fb',
          accent: pal.accent ?? '#fff7ed',
        },
        currency: rest.currency ?? 'Rs',
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
    async (email: string, password: string) => {
      if (!supabase) return { error: new Error('Supabase not configured') };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ?? null };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setRestaurant(null);
    setAccessToken(null);
  }, []);

  const value: AuthState = {
    user,
    restaurant,
    accessToken,
    loading,
    signIn,
    signOut,
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
