import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
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
  preparingMessage: "Preparing your menu experience",
  orderNumberPrefix: "ORD",
};

interface MenuState {
  categories: Category[];
  menuItems: MenuItem[];
  branding: Branding;
  currency: string;
  loading: boolean;
  error: string | null;
  restaurantId: string | null;
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
    loading: false,
    error: null,
    restaurantId: null,
  };
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const { slug } = useCustomerSession();
  const [state, setState] = useState<MenuState | null>(null);

  useEffect(() => {
    if (!supabase || !slug) {
      setState(getStaticMenuState());
      return;
    }

    let cancelled = false;
    setState((s) => (s ? { ...s, loading: true, error: null } : getStaticMenuState()));

    (async () => {
      const { data: rest, error: restErr } = await supabase
        .from("restaurants")
        .select("id, name, branding, palette, currency")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (restErr || !rest) {
        setState(getStaticMenuState());
        return;
      }

      const { data: cats } = await supabase
        .from("menu_categories")
        .select("id, slug, name, sort_order")
        .eq("restaurant_id", rest.id)
        .order("sort_order");

      if (cancelled || !cats?.length) {
        const branding = (rest.branding as Partial<Branding>) ?? {};
        const pal = (rest.palette as ConfigPalette) ?? {};
        if (Object.keys(pal).length) applyPalette(pal);
        setState({
          categories: [],
          menuItems: [],
          branding: { ...DEFAULT_BRANDING, ...branding, restaurantName: rest.name },
          currency: (rest.currency as string) ?? "₹",
          loading: false,
          error: null,
          restaurantId: rest.id,
        });
        return;
      }

      const catIds = cats.map((c) => c.id);
      const { data: items } = await supabase
        .from("menu_items")
        .select("id, category_id, slug, name, diet, description, variants, options, is_available")
        .in("category_id", catIds)
        .eq("is_available", true)
        .order("sort_order");

      if (cancelled) return;

      const itemsByCat = (items ?? []).reduce<Record<string, typeof items>>(
        (acc, it) => {
          const cid = it.category_id;
          if (!acc[cid]) acc[cid] = [];
          acc[cid]!.push(it);
          return acc;
        },
        {}
      );

      const categories: Category[] = cats.map((c) => ({
        id: c.slug,
        name: c.name,
        icon: getCategoryIcon(c.slug),
      }));

      const menuItems: MenuItem[] = cats.flatMap((cat) =>
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
      const pal = (rest.palette as ConfigPalette) ?? {};
      if (Object.keys(pal).length) applyPalette(pal);

      setState({
        categories,
        menuItems,
        branding: { ...DEFAULT_BRANDING, ...branding, restaurantName: rest.name },
        currency: (rest.currency as string) ?? "₹",
        loading: false,
        error: null,
        restaurantId: rest.id,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const value = state ?? getStaticMenuState();

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
