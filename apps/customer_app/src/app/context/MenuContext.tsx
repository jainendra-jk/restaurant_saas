import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";
import { useCustomerSession } from "./CustomerSessionContext";
import type {
  MenuItem,
  Category,
  Branding,
  DietType,
  PortionSize,
  ConfigVariant,
  ConfigPalette,
} from "../components/shared/menu-data";

export interface TaxRule {
  name: string;
  percent: number;
}

const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  indian: "🍛",
  oriental: "🥢",
  continental: "🍝",
  desserts: "🍮",
};

const VARIANT_TO_PORTION: Record<string, PortionSize> = {
  qtr: "quarter",
  half: "half",
  full: "full",
};

function getCategoryIcon(categoryId: string): string {
  return DEFAULT_CATEGORY_ICONS[categoryId] ?? "📋";
}

function dietToIsVeg(diet: DietType): boolean {
  return diet === "veg" || diet === "egg";
}

function variantsToPricesAndPortions(variants: ConfigVariant[]): {
  price: number;
  priceHalf?: number;
  priceQuarter?: number;
  availablePortions: PortionSize[];
} {
  const order = ["qtr", "half", "full"];
  const availablePortions = order
    .filter((t) => variants.some((v: { type: string }) => v.type === t))
    .map((t) => VARIANT_TO_PORTION[t]);
  const full = variants.find((v: { type: string }) => v.type === "full");
  const half = variants.find((v: { type: string }) => v.type === "half");
  const qtr = variants.find((v: { type: string }) => v.type === "qtr");
  return {
    price: (full as ConfigVariant)?.price ?? 0,
    priceHalf: (half as ConfigVariant)?.price,
    priceQuarter: (qtr as ConfigVariant)?.price,
    availablePortions: availablePortions.length ? availablePortions : ["full"],
  };
}

function applyPalette(palette: ConfigPalette) {
  if (typeof document === "undefined" || !palette) return;
  const root = document.documentElement;
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--secondary", palette.secondary);
  root.style.setProperty("--background", palette.background);
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--card", "#FFFDF8");
  root.style.setProperty("--foreground", "#3D3D3D");
  root.style.setProperty("--primary-foreground", "#FFFFFF");
  root.style.setProperty("--secondary-foreground", "#FFFFFF");
  root.style.setProperty("--muted", "#EDE8DC");
  root.style.setProperty("--muted-foreground", "#7A7A6E");
  root.style.setProperty("--accent-foreground", "#3D3D3D");
  root.style.setProperty("--border", `${palette.primary}33`);
}

const DEFAULT_BRANDING: Branding = {
  restaurantName: "Menu",
  tagline: "Restaurant & Bar",
  welcomeMessage: "Welcome",
  preparingMessage: "Preparing your menu…",
  orderNumberPrefix: "ORD",
};

interface MenuState {
  categories: Category[];
  menuItems: MenuItem[];
  branding: Branding;
  currency: string;
  taxRules: TaxRule[];
  /** Address lines for receipt header (from restaurants table). */
  billingAddressLines: string[];
  /** Phone for receipt header (from restaurants table). */
  billingPhone: string;
  billingGstNumber: string;
  billingFssaiNumber: string;
  loading: boolean;
  error: string | null;
  restaurantId: string | null;
  /** Updated when a realtime-triggered refetch occurs (used for UI banner). */
  menuUpdatedAt: string | null;
}

const MenuContext = createContext<MenuState | null>(null);

// Static fallback from bundled JSON
import staticMenuConfig from "../../data/menu-config.json";

function getStaticMenuState(): MenuState {
  const raw = staticMenuConfig as {
    palette?: ConfigPalette;
    categories?: Array<{ id: string; name: string; items: Array<Record<string, unknown>> }>;
    branding?: Partial<Branding>;
    currency?: string;
  };
  if (raw.palette) applyPalette(raw.palette);
  const cats = Array.isArray(raw.categories) ? raw.categories : [];
  const categoriesWithItems = cats.filter(
    (c) => Array.isArray(c.items) && c.items.length > 0
  );
  const categories: Category[] = categoriesWithItems.map((c) => ({
    id: c.id,
    name: c.name,
    icon: getCategoryIcon(c.id),
  }));
  const menuItems: MenuItem[] = categoriesWithItems.flatMap((cat) =>
    (cat.items as Array<{ id: string; name: string; diet: DietType; description: string; variants: ConfigVariant[]; options?: string[] }>).map((item) => {
      const { price, priceHalf, priceQuarter, availablePortions } =
        variantsToPricesAndPortions(item.variants ?? []);
      return {
        id: `${cat.id}-${item.id}`,
        name: item.name,
        description: item.description ?? "",
        price,
        priceHalf,
        priceQuarter,
        isVeg: dietToIsVeg(item.diet),
        category: cat.id,
        availablePortions,
        diet: item.diet,
        options: item.options,
      };
    })
  );
  const branding: Branding = raw.branding
    ? { ...DEFAULT_BRANDING, ...raw.branding }
    : DEFAULT_BRANDING;
  return {
    categories,
    menuItems,
    branding,
    currency: (raw.currency ?? "₹").trim(),
    taxRules: [],
    billingAddressLines: [],
    billingPhone: "",
    billingGstNumber: "",
    billingFssaiNumber: "",
    loading: false,
    error: null,
    restaurantId: null,
    menuUpdatedAt: null,
  };
}

