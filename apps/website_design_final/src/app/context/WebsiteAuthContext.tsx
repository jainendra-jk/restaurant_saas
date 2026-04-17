import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  owner_name: string | null;
  gst_number: string | null;
  fssai_number: string | null;
  logo_url: string | null;
  onboarding_details_completed_at: string | null;
  menu_import_completed_at: string | null;
  onboarding_completed_at: string | null;
};

export type SaasEntitlementRow = {
  user_id: string;
  plan_tier: string;
  max_tables: number;
  status: string;
  billing_provider: string | null;
  updated_at: string;
};

type StaffProfileRow = {
  restaurant_id: string;
  role: string;
  restaurants: RestaurantRow | null;
};

export type WebsiteAccessState = "ready" | "no_subscription" | "setup_incomplete";

type WebsiteAuthContextValue = {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  profileLoading: boolean;
  primaryRestaurant: RestaurantRow | null;
  restaurantStaffRole: string | null;
  entitlement: SaasEntitlementRow | null;
  hasActiveEntitlement: boolean;
  hasCompletedSetup: boolean;
  accessState: WebsiteAccessState;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  openLogin: () => void;
  postLoginRedirect: string | null;
  setPostLoginRedirect: (path: string | null) => void;
  refreshProfile: () => Promise<void>;
};

const WebsiteAuthContext = createContext<WebsiteAuthContextValue | null>(null);

export function WebsiteAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [primaryRestaurant, setPrimaryRestaurant] = useState<RestaurantRow | null>(null);
  const [restaurantStaffRole, setRestaurantStaffRole] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<SaasEntitlementRow | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [postLoginRedirect, setPostLoginRedirect] = useState<string | null>(null);

  const hasActiveEntitlement = Boolean(
    entitlement && (entitlement.status === "active" || entitlement.status === "trialing"),
  );
  const hasCompletedSetup = Boolean(primaryRestaurant?.menu_import_completed_at);
  const accessState: WebsiteAccessState = !hasActiveEntitlement
    ? "no_subscription"
    : hasCompletedSetup
      ? "ready"
      : "setup_incomplete";

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    setProfileLoading(true);
    try {
      const { data: staffRows, error: staffErr } = await supabase
        .from("staff_profiles")
        .select("restaurant_id, role, restaurants(*)")
        .eq("user_id", userId);
      if (staffErr) throw staffErr;

      const rows = (staffRows ?? []) as StaffProfileRow[];
      const owner = rows.find((r) => r.role === "owner");
      const pick = owner ?? rows[0] ?? null;
      setRestaurantStaffRole(pick?.role ?? null);
      setPrimaryRestaurant(pick?.restaurants ?? null);

      const { data: ent, error: entErr } = await supabase
        .from("saas_entitlements")
        .select("user_id, plan_tier, max_tables, status, billing_provider, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (entErr) throw entErr;
      setEntitlement((ent as SaasEntitlementRow) ?? null);
    } catch {
      setPrimaryRestaurant(null);
      setRestaurantStaffRole(null);
      setEntitlement(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) {
        setSession(s);
        setAuthLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setPrimaryRestaurant(null);
      setRestaurantStaffRole(null);
      setEntitlement(null);
      return;
    }
    loadProfile(uid);
  }, [session?.user?.id, loadProfile]);

  const openLogin = useCallback(() => {
    setPostLoginRedirect(null);
    setLoginOpen(true);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  }, [session?.user?.id, loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      authLoading,
      profileLoading,
      primaryRestaurant,
      restaurantStaffRole,
      entitlement,
      hasActiveEntitlement,
      hasCompletedSetup,
      accessState,
      loginOpen,
      setLoginOpen,
      openLogin,
      postLoginRedirect,
      setPostLoginRedirect,
      refreshProfile,
    }),
    [
      session,
      authLoading,
      profileLoading,
      primaryRestaurant,
      restaurantStaffRole,
      entitlement,
      hasActiveEntitlement,
      hasCompletedSetup,
      accessState,
      loginOpen,
      openLogin,
      postLoginRedirect,
      refreshProfile,
    ],
  );

  return <WebsiteAuthContext.Provider value={value}>{children}</WebsiteAuthContext.Provider>;
}

export function useWebsiteAuth() {
  const ctx = useContext(WebsiteAuthContext);
  if (!ctx) throw new Error("useWebsiteAuth must be used within WebsiteAuthProvider");
  return ctx;
}
