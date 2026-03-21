import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useMenuConfig } from './MenuConfigContext';

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
  };
}

function loadFromStorage(restaurantName: string): RestaurantProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  saveProfile: (p: RestaurantProfile) => void;
}

const RestaurantProfileContext = createContext<RestaurantProfileContextValue | null>(null);

export function RestaurantProfileProvider({ children }: { children: ReactNode }) {
  const { branding } = useMenuConfig();
  const [profile, setProfile] = useState<RestaurantProfile | null>(() =>
    loadFromStorage(branding.restaurantName)
  );

  const saveProfile = useCallback((p: RestaurantProfile) => {
    setProfile(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, []);

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
