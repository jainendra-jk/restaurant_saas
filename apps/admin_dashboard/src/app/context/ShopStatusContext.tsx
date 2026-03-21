import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { usePayment } from './PaymentContext';

const STORAGE_KEY = 'dashboard-shop-active';

function loadInitial(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // ignore
  }
  return false;
}

interface ShopStatusContextValue {
  /** Stored preference: user has toggled shop on. */
  isShopActive: boolean;
  /** True only when isShopActive AND payment is valid for opening shop. Used for toggle display. */
  effectiveIsShopActive: boolean;
  setShopActive: (active: boolean) => void;
}

const ShopStatusContext = createContext<ShopStatusContextValue | null>(null);

export function ShopStatusProvider({ children }: { children: ReactNode }) {
  const { paymentMode, isPaymentConfigured, paymentDetails } = usePayment();
  const [isShopActive, setState] = useState(loadInitial);

  const paymentValidForShopOpen =
    paymentMode === 'pay_at_table' ||
    isPaymentConfigured;

  const effectiveIsShopActive = isShopActive && paymentValidForShopOpen;

  const setShopActive = useCallback((active: boolean) => {
    setState(active);
    try {
      localStorage.setItem(STORAGE_KEY, String(active));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!paymentValidForShopOpen && isShopActive) {
      setState(false);
      try {
        localStorage.setItem(STORAGE_KEY, 'false');
      } catch {
        // ignore
      }
    }
  }, [paymentValidForShopOpen, isShopActive]);

  const value: ShopStatusContextValue = {
    isShopActive,
    effectiveIsShopActive,
    setShopActive,
  };

  return (
    <ShopStatusContext.Provider value={value}>
      {children}
    </ShopStatusContext.Provider>
  );
}

export function useShopStatus(): ShopStatusContextValue {
  const ctx = useContext(ShopStatusContext);
  if (!ctx) {
    throw new Error('useShopStatus must be used within ShopStatusProvider');
  }
  return ctx;
}
