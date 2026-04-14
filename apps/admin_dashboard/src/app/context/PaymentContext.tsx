import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useMenuConfig } from './MenuConfigContext';

const STORAGE_KEY = 'dashboard-payment-details';

export type PaymentMode = 'pay_at_table' | 'merchant';

export type Currency = 'INR' | 'USD';
export type PrimaryGateway = 'razorpay' | 'stripe' | 'upi' | null;

export interface PaymentDetails {
  merchantId: string;
  restaurantName: string;
  currency: Currency;
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
    connected: boolean;
  };
  stripe: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    connected: boolean;
  };
  upi: {
    vpa: string;
    enabled: boolean;
  };
  primary: PrimaryGateway;
}

/** Default placeholder values when no payment details have been saved. */
export function getInitialPaymentDetails(restaurantName: string): PaymentDetails {
  return {
    merchantId: 'MID_SPG_2024_00847',
    restaurantName,
    currency: 'INR',
    razorpay: {
      keyId: '',
      keySecret: '',
      webhookSecret: '',
      connected: false,
    },
    stripe: {
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      connected: false,
    },
    upi: {
      vpa: '',
      enabled: false,
    },
    primary: null,
  };
}

function toPrimaryGateway(value: unknown): PrimaryGateway {
  if (value === 'razorpay' || value === 'stripe' || value === 'upi') return value;
  return null;
}

function coerceBool(v: unknown): boolean {
  return v === true;
}

function mergeWithDefaults(parsed: Record<string, unknown>, restaurantName: string): PaymentDetails {
  // Migration support from older shape:
  // - merchantName -> restaurantName
  // - upiVpa -> upi.vpa (also enables UPI by default if present)
  // - paymentGateway -> primary (best-effort)
  // - Other legacy fields are ignored.
  const legacyPaymentGateway = typeof parsed.paymentGateway === 'string' ? parsed.paymentGateway : '';
  const legacyPrimary: PrimaryGateway =
    legacyPaymentGateway.toLowerCase() === 'razorpay'
      ? 'razorpay'
      : legacyPaymentGateway.toLowerCase() === 'stripe'
        ? 'stripe'
        : legacyPaymentGateway.toLowerCase() === 'upi'
          ? 'upi'
          : null;

  const legacyUpiVpa = typeof parsed.upiVpa === 'string' ? parsed.upiVpa : '';
  const parsedCurrency = parsed.currency;
  const currency: Currency = parsedCurrency === 'USD' ? 'USD' : 'INR';

  const base = getInitialPaymentDetails(restaurantName);

  const razorpayParsed = (parsed.razorpay ?? {}) as Record<string, unknown>;
  const stripeParsed = (parsed.stripe ?? {}) as Record<string, unknown>;
  const upiParsed = (parsed.upi ?? {}) as Record<string, unknown>;

  const details: PaymentDetails = {
    ...base,
    merchantId: typeof parsed.merchantId === 'string' ? parsed.merchantId : base.merchantId,
    restaurantName:
      typeof parsed.restaurantName === 'string'
        ? parsed.restaurantName
        : typeof parsed.merchantName === 'string'
          ? parsed.merchantName
          : restaurantName,
    currency,
    razorpay: {
      keyId: typeof razorpayParsed.keyId === 'string' ? razorpayParsed.keyId : '',
      keySecret: typeof razorpayParsed.keySecret === 'string' ? razorpayParsed.keySecret : '',
      webhookSecret:
        typeof razorpayParsed.webhookSecret === 'string' ? razorpayParsed.webhookSecret : '',
      connected: coerceBool(razorpayParsed.connected),
    },
    stripe: {
      publishableKey:
        typeof stripeParsed.publishableKey === 'string' ? stripeParsed.publishableKey : '',
      secretKey: typeof stripeParsed.secretKey === 'string' ? stripeParsed.secretKey : '',
      webhookSecret:
        typeof stripeParsed.webhookSecret === 'string' ? stripeParsed.webhookSecret : '',
      connected: coerceBool(stripeParsed.connected),
    },
    upi: {
      vpa:
        typeof upiParsed.vpa === 'string'
          ? upiParsed.vpa
          : legacyUpiVpa
            ? legacyUpiVpa
            : '',
      enabled:
        typeof upiParsed.enabled === 'boolean'
          ? upiParsed.enabled
          : legacyUpiVpa.trim() !== '',
    },
    primary: toPrimaryGateway(parsed.primary) ?? legacyPrimary,
  };

  return ensurePrimaryValid(details);
}

