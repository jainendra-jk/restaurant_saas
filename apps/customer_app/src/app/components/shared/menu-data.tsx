/**
 * Menu data is loaded from src/data/menu-config.json.
 * Schema: palette (primary, secondary, background, accent) + categories with nested items.
 * Each item: id, name, diet (veg|nonveg|egg|seafood), description, variants [{ type: qtr|half|full, price }].
 * Optional branding can be included for restaurant name and messages.
 */

import menuConfig from "../../../data/menu-config.json";

// --- App-facing types (unchanged for CartContext, screens) ---

export type PortionSize = "quarter" | "half" | "full";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  priceHalf?: number;
  priceQuarter?: number;
  isVeg: boolean;
  category: string;
  /** Portions this item supports; used to show/hide capsule and which options to render. */
  availablePortions: PortionSize[];
  /** Raw diet from config for indicator: veg → green, egg → yellow, nonveg/seafood → red. */
  diet: DietType;
  /** Optional flavor/type choices (e.g. Sweet, Salted, Mango). When present, user must select one before adding to cart. */
  options?: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Branding {
  restaurantName: string;
  tagline: string;
  welcomeMessage: string;
  preparingMessage: string;
  orderNumberPrefix: string;
  /** Optional for PDF receipt. */
  address?: string;
  phone?: string;
  thankYouMessage?: string;
  vendorId?: string;
  paymentMethod?: string;
}

// --- Raw config schema ---

export type DietType = "veg" | "nonveg" | "egg" | "seafood";
export type VariantType = "qtr" | "half" | "full";

export interface ConfigVariant {
  type: VariantType;
  price: number;
}

export interface ConfigItem {
  id: string;
  name: string;
  diet: DietType;
  description: string;
  variants: ConfigVariant[];
  /** Optional selectable flavor/type options. When set, shown as chips; selection is stored with cart line. */
  options?: string[];
}

export interface ConfigCategory {
  id: string;
  name: string;
  items: ConfigItem[];
}

export interface ConfigPalette {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

export interface MenuConfigRaw {
  palette: ConfigPalette;
  categories: ConfigCategory[];
  branding?: Partial<Branding>;
  /** Currency display symbol, e.g. \"₹\", \"$\", \"€\". */
  currency?: string;
}

const raw = menuConfig as MenuConfigRaw;

// --- Apply palette to CSS variables (only when palette and document exist) ---

function applyPalette(palette: ConfigPalette) {
  if (typeof document === "undefined" || !palette) return;
  const root = document.documentElement;
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--secondary", palette.secondary);
  root.style.setProperty("--background", palette.background);
  root.style.setProperty("--accent", palette.accent);
  // Derive common theme vars from palette for consistency
  root.style.setProperty("--card", "#FFFDF8");
  root.style.setProperty("--foreground", "#3D3D3D");
  root.style.setProperty("--primary-foreground", "#FFFFFF");
  root.style.setProperty("--secondary-foreground", "#FFFFFF");
  root.style.setProperty("--muted", "#EDE8DC");
  root.style.setProperty("--muted-foreground", "#7A7A6E");
  root.style.setProperty("--accent-foreground", "#3D3D3D");
  root.style.setProperty("--border", `${palette.primary}33`);
}

if (raw.palette) applyPalette(raw.palette);

// --- Currency helpers (app-wide) ---

export const appCurrency: string = (raw.currency ?? "₹").trim();

/** App-wide display symbol from menu-config. Use this in menu, cart, checkout, and receipt. */
export function getAppCurrencySymbol(): string {
  return appCurrency || "₹";
}

// --- Default category icons (when not in schema) ---

const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  indian: "🍛",
  oriental: "🥢",
  continental: "🍝",
  desserts: "🍮",
};

function getCategoryIcon(categoryId: string): string {
  return DEFAULT_CATEGORY_ICONS[categoryId] ?? "📋";
}

// --- Transform diet → isVeg ---

function dietToIsVeg(diet: DietType): boolean {
  return diet === "veg" || diet === "egg";
}

// --- Map config variant type to app PortionSize ---

const VARIANT_TO_PORTION: Record<VariantType, PortionSize> = {
  qtr: "quarter",
  half: "half",
  full: "full",
};

// --- Transform variants → price, priceHalf, priceQuarter + availablePortions ---

function variantsToPricesAndPortions(variants: ConfigVariant[]): {
  price: number;
  priceHalf?: number;
  priceQuarter?: number;
  availablePortions: PortionSize[];
} {
  const order: VariantType[] = ["qtr", "half", "full"];
  const availablePortions = order
    .filter((t) => variants.some((v) => v.type === t))
    .map((t) => VARIANT_TO_PORTION[t]);
  const full = variants.find((v) => v.type === "full");
  const half = variants.find((v) => v.type === "half");
  const qtr = variants.find((v) => v.type === "qtr");
  return {
    price: full?.price ?? 0,
    priceHalf: half?.price,
    priceQuarter: qtr?.price,
    availablePortions,
  };
}

// --- Build categories and menuItems from raw config (guarded) ---

const safeCategories: ConfigCategory[] = Array.isArray(raw.categories)
  ? raw.categories
  : [];

/** Only categories that have at least one item; empty categories are excluded from the menu. */
const categoriesWithItems: ConfigCategory[] = safeCategories.filter(
  (c) => Array.isArray(c.items) && c.items.length > 0
);

export const categories: Category[] = categoriesWithItems.map((c) => ({
  id: c.id,
  name: c.name,
  icon: getCategoryIcon(c.id),
}));

export const menuItems: MenuItem[] = categoriesWithItems.flatMap((cat) =>
  (Array.isArray(cat.items) ? cat.items : []).map((item) => {
    const { price, priceHalf, priceQuarter, availablePortions } =
      variantsToPricesAndPortions(
        Array.isArray(item.variants) ? item.variants : []
      );
    const uniqueId = `${cat.id}-${item.id}`;
    return {
      id: uniqueId,
      name: item.name,
      description: item.description,
      price,
      priceHalf,
      priceQuarter,
      isVeg: dietToIsVeg(item.diet),
      category: cat.id,
      availablePortions: availablePortions.length ? availablePortions : ["full"],
      diet: item.diet,
      options: Array.isArray(item.options) ? item.options : undefined,
    };
  })
);

const DEFAULT_BRANDING: Branding = {
  restaurantName: "Menu",
  tagline: "Restaurant & Bar",
  welcomeMessage: "Welcome",
  preparingMessage: "Preparing your menu experience",
  orderNumberPrefix: "ORD",
};

export const branding: Branding = raw.branding
  ? { ...DEFAULT_BRANDING, ...raw.branding }
  : DEFAULT_BRANDING;
