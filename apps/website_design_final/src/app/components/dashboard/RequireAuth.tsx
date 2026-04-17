import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useWebsiteAuth } from "../../context/WebsiteAuthContext";
import { supabase } from "../../../lib/supabase";
import { getWebsiteCheckoutUrl, WEBSITE_SETUP_PATH } from "../../utils/accessRouting";

export function RequireAuth() {
  const { session, authLoading, profileLoading, accessState } = useWebsiteAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutUrl = getWebsiteCheckoutUrl();

  useEffect(() => {
    if (authLoading) return;
    if (session && profileLoading) return;
    if (!supabase) {
      navigate("/", { replace: true });
      return;
    }
    if (!session) {
      const path = `${location.pathname}${location.search}`;
      const q = new URLSearchParams();
      q.set("login", "1");
      if (path.startsWith("/") && path !== "/") q.set("redirect", path);
      navigate(`/?${q.toString()}`, { replace: true });
      return;
    }
    if (accessState === "no_subscription") {
      if (checkoutUrl && typeof window !== "undefined") {
        window.location.replace(checkoutUrl);
      } else {
        navigate("/", { replace: true });
      }
      return;
    }
    // Same URL as Settings; do not redirect "ready" users away — they need Settings after onboarding.
    if (accessState === "setup_incomplete" && location.pathname !== WEBSITE_SETUP_PATH) {
      navigate(WEBSITE_SETUP_PATH, { replace: true });
      return;
    }
  }, [
    accessState,
    authLoading,
    checkoutUrl,
    profileLoading,
    session,
    navigate,
    location.pathname,
    location.search,
  ]);

  if (authLoading || (session && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Loading…
      </div>
    );
  }
  if (!session) return null;
  return <Outlet />;
}
