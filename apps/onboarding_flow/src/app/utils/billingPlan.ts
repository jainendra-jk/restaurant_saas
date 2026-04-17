export type UrlBillingPlan = "starter" | "professional";

export function parseBillingPlanFromSearch(search: string): UrlBillingPlan | null {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const p = q.get("plan");
  if (p === "starter" || p === "professional") return p;
  return null;
}

/** Marketing site (Website app) — used when onboarding must send users to checkout. */
export function getMarketingOriginForRedirect(): string {
  const raw = import.meta.env.VITE_WEBSITE_ORIGIN;
  const v = typeof raw === "string" ? raw.trim().replace(/\/+$/, "") : "";
  if (v) return v;
  if (import.meta.env.DEV) return "http://localhost:5173";
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function planToTableCount(plan: UrlBillingPlan): number {
  return plan === "starter" ? 20 : 50;
}
