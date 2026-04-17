import type { WebsiteAccessState } from "../context/WebsiteAuthContext";

const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;

export const WEBSITE_SETUP_PATH = "/dashboard/settings";
export const WEBSITE_DASHBOARD_PATH = "/dashboard";

function normalizeOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

export function getWebsiteMarketingOrigin(): string | null {
  return normalizeOrigin(env.VITE_MARKETING_ORIGIN) ?? normalizeOrigin(env.VITE_WEBSITE_ORIGIN);
}

export function getWebsiteCheckoutUrl(): string | null {
  const origin = getWebsiteMarketingOrigin();
  return origin ? `${origin}/checkout` : null;
}

export function isSafeInternalPath(path: string | null | undefined): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//") && !path.includes("://"));
}

export function resolveWebsitePostLoginPath(
  accessState: WebsiteAccessState,
  safeFallbackPath: string,
): string {
  if (accessState === "setup_incomplete") return WEBSITE_SETUP_PATH;
  return safeFallbackPath;
}

