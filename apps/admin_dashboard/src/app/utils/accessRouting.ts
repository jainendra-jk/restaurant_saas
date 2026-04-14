import type { AccessState } from '../context/AuthContext';

const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;

function normalizeOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

export function getMarketingOrigin(): string | null {
  return normalizeOrigin(env.VITE_MARKETING_ORIGIN) ?? normalizeOrigin(env.VITE_WEBSITE_ORIGIN);
}

export function getOnboardingOrigin(): string | null {
  return normalizeOrigin(env.VITE_ONBOARDING_FLOW_ORIGIN);
}

export function getCheckoutUrl(): string | null {
  const origin = getMarketingOrigin();
  return origin ? `${origin}/checkout` : null;
}

export function getOnboardingUrl(): string | null {
  return getOnboardingOrigin();
}

export function resolvePostLoginPath(accessState: AccessState, fallbackPath: string): string {
  if (accessState === 'onboarding_incomplete') return '/setup';
  return fallbackPath;
}
