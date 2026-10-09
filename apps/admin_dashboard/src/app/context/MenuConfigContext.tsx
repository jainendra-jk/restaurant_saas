import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { MenuConfig, MenuConfigCategory, MenuConfigItem } from '../types/menu-config';
import type { MenuItem } from '../data/mock-data';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { saveMenuConfigToSupabase } from '../utils/saveMenuToSupabase';

const CONFIG_URL = '/menu.json';

function darkenHex(hex: string, pct: number): string {
  const n = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) * (1 - pct)));
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) * (1 - pct)));
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) * (1 - pct)));
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function applyPalette(palette: MenuConfig['palette']) {
  const root = document.documentElement;
  const primary = palette.primary.startsWith('#') ? palette.primary : `#${palette.primary}`;
  const hover = darkenHex(primary, 0.08);
  let lightRgba = 'rgba(249, 115, 22, 0.1)';
  if (primary.startsWith('#')) {
    const r = parseInt(primary.slice(1, 3), 16);
    const g = parseInt(primary.slice(3, 5), 16);
    const b = parseInt(primary.slice(5, 7), 16);
    lightRgba = `rgba(${r}, ${g}, ${b}, 0.1)`;
  }
  root.style.setProperty('--brand-primary', primary);
  root.style.setProperty('--brand-primary-hover', hover);
  root.style.setProperty('--brand-primary-light', lightRgba);
  root.style.setProperty('--brand-primary-foreground', '#ffffff');
  root.style.setProperty('--brand-accent', palette.accent);
  root.style.setProperty('--brand-accent-foreground', darkenHex(primary, 0.2));
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--background', palette.background);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--scrollbar-thumb', lightRgba.replace('0.1', '0.25'));
  root.style.setProperty('--scrollbar-thumb-hover', lightRgba.replace('0.1', '0.45'));
}

function mapConfigToMenuItem(item: MenuConfigItem, categoryName: string, categoryId: string): MenuItem {
  const price =
    item.variants.length > 0
      ? Math.min(...item.variants.map((v) => v.price))
      : 0;
  const sizes =
    item.variants.length > 0
      ? item.variants.map((v) => ({
          label: v.type.toUpperCase(),
          price: v.price,
        }))
      : undefined;
  const flavours = item.options?.length ? item.options : undefined;
  return {
    id: `${categoryId}-${item.id}`,
    persistentId: item.id,
    name: item.name,
    price,
    categories: [categoryName],
    image: '',
    diet: item.diet,
    isAvailable: item.isAvailable ?? true,
    description: item.description ?? '',
    sizes,
    flavours,
  };
}

function configToMenuItems(categories: MenuConfigCategory[]): MenuItem[] {
  const items: MenuItem[] = [];
  for (const cat of categories) {
    for (const item of cat.items) {
      items.push(mapConfigToMenuItem(item, cat.name, cat.id));
    }
  }
  return items;
}

function configToCategoryNames(categories: MenuConfigCategory[]): string[] {
  return categories.map((c) => c.name);
}

const DIETS: MenuConfigItem['diet'][] = ['veg', 'nonveg', 'egg', 'seafood'];

