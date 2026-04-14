export const ADMIN_LAST_LOGIN_BRANDING_KEY = 'admin_last_login_branding';

export interface LoginBrandingCachePayload {
  restaurantName: string;
  tagline: string;
  welcomeMessage: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function readLoginBrandingCache(): LoginBrandingCachePayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_LAST_LOGIN_BRANDING_KEY);
    if (!raw?.trim()) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const restaurantName =
      typeof parsed.restaurantName === 'string' ? parsed.restaurantName.trim() : '';
    if (!restaurantName) return null;
    const tagline = typeof parsed.tagline === 'string' ? parsed.tagline.trim() : '';
    const welcomeMessage =
      typeof parsed.welcomeMessage === 'string' ? parsed.welcomeMessage.trim() : '';
    return { restaurantName, tagline, welcomeMessage };
  } catch {
    return null;
  }
}

export function writeLoginBrandingCache(payload: LoginBrandingCachePayload): void {
  if (typeof window === 'undefined') return;
  const next: LoginBrandingCachePayload = {
    restaurantName: payload.restaurantName.trim(),
    tagline: payload.tagline.trim(),
    welcomeMessage: payload.welcomeMessage.trim() || 'Welcome back',
  };
  window.localStorage.setItem(ADMIN_LAST_LOGIN_BRANDING_KEY, JSON.stringify(next));
}

export function clearLoginBrandingCache(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_LAST_LOGIN_BRANDING_KEY);
}
