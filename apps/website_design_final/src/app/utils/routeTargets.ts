const normalizeOrigin = (value?: string) => value?.trim().replace(/\/+$/, '');

/** Onboarding flow app. Set VITE_ONBOARDING_FLOW_ORIGIN in root .env for production; dev falls back to fixed port. */
export const getOnboardingHref = (): string => {
  const fromEnv = normalizeOrigin(import.meta.env.VITE_ONBOARDING_FLOW_ORIGIN);
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return 'http://localhost:5176';
  return 'http://localhost:5176';
};

/** Wedding plate dashboard app. Set VITE_WEDDING_PLATE_DASHBOARD_ORIGIN in root .env for production; dev falls back to fixed port. */
export const getWeddingPlateDashboardHref = (): string => {
  const fromEnv = normalizeOrigin(import.meta.env.VITE_WEDDING_PLATE_DASHBOARD_ORIGIN);
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return 'http://localhost:5177';
  return 'http://localhost:5177';
};

/** Admin dashboard app (restaurant ops). Set VITE_ADMIN_DASHBOARD_ORIGIN in root .env for production; dev falls back to fixed port. */
export const getAdminDashboardHref = (): string => {
  const fromEnv = normalizeOrigin(import.meta.env.VITE_ADMIN_DASHBOARD_ORIGIN);
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return 'http://localhost:5174';
  return 'http://localhost:5174';
};

export const isExternalHref = (href: string) => /^https?:\/\//i.test(href);

/** Gmail web compose to sales (Enterprise). */
export const getEnterpriseSalesHref = (): string =>
  "https://mail.google.com/mail/?view=cm&fs=1&to=support@ratolabs.com&su=Enterprise%20plan%20inquiry";

/** Marketing site origin for redirects from onboarding (set in root .env). */
export const getMarketingSiteOrigin = (): string => {
  const fromEnv = normalizeOrigin(import.meta.env.VITE_WEBSITE_ORIGIN);
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return "http://localhost:5173";
  return typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
};
