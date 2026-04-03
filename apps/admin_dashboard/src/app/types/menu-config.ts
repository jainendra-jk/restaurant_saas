/**
 * Menu config JSON shape — single source of truth for palette, branding, and menu.
 * Loaded at runtime from public/menu.json.
 */

export type DietType = 'veg' | 'nonveg' | 'egg' | 'seafood';

export interface MenuConfigPalette {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

export interface MenuConfigBranding {
  restaurantName: string;
  tagline: string;
  welcomeMessage: string;
  orderNumberPrefix: string;
  /** Currency symbol for display (e.g. "₹" or "Rs"). Defaults to "Rs" if missing. */
  currency?: string;
  /** Optional address for customer bill PDF */
  address?: string;
  /** Optional contact (phone/email) for customer bill PDF */
  contact?: string;
  /** Optional FSSAI licence number for customer bill PDF */
  fssaiNumber?: string;
}

export interface MenuConfigItemVariant {
  type: 'qtr' | 'half' | 'full';
  price: number;
}

export interface MenuConfigItem {
  id: string;
  name: string;
  diet: DietType;
  description: string;
  options: string[];
  variants: MenuConfigItemVariant[];
  /**
   * Whether the item should be visible/available to customers.
   * Admin UI toggles this; defaults to true when missing.
   */
  isAvailable?: boolean;
}

export interface MenuConfigCategory {
  id: string;
  name: string;
  items: MenuConfigItem[];
}

export interface MenuConfig {
  palette: MenuConfigPalette;
  branding: MenuConfigBranding;
  categories: MenuConfigCategory[];
  /** Currency symbol at root (e.g. "₹"). Overrides branding.currency when set. */
  currency?: string;
}