export function getPaymentModeFromStorage(): PaymentMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'merchant';
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed.paymentMode === 'pay_at_table' ? 'pay_at_table' : 'merchant';
  } catch {
    return 'merchant';
  }
}

function loadFromStorage(restaurantName: string): { details: PaymentDetails | null; paymentMode: PaymentMode } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { details: null, paymentMode: 'merchant' };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const paymentMode: PaymentMode = parsed.paymentMode === 'pay_at_table' ? 'pay_at_table' : 'merchant';
    const details = mergeWithDefaults(parsed, restaurantName);
    return { details, paymentMode };
  } catch {
    return { details: null, paymentMode: 'merchant' };
  }
}

/** Same required-field check as PaymentsSlider: merchantId, upiVpa, paymentGateway non-empty. */
export function isPaymentConfigured(details: PaymentDetails): boolean {
  const active = getActiveGateways(details);
  return details.merchantId.trim() !== '' && active.length > 0 && active.includes(details.primary);
}

export function getActiveGateways(details: PaymentDetails): Array<Exclude<PrimaryGateway, null>> {
  const active: Array<Exclude<PrimaryGateway, null>> = [];
  if (details.razorpay.connected) active.push('razorpay');
  if (details.stripe.connected) active.push('stripe');
  if (details.upi.enabled) active.push('upi');
  return active;
}

export function ensurePrimaryValid(details: PaymentDetails): PaymentDetails {
  const active = getActiveGateways(details);
  if (details.primary && active.includes(details.primary)) return details;
  const nextPrimary = active.length > 0 ? active[0] : null;
  if (details.primary === nextPrimary) return details;
  return { ...details, primary: nextPrimary };
}

interface PaymentContextValue {
  /** Effective payment details: saved from store or default. Single source of truth. */
  paymentDetails: PaymentDetails;
  /** True when user has ever saved payment details to localStorage. */
  hasSavedPaymentDetails: boolean;
  /** True when required payment fields (merchantId, upiVpa, paymentGateway) are filled. */
  isPaymentConfigured: boolean;
  /** How payment is collected: pay at table (no merchant setup) or merchant integration. */
  paymentMode: PaymentMode;
  /** Persist payment details to store. */
  savePayment: (details: PaymentDetails) => void;
  /** Persist payment mode to store (pay_at_table | merchant). */
  setPaymentMode: (mode: PaymentMode) => void;
}

const PaymentContext = createContext<PaymentContextValue | null>(null);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const { branding } = useMenuConfig();
  const [store, setStore] = useState(() => loadFromStorage(branding.restaurantName));

  const paymentDetails: PaymentDetails =
    store.details ?? getInitialPaymentDetails(branding.restaurantName);

  const savePayment = useCallback(
    (details: PaymentDetails) => {
      const normalized = ensurePrimaryValid(details);
      setStore((prev) => ({ ...prev, details: normalized }));
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...normalized, paymentMode: store.paymentMode })
        );
      } catch {
        // ignore
      }
    },
    [store.paymentMode]
  );

  const setPaymentMode = useCallback((mode: PaymentMode) => {
    setStore((prev) => ({ ...prev, paymentMode: mode }));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const current = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, paymentMode: mode }));
    } catch {
      // ignore
    }
  }, []);

  const isConfigured = (() => {
    try {
      return isPaymentConfigured(paymentDetails);
    } catch {
      return false;
    }
  })();

  const value = useMemo<PaymentContextValue>(() => ({
    paymentDetails,
    hasSavedPaymentDetails: store.details !== null,
    isPaymentConfigured: isConfigured,
    paymentMode: store.paymentMode,
    savePayment,
    setPaymentMode,
  }), [paymentDetails, store.details, isConfigured, store.paymentMode, savePayment, setPaymentMode]);

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment(): PaymentContextValue {
  const ctx = useContext(PaymentContext);
  if (!ctx) {
    throw new Error('usePayment must be used within PaymentProvider');
  }
  return ctx;
}
