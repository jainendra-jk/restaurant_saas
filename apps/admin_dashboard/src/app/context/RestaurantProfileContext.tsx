import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../../lib/supabase';
import { closeStoreAndDeactivateTables, openStore } from '../utils/storeStatus';

const STORAGE_KEY = 'dashboard-restaurant-profile';

export interface TaxRule {
  name: string;
  percent: number;
}

export interface RestaurantProfile {
  name: string;
  ownerName: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  fssaiNumber: string;
  cuisineType: string;
  openingTime: string;
  closingTime: string;
  seatingCapacity: string;
  avgCostForTwo: string;
  description: string;
  taxRules: TaxRule[];
  isOpen: boolean;
}

const defaultTaxRules: TaxRule[] = [];

function mergeWithDefaults(parsed: Record<string, unknown>, restaurantName: string): RestaurantProfile {
  return {
    name: typeof parsed.name === 'string' ? parsed.name : restaurantName,
    ownerName: typeof parsed.ownerName === 'string' ? parsed.ownerName : 'Rajesh Kumar',
    phone: typeof parsed.phone === 'string' ? parsed.phone : '+91 98765 43210',
    altPhone: typeof parsed.altPhone === 'string' ? parsed.altPhone : '+91 98765 43211',
    email: typeof parsed.email === 'string' ? parsed.email : 'info@spicegarden.in',
    address: typeof parsed.address === 'string' ? parsed.address : '42, MG Road, Koramangala',
    city: typeof parsed.city === 'string' ? parsed.city : 'Bengaluru',
    state: typeof parsed.state === 'string' ? parsed.state : 'Karnataka',
    pincode: typeof parsed.pincode === 'string' ? parsed.pincode : '560034',
    gstNumber: typeof parsed.gstNumber === 'string' ? parsed.gstNumber : '29ABCDE1234F1Z5',
    fssaiNumber: typeof parsed.fssaiNumber === 'string' ? parsed.fssaiNumber : '12345678901234',
    cuisineType: typeof parsed.cuisineType === 'string' ? parsed.cuisineType : 'North Indian, South Indian, Chinese',
    openingTime: typeof parsed.openingTime === 'string' ? parsed.openingTime : '11:00',
    closingTime: typeof parsed.closingTime === 'string' ? parsed.closingTime : '23:00',
    seatingCapacity: typeof parsed.seatingCapacity === 'string' ? parsed.seatingCapacity : '120',
    avgCostForTwo: typeof parsed.avgCostForTwo === 'string' ? parsed.avgCostForTwo : '800',
    description: typeof parsed.description === 'string' ? parsed.description : 'A fine-dining restaurant offering authentic Indian cuisine with a modern twist.',
    taxRules: Array.isArray(parsed.taxRules)
      ? (parsed.taxRules as unknown[]).filter(
          (r): r is TaxRule =>
            r != null &&
            typeof (r as TaxRule).name === 'string' &&
            typeof (r as TaxRule).percent === 'number'
        )
      : defaultTaxRules,
    isOpen: typeof parsed.isOpen === 'boolean' ? parsed.isOpen : true,
  };
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function storageKeyForRestaurant(restaurantId: string): string {
  return `${STORAGE_KEY}:${restaurantId}`;
}

function hasNonToggleProfileChanges(prev: RestaurantProfile, next: RestaurantProfile): boolean {
  return (
    prev.name !== next.name ||
    prev.ownerName !== next.ownerName ||
    prev.phone !== next.phone ||
    prev.altPhone !== next.altPhone ||
    prev.email !== next.email ||
    prev.address !== next.address ||
    prev.city !== next.city ||
    prev.state !== next.state ||
    prev.pincode !== next.pincode ||
    prev.gstNumber !== next.gstNumber ||
    prev.fssaiNumber !== next.fssaiNumber ||
    prev.cuisineType !== next.cuisineType ||
    prev.openingTime !== next.openingTime ||
    prev.closingTime !== next.closingTime ||
    prev.seatingCapacity !== next.seatingCapacity ||
    prev.avgCostForTwo !== next.avgCostForTwo ||
    prev.description !== next.description ||
    JSON.stringify(prev.taxRules) !== JSON.stringify(next.taxRules)
  );
}

function loadFromStorage(storageKey: string, restaurantName: string): RestaurantProfile | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return mergeWithDefaults(parsed, restaurantName);
  } catch {
    return null;
  }
}

interface RestaurantProfileContextValue {
  /** Saved profile from localStorage, or null if never saved. */
  profile: RestaurantProfile | null;
  /** Persist profile to localStorage and update context. */
  saveProfile: (p: RestaurantProfile) => Promise<void>;
}

const RestaurantProfileContext = createContext<RestaurantProfileContextValue | null>(null);