type RestRow = {
  id: string;
  name: string;
  branding: unknown;
  palette: unknown;
  currency: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  gst_number?: string | null;
  fssai_number?: string | null;
};

function getTenantUnavailableState(message: string): MenuState {
  return {
    categories: [],
    menuItems: [],
    branding: DEFAULT_BRANDING,
    currency: "₹",
    taxRules: [],
    billingAddressLines: [],
    billingPhone: "",
    billingGstNumber: "",
    billingFssaiNumber: "",
    loading: false,
    error: message,
    restaurantId: null,
    menuUpdatedAt: null,
  };
}

function getTenantLoadingState(): MenuState {
  return {
    categories: [],
    menuItems: [],
    // Empty name is a sentinel so screens can show a generic title
    branding: { ...DEFAULT_BRANDING, restaurantName: "" },
    currency: "₹",
    taxRules: [],
    billingAddressLines: [],
    billingPhone: "",
    billingGstNumber: "",
    billingFssaiNumber: "",
    loading: true,
    error: null,
    restaurantId: null,
    menuUpdatedAt: null,
  };
}

function cleanLine(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

function buildBillingAddressLines(rest: RestRow): string[] {
  const lines: string[] = [];
  const line1 = cleanLine(rest.address_line1);
  if (line1) lines.push(line1);

  const city = cleanLine(rest.city);
  const state = cleanLine(rest.state);
  const pincode = cleanLine(rest.pincode);

  const cityState = [city, state].filter(Boolean).join(", ");
  const line2 = [cityState, pincode].filter(Boolean).join(" - ");
  if (line2) lines.push(line2);

  return lines;
}

async function fetchMenuStateForRestaurant(rest: RestRow, supa: NonNullable<typeof supabase>): Promise<MenuState> {
  const { data: cats } = await supa
    .from("menu_categories")
    .select("id, slug, name, sort_order")
    .eq("restaurant_id", rest.id)
    .order("sort_order");

  const brandingObj = (rest.branding as Record<string, unknown>) ?? {};
  const taxRulesRaw = brandingObj.taxRules;
  const taxRules: TaxRule[] = Array.isArray(taxRulesRaw)
    ? taxRulesRaw
        .filter(
          (r): r is TaxRule =>
            !!r &&
            typeof (r as TaxRule).name === "string" &&
            typeof (r as TaxRule).percent === "number" &&
            (r as TaxRule).name.trim() !== ""
        )
        .map((r) => ({ name: r.name.trim(), percent: r.percent }))
    : [];

  const billingGstNumber =
    cleanLine(rest.gst_number) ??
    cleanLine(
      typeof brandingObj.gstNumber === "string" ? brandingObj.gstNumber : undefined
    ) ??
    "";
  const billingFssaiNumber =
    cleanLine(rest.fssai_number) ??
    cleanLine(
      typeof brandingObj.fssaiNumber === "string" ? brandingObj.fssaiNumber : undefined
    ) ??
    "";

  if (!cats?.length) {
    const branding = (rest.branding as Partial<Branding>) ?? {};
    // No `?? {}`: an empty object is not a ConfigPalette, and the
    // non-empty check below would still let a PARTIAL palette through.
    const pal = rest.palette as ConfigPalette | undefined;
    if (pal && Object.keys(pal).length) applyPalette(pal);
    const billingAddressLines = buildBillingAddressLines(rest);
    const billingPhone = cleanLine(rest.phone) ?? "";
    return {
      categories: [],
      menuItems: [],
      branding: { ...DEFAULT_BRANDING, ...branding, restaurantName: rest.name },
      currency: (rest.currency as string) ?? "₹",
      taxRules,
      billingAddressLines,
      billingPhone,
      billingGstNumber,
      billingFssaiNumber,
      loading: false,
      error: null,
      restaurantId: rest.id,
      menuUpdatedAt: null,
    };
  }

  const catIds = cats.map((c) => c.id);
  const { data: items } = await supa
    .from("menu_items")
    .select("id, category_id, slug, name, diet, description, variants, options, is_available")
    .in("category_id", catIds)
    .eq("is_available", true)
    .order("sort_order");

  const allowedCatIds = new Set(catIds);
  const tenantItems = (items ?? []).filter((it) => allowedCatIds.has(it.category_id));

  const itemsByCat = tenantItems.reduce<Record<string, typeof items>>(
    (acc, it) => {
      const cid = it.category_id;
      if (!acc[cid]) acc[cid] = [];
      acc[cid]!.push(it);
      return acc;
    },
    {}
  );

  const categoryIdsWithItems = new Set(
    Object.entries(itemsByCat)
      .filter(([, list]) => Array.isArray(list) && list.length > 0)
      .map(([categoryId]) => categoryId)
  );
  const visibleCats = cats.filter((c) => categoryIdsWithItems.has(c.id));

  const categories: Category[] = visibleCats.map((c) => ({
    id: c.slug,
    name: c.name,
    icon: getCategoryIcon(c.slug),
  }));

  const menuItems: MenuItem[] = visibleCats.flatMap((cat) =>
    (itemsByCat[cat.id] ?? []).map((it) => {
      const variants = (it.variants as ConfigVariant[]) ?? [];
      const { price, priceHalf, priceQuarter, availablePortions } =
        variantsToPricesAndPortions(variants);
      return {
        id: `${cat.slug}-${it.slug}`,
        name: it.name,
        description: it.description ?? "",
        price,
        priceHalf,
        priceQuarter,
        isVeg: dietToIsVeg((it.diet as DietType) ?? "veg"),
        category: cat.slug,
        availablePortions,
        diet: (it.diet as DietType) ?? "veg",
        options: Array.isArray(it.options) ? it.options : undefined,
      };
    })
  );

  const branding = (rest.branding as Partial<Branding>) ?? {};
  // No `?? {}`: an empty object is not a ConfigPalette, and the
  // non-empty check below would still let a PARTIAL palette through.
  const pal = rest.palette as ConfigPalette | undefined;
  if (pal && Object.keys(pal).length) applyPalette(pal);
  const billingAddressLines = buildBillingAddressLines(rest);
  const billingPhone = cleanLine(rest.phone) ?? "";

  return {
    categories,
    menuItems,
    branding: { ...DEFAULT_BRANDING, ...branding, restaurantName: rest.name },
    currency: (rest.currency as string) ?? "₹",
    taxRules,
    billingAddressLines,
    billingPhone,
    billingGstNumber,
    billingFssaiNumber,
    loading: false,
    error: null,
    restaurantId: rest.id,
    menuUpdatedAt: null,
  };
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const { slug } = useCustomerSession();
  const [state, setState] = useState<MenuState | null>(() =>
    slug ? getTenantLoadingState() : getStaticMenuState()
  );

  useEffect(() => {
    if (!slug) {
      setState(getStaticMenuState());
      return;
    }
    if (!supabase) {
      setState(getTenantUnavailableState("Menu service is unavailable for this restaurant."));
      return;
    }

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let hasHydratedOnce = false;
    /** Restaurant id resolved from the slug, reused by the focus handler. */
    const resolvedRestaurantIdRef = { current: null as string | null };
    let pollInterval: ReturnType<typeof window.setInterval> | null = null;
    let subscribeWatchdog: ReturnType<typeof window.setTimeout> | null = null;

    // Tenant routes should NOT flash the bundled static menu branding (e.g. "OONA").
    // Start from a tenant loading state and swap in the real restaurant name as soon as we fetch it.
    setState((s) => (s ? { ...s, loading: true, error: null } : getTenantLoadingState()));

    const refetchByRestaurantId = async (restaurantId: string) => {
      const { data: rest } = await supabase
        .from("restaurants")
        .select(
          "id, name, branding, palette, currency, address_line1, city, state, pincode, phone, gst_number, fssai_number"
        )
        .eq("id", restaurantId)
        .maybeSingle();
      if (cancelled || !rest) return;
      try {
        const next = await fetchMenuStateForRestaurant(rest as RestRow, supabase);
        if (!cancelled) {
          hasHydratedOnce = true;
          setState(next);
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            ...getStaticMenuState(),
            error: e instanceof Error ? e.message : "Failed to load menu",
            restaurantId: rest.id,
            taxRules: [],
            menuUpdatedAt: null,
          });
        }
      }
    };

    (async () => {
      const { data: rest, error: restErr } = await supabase
        .from("restaurants")
        .select(
          "id, name, branding, palette, currency, address_line1, city, state, pincode, phone, gst_number, fssai_number"
        )
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (restErr || !rest) {
        setState(getTenantUnavailableState("Restaurant menu not found."));
        return;
      }

      // Set the exact restaurant name ASAP so the loading animation shows the right tenant.
      // Keep loading=true until we fetch categories/items.
      setState((prev) => {
        const base = prev ?? getTenantLoadingState();
        const restBranding = (rest.branding as Partial<Branding>) ?? {};
        const currency = (rest.currency as string | null) ?? base.currency;
        return {
          ...base,
          currency,
          restaurantId: rest.id,
          loading: true,
          error: null,
          branding: {
            ...DEFAULT_BRANDING,
            ...restBranding,
            restaurantName: rest.name,
          },
        };
      });

      try {
        const next = await fetchMenuStateForRestaurant(rest as RestRow, supabase);
        if (cancelled) return;
        hasHydratedOnce = true;
        setState(next);
      } catch (e) {
        if (!cancelled) {
          setState({
            ...getTenantUnavailableState(
              e instanceof Error ? e.message : "Failed to load menu"
            ),
            error: e instanceof Error ? e.message : "Failed to load menu",
            restaurantId: rest.id,
            taxRules: [],
          });
        }
        return;
      }

      const rid = rest.id;
      resolvedRestaurantIdRef.current = rid;
      let refetchTimer: ReturnType<typeof window.setTimeout> | null = null;
      const scheduleRefetch = () => {
        if (cancelled) return;
        if (hasHydratedOnce) {
          setState((prev) => (prev ? { ...prev, menuUpdatedAt: new Date().toISOString() } : prev));
        }
        if (refetchTimer) window.clearTimeout(refetchTimer);
        refetchTimer = window.setTimeout(() => {
          if (!cancelled) void refetchByRestaurantId(rid);
        }, 300);
      };

      const startPollingFallback = (reason: string) => {
        if (pollInterval) return;
        console.warn("[menu] realtime not subscribed; starting polling fallback", {
          restaurantId: rid,
          reason,
        });
        pollInterval = window.setInterval(() => {
          if (!cancelled) void refetchByRestaurantId(rid);
        }, 15000);
      };
      const stopPollingFallback = () => {
        if (pollInterval) {
          window.clearInterval(pollInterval);
          pollInterval = null;
        }
      };

      channel = supabase
        .channel(`customer-menu-${rid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "restaurants",
            filter: `id=eq.${rid}`,
          },
          () => {
            scheduleRefetch();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "menu_categories",
            filter: `restaurant_id=eq.${rid}`,
          },
          () => {
            scheduleRefetch();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "menu_items",
          },
          () => {
            // `menu_items` has no restaurant_id, so this subscription is
            // necessarily unfiltered and fires for other tenants too. The
            // previous implementation spent up to two extra round-trips trying to
            // decide whether the change belonged to this restaurant, then called
            // scheduleRefetch() on every branch regardless — including the
            // "confirmed to be another tenant" branch. Dropping the lookups keeps
            // behaviour identical while removing two queries per event.
            // scheduleRefetch() is itself debounced and re-reads the whole menu.
            scheduleRefetch();
          }
        )
        .subscribe((status) => {
          console.info("[menu] realtime channel status", { restaurantId: rid, status });
          if (status === "SUBSCRIBED") {
            stopPollingFallback();
            if (subscribeWatchdog) {
              window.clearTimeout(subscribeWatchdog);
              subscribeWatchdog = null;
            }
            return;
          }
          if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
            startPollingFallback(status);
          }
        });

      // If websockets/replication are blocked, still refresh periodically.
      subscribeWatchdog = window.setTimeout(() => {
        startPollingFallback("watchdog_timeout");
      }, 5000);
    })();

    // Refresh on focus, but reuse the already-resolved restaurant id instead of
    // re-querying by slug, and throttle: mobile browsers fire `focus` on every
    // keyboard dismissal and app switch, and each one used to cost a slug lookup
    // plus a full menu refetch.
    const FOCUS_REFETCH_MIN_INTERVAL_MS = 30_000;
    let lastFocusRefetchAt = Date.now();
    const onFocus = () => {
      const rid = resolvedRestaurantIdRef.current;
      if (!rid || cancelled) return;
      const now = Date.now();
      if (now - lastFocusRefetchAt < FOCUS_REFETCH_MIN_INTERVAL_MS) return;
      lastFocusRefetchAt = now;
      void refetchByRestaurantId(rid);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      if (pollInterval) window.clearInterval(pollInterval);
      if (subscribeWatchdog) window.clearTimeout(subscribeWatchdog);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [slug]);

  const value = state ?? (slug ? getTenantLoadingState() : getStaticMenuState());

  return (
    <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
  );
}

export function useMenu(): MenuState {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}

export function useAppCurrency(): string {
  const ctx = useContext(MenuContext);
  return ctx?.currency ?? "₹";
}