function normalizeExtractedMenuPayload(
  raw: unknown,
  restaurantNameCanonical: string
): MenuConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid menu payload');
  }
  const o = raw as Record<string, unknown>;
  const catsRaw = o.categories;
  if (!Array.isArray(catsRaw) || catsRaw.length === 0) {
    throw new Error('No categories in extracted menu');
  }

  const palette: MenuConfig['palette'] = { ...DEFAULT_CONFIG.palette };
  const paletteIn = o.palette;
  if (paletteIn && typeof paletteIn === 'object') {
    const p = paletteIn as Record<string, unknown>;
    for (const key of ['primary', 'secondary', 'background', 'accent'] as const) {
      const v = p[key];
      if (typeof v === 'string' && v.trim()) {
        const hex = v.trim().startsWith('#') ? v.trim() : `#${v.trim()}`;
        palette[key] = hex;
      }
    }
  }

  const brandingIn =
    o.branding && typeof o.branding === 'object' ? (o.branding as Record<string, unknown>) : {};
  const branding: MenuConfig['branding'] = {
    restaurantName: restaurantNameCanonical || String(brandingIn.restaurantName ?? ''),
    tagline: String(brandingIn.tagline ?? ''),
    welcomeMessage: String(brandingIn.welcomeMessage ?? 'Welcome back'),
    orderNumberPrefix: String(brandingIn.orderNumberPrefix ?? '#'),
  };

  const categories: MenuConfigCategory[] = [];
  for (const c of catsRaw) {
    if (!c || typeof c !== 'object') continue;
    const cobj = c as Record<string, unknown>;
    const id = String(cobj.id ?? '').trim();
    const name = String(cobj.name ?? '').trim();
    if (!id || !name) continue;
    const itemsRaw = cobj.items;
    if (!Array.isArray(itemsRaw)) continue;

    const items: MenuConfigItem[] = [];
    for (const it of itemsRaw) {
      if (!it || typeof it !== 'object') continue;
      const item = it as Record<string, unknown>;
      const itemId = String(item.id ?? '').trim();
      const itemName = String(item.name ?? '').trim();
      if (!itemId || !itemName) continue;
      const dietRaw = String(item.diet ?? 'veg').toLowerCase();
      const diet = DIETS.includes(dietRaw as MenuConfigItem['diet'])
        ? (dietRaw as MenuConfigItem['diet'])
        : 'veg';
      const options = Array.isArray(item.options)
        ? item.options.filter((x): x is string => typeof x === 'string')
        : [];
      const variantsRaw = item.variants;
      const variants: MenuConfigItem['variants'] = [];
      if (Array.isArray(variantsRaw)) {
        for (const v of variantsRaw) {
          if (!v || typeof v !== 'object') continue;
          const vr = v as Record<string, unknown>;
          const type = String(vr.type ?? 'full').toLowerCase();
          if (type !== 'qtr' && type !== 'half' && type !== 'full') continue;
          const price = Number(vr.price);
          if (!Number.isFinite(price)) continue;
          variants.push({ type: type as 'qtr' | 'half' | 'full', price });
        }
      }
      if (variants.length === 0) {
        variants.push({ type: 'full', price: 0 });
      }
      items.push({
        id: itemId,
        name: itemName,
        diet,
        description: String(item.description ?? ''),
        options,
        variants,
        isAvailable: true,
      });
    }
    if (items.length > 0) {
      categories.push({ id, name, items });
    }
  }

  if (categories.length === 0) {
    throw new Error('No valid menu items in extracted data');
  }

  const currency = typeof o.currency === 'string' && o.currency.trim() ? o.currency.trim() : undefined;

  return {
    palette,
    branding,
    categories,
    ...(currency ? { currency } : {}),
  };
}

const DEFAULT_CONFIG: MenuConfig = {
  palette: {
    primary: '#f97316',
    secondary: '#ea580c',
    background: '#f8f9fb',
    accent: '#fff7ed',
  },
  branding: {
    restaurantName: 'Spice Garden',
    tagline:
      'Manage your restaurant orders, tables, and menu all in one place. Streamline operations and delight your customers.',
    welcomeMessage: 'Welcome back',
    orderNumberPrefix: '#',
  },
  categories: [
    {
      id: 'starters',
      name: 'Starters',
      items: [
        {
          id: 'menu-001',
          name: 'Veg Samosa',
          diet: 'veg',
          description: 'Crispy pastry filled with spiced potatoes and peas',
          options: [],
          variants: [{ type: 'full', price: 40 }],
        },
        {
          id: 'menu-002',
          name: 'Paneer Tikka',
          diet: 'veg',
          description: 'Marinated cottage cheese grilled in tandoor with aromatic spices',
          options: [],
          variants: [
            { type: 'qtr', price: 160 },
            { type: 'half', price: 240 },
            { type: 'full', price: 345 },
          ],
        },
        {
          id: 'menu-003',
          name: 'Tandoori Chicken',
          diet: 'nonveg',
          description: 'Classic tandoori chicken marinated overnight',
          options: [],
          variants: [
            { type: 'qtr', price: 180 },
            { type: 'half', price: 300 },
            { type: 'full', price: 450 },
          ],
        },
      ],
    },
    {
      id: 'main-course',
      name: 'Main Course',
      items: [
        {
          id: 'menu-004',
          name: 'Paneer Butter Masala',
          diet: 'veg',
          description: 'Rich and creamy paneer in tomato gravy',
          options: [],
          variants: [{ type: 'full', price: 320 }],
        },
        {
          id: 'menu-005',
          name: 'Chicken Biryani',
          diet: 'nonveg',
          description: 'Aromatic basmati rice with tender chicken',
          options: [],
          variants: [
            { type: 'half', price: 220 },
            { type: 'full', price: 380 },
          ],
        },
        {
          id: 'menu-006',
          name: 'Dal Makhani',
          diet: 'veg',
          description: 'Slow cooked black lentils in creamy sauce',
          options: [],
          variants: [{ type: 'full', price: 280 }],
        },
        {
          id: 'menu-007',
          name: 'Butter Naan',
          diet: 'veg',
          description: 'Soft tandoor-baked bread with butter',
          options: [],
          variants: [{ type: 'full', price: 60 }],
        },
      ],
    },
    {
      id: 'desserts',
      name: 'Desserts',
      items: [
        {
          id: 'menu-008',
          name: 'Gulab Jamun',
          diet: 'veg',
          description: 'Deep-fried milk solids soaked in sugar syrup',
          options: [],
          variants: [{ type: 'full', price: 80 }],
        },
      ],
    },
    {
      id: 'beverages',
      name: 'Beverages',
      items: [
        {
          id: 'menu-009',
          name: 'Lassi',
          diet: 'veg',
          description: 'Traditional yogurt-based drink in multiple flavours',
          options: ['Salt', 'Sweet', 'Mango', 'Rose'],
          variants: [{ type: 'full', price: 120 }],
        },
        {
          id: 'menu-010',
          name: 'Milkshake',
          diet: 'veg',
          description: 'Thick and creamy milkshake blended fresh',
          options: ['Chocolate', 'Vanilla', 'Strawberry', 'Butterscotch'],
          variants: [{ type: 'full', price: 150 }],
        },
        {
          id: 'menu-011',
          name: 'Fresh Juice',
          diet: 'veg',
          description: 'Freshly squeezed seasonal fruit juice',
          options: ['Orange', 'Watermelon', 'Pineapple', 'Mixed Fruit'],
          variants: [{ type: 'full', price: 100 }],
        },
        {
          id: 'menu-012',
          name: 'Chaas',
          diet: 'veg',
          description: 'Refreshing spiced buttermilk',
          options: ['Plain', 'Masala', 'Mint'],
          variants: [{ type: 'full', price: 60 }],
        },
      ],
    },
  ],
};