export function RestaurantProfileProvider({ children }: { children: ReactNode }) {
  const { restaurant } = useAuth();
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);

  useEffect(() => {
    if (!restaurant) return;
    const scopedKey = storageKeyForRestaurant(restaurant.id);
    let fromStorage = loadFromStorage(scopedKey, restaurant.name);
    if (!fromStorage) {
      // Migrate legacy unscoped profile once per restaurant.
      const legacy = loadFromStorage(STORAGE_KEY, restaurant.name);
      if (legacy) {
        fromStorage = legacy;
        localStorage.setItem(scopedKey, JSON.stringify(legacy));
      }
    }
    const fallbackBranding = restaurant.branding as Record<string, unknown>;
    const base = fromStorage ?? mergeWithDefaults({}, restaurant.name);
    const next: RestaurantProfile = {
      ...base,
      name: restaurant.name || base.name,
      ownerName:
        restaurant.ownerName ?? asText(fallbackBranding.ownerName) ?? base.ownerName,
      phone: restaurant.phone ?? asText(fallbackBranding.phone) ?? base.phone,
      email: restaurant.email ?? base.email,
      address: restaurant.addressLine1 ?? asText(fallbackBranding.address) ?? base.address,
      city: restaurant.city ?? base.city,
      state: restaurant.state ?? base.state,
      pincode: restaurant.pincode ?? base.pincode,
      gstNumber:
        restaurant.gstNumber ?? asText(fallbackBranding.gstNumber) ?? base.gstNumber,
      fssaiNumber:
        restaurant.fssaiNumber ?? asText(fallbackBranding.fssaiNumber) ?? base.fssaiNumber,
      isOpen: restaurant.isOpen,
    };
    setProfile(next);
  }, [restaurant]);

  const saveProfile = useCallback(async (p: RestaurantProfile) => {
    if (!restaurant) {
      setProfile(p);
      return;
    }
    if (!supabase) {
      setProfile(p);
      localStorage.setItem(storageKeyForRestaurant(restaurant.id), JSON.stringify(p));
      return;
    }

    // Use the local profile state first because auth context can lag until the next fetch.
    const prevIsOpen = profile?.isOpen ?? restaurant.isOpen;
    const nextIsOpen = p.isOpen;
    const isToggleChange = prevIsOpen !== nextIsOpen;
    const onlyToggleChanged = profile ? !hasNonToggleProfileChanges(profile, p) : false;

    const existingBranding = (restaurant.branding ?? {}) as Record<string, unknown>;
    const taxRules = p.taxRules
      .filter((r) => r.name.trim() && Number.isFinite(r.percent))
      .map((r) => ({ name: r.name.trim(), percent: Number(r.percent) }));

    const nextBranding = {
      ...existingBranding,
      ownerName: p.ownerName,
      phone: p.phone,
      address: p.address,
      gstNumber: p.gstNumber,
      fssaiNumber: p.fssaiNumber,
      taxRules,
    };
    // `tableStatusSnapshot` is only meaningful while the store is closed.
    // When opening the store (or staying open), ensure the snapshot is removed.
    if (nextIsOpen) {
      delete (nextBranding as Record<string, unknown>).tableStatusSnapshot;
    }

    const updateRestaurantRow = async () => {
      await supabase
        .from('restaurants')
        .update({
          name: p.name,
          owner_name: p.ownerName || null,
          phone: p.phone || null,
          email: p.email || null,
          address_line1: p.address || null,
          city: p.city || null,
          state: p.state || null,
          pincode: p.pincode || null,
          gst_number: p.gstNumber || null,
          fssai_number: p.fssaiNumber || null,
          branding: nextBranding,
          // Keep explicit for correctness; open/close helpers also update it but
          // the "stay open/stay closed" path must not rely on side effects.
          is_open: nextIsOpen,
        })
        .eq('id', restaurant.id)
        .throwOnError();
    };

    // Fast strict path for dashboard toggle-only actions:
    // keep backend-confirmed behavior but avoid redundant profile row rewrites.
    if (isToggleChange && onlyToggleChanged) {
      if (!nextIsOpen) {
        await closeStoreAndDeactivateTables(supabase, restaurant.id);
      } else {
        await openStore(supabase, restaurant.id);
      }
      setProfile(p);
      localStorage.setItem(storageKeyForRestaurant(restaurant.id), JSON.stringify(p));
      return;
    }

    // Only toggle tables when the "store open" state itself changes.
    if (prevIsOpen === nextIsOpen) {
      await updateRestaurantRow();
      setProfile(p);
      localStorage.setItem(storageKeyForRestaurant(restaurant.id), JSON.stringify(p));
      return;
    }

    // Open -> Closed
    if (!nextIsOpen) {
      await updateRestaurantRow();
      await closeStoreAndDeactivateTables(supabase, restaurant.id);
      setProfile(p);
      localStorage.setItem(storageKeyForRestaurant(restaurant.id), JSON.stringify(p));
      return;
    }

    // Closed -> Open
    await openStore(supabase, restaurant.id);
    await updateRestaurantRow();
    setProfile(p);
    localStorage.setItem(storageKeyForRestaurant(restaurant.id), JSON.stringify(p));
  }, [profile?.isOpen, restaurant]);

  const value: RestaurantProfileContextValue = { profile, saveProfile };

  return (
    <RestaurantProfileContext.Provider value={value}>
      {children}
    </RestaurantProfileContext.Provider>
  );
}

export function useRestaurantProfile(): RestaurantProfileContextValue {
  const ctx = useContext(RestaurantProfileContext);
  if (!ctx) {
    throw new Error('useRestaurantProfile must be used within RestaurantProfileProvider');
  }
  return ctx;
}