interface MenuConfigState {
  config: MenuConfig;
  configVersion: number;
  branding: MenuConfig['branding'] & { currency: string };
  categories: string[];
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  /** Apply JSON from POST /v1/menu/extract (merges canonical restaurant name from auth). */
  applyExtractedMenu: (payload: unknown) => void;
  /** Replace menu_categories/menu_items in Supabase with current config. */
  saveMenuToDatabase: (nextConfig?: MenuConfig) => Promise<{ error: string | null }>;
}

const MenuConfigContext = createContext<MenuConfigState | null>(null);

export function MenuConfigProvider({ children }: { children: ReactNode }) {
  const { restaurant } = useAuth();
  const [config, setConfig] = useState<MenuConfig>(DEFAULT_CONFIG);
  const [configVersion, setConfigVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const applyCanonicalConfig = useCallback(
    (next: MenuConfig) => {
      setConfig(next);
      setConfigVersion((v) => v + 1);
    },
    []
  );

  const loadFromSupabase = useCallback(async (restaurantId: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data: cats, error: catErr } = await supabase
      .from('menu_categories')
      .select('id, slug, name, sort_order')
      .eq('restaurant_id', restaurantId)
      .order('sort_order');
    if (catErr) throw catErr;
    if (!cats?.length) return null;
    const categoryIds = cats.map((c) => c.id);
    const { data: items, error: itemErr } = await supabase
      .from('menu_items')
      .select('id, category_id, slug, name, diet, description, variants, options, is_available')
      .in('category_id', categoryIds)
      .order('sort_order');
    if (itemErr) throw itemErr;
    const itemsByCat = (items ?? []).reduce<Record<string, typeof items>>((acc, it) => {
      const cid = it.category_id;
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push(it);
      return acc;
    }, {});
    const categories: MenuConfigCategory[] = cats.map((c) => ({
      id: c.slug,
      name: c.name,
      items: (itemsByCat[c.id] ?? []).map((it) => ({
        id: it.slug,
        name: it.name,
        diet: (it.diet || 'veg') as MenuConfigItem['diet'],
        description: it.description ?? '',
        options: Array.isArray(it.options) ? it.options : [],
        variants: Array.isArray(it.variants) ? it.variants : [],
        isAvailable: it.is_available ?? true,
      })),
    }));
    return { categories };
  }, []);

  const buildConfigFromRestaurant = useCallback(
    (categories: MenuConfigCategory[]) => {
      const restBranding = (restaurant?.branding ?? {}) as Record<string, string>;
      return {
        palette: restaurant?.palette?.primary
          ? (restaurant.palette as unknown as MenuConfig['palette'])
          : DEFAULT_CONFIG.palette,
        branding: {
          restaurantName: restaurant?.name ?? DEFAULT_CONFIG.branding.restaurantName,
          tagline: restBranding?.tagline ?? '',
          welcomeMessage: restBranding?.welcomeMessage ?? 'Welcome back',
          orderNumberPrefix: restBranding?.orderNumberPrefix ?? '#',
        },
        currency: restaurant?.currency ?? 'Rs',
        categories,
      } satisfies MenuConfig;
    },
    [restaurant]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (supabase && restaurant) {
      loadFromSupabase(restaurant.id)
        .then((supaData) => {
          if (cancelled) return;
          applyCanonicalConfig(buildConfigFromRestaurant(supaData?.categories ?? []));
        })
        .catch((err) => {
          if (!cancelled) {
            applyCanonicalConfig({
              ...DEFAULT_CONFIG,
              branding: {
                ...DEFAULT_CONFIG.branding,
                restaurantName: restaurant.name,
              },
              categories: [],
              currency: restaurant.currency,
            });
            setError(err instanceof Error ? err.message : 'Failed to load menu');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      fetch(CONFIG_URL)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
          return res.json();
        })
        .then((data: unknown) => {
          if (cancelled) return;
          if (
            data &&
            typeof data === 'object' &&
            data !== null &&
            'palette' in data &&
            'branding' in data &&
            'categories' in data &&
            Array.isArray((data as MenuConfig).categories)
          ) {
            applyCanonicalConfig(data as MenuConfig);
          } else {
            applyCanonicalConfig(DEFAULT_CONFIG);
            setError('Invalid menu config shape; using defaults');
          }
        })
        .catch((err) => {
          if (!cancelled) {
            applyCanonicalConfig(DEFAULT_CONFIG);
            setError(err instanceof Error ? err.message : 'Failed to load menu.json');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [restaurant?.id, loadFromSupabase, buildConfigFromRestaurant, applyCanonicalConfig]);

  useEffect(() => {
    if (!supabase || !restaurant?.id) return;
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(async () => {
        try {
          const next = await loadFromSupabase(restaurant.id);
          applyCanonicalConfig(buildConfigFromRestaurant(next?.categories ?? []));
          setError(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to refresh menu');
        }
      }, 300);
    };

    const channel = supabase
      .channel(`admin-menu-config-${restaurant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_categories', filter: `restaurant_id=eq.${restaurant.id}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurants', filter: `id=eq.${restaurant.id}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${restaurant.id}` },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      channel.unsubscribe();
    };
  }, [restaurant?.id, loadFromSupabase, buildConfigFromRestaurant, applyCanonicalConfig]);

  useEffect(() => {
    applyPalette(config.palette);
  }, [config.palette]);

  const applyExtractedMenu = useCallback(
    (payload: unknown) => {
      const name = restaurant?.name?.trim() ?? '';
      const next = normalizeExtractedMenuPayload(payload, name);
      applyCanonicalConfig(next);
      setError(null);
    },
    [restaurant?.name, applyCanonicalConfig]
  );

  const saveMenuToDatabase = useCallback(async (nextConfig?: MenuConfig) => {
    if (!supabase || !restaurant) {
      return { error: 'Supabase not configured or not signed in' };
    }
    const targetConfig = nextConfig ?? config;
    const { error: saveErr } = await saveMenuConfigToSupabase(
      supabase,
      restaurant.id,
      targetConfig,
      restaurant.branding as Record<string, unknown>
    );
    if (!saveErr) {
      applyCanonicalConfig(targetConfig);
      setError(null);
    }
    return { error: saveErr };
  }, [restaurant, config, applyCanonicalConfig]);

  const value = useMemo<MenuConfigState>(
    () => ({
      config,
      configVersion,
      branding: {
        ...config.branding,
        currency: config.currency?.trim() ?? config.branding.currency?.trim() ?? 'Rs',
      },
      categories: configToCategoryNames(config.categories),
      menuItems: configToMenuItems(config.categories),
      loading,
      error,
      applyExtractedMenu,
      saveMenuToDatabase,
    }),
    [config, configVersion, loading, error, applyExtractedMenu, saveMenuToDatabase]
  );

  return (
    <MenuConfigContext.Provider value={value}>{children}</MenuConfigContext.Provider>
  );
}

export function useMenuConfig(): MenuConfigState {
  const ctx = useContext(MenuConfigContext);
  if (!ctx) {
    throw new Error('useMenuConfig must be used within MenuConfigProvider');
  }
  return ctx;
}
