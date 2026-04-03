import { useEffect } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router";
import {
  CustomerSessionProvider,
  isTableOrderingAvailable,
  useCustomerSession,
} from "../../context/CustomerSessionContext";
import { MenuProvider } from "../../context/MenuContext";
import { CartProvider } from "./CartContext";
import { getOrderFlowBasePath, segmentAfterOrderBase } from "../../utils/orderRoutePaths";
import { CustomerGlobalLoadingGate } from "./CustomerSkeletons";

const ALLOWED_WHEN_UNAVAILABLE = new Set(["service-unavailable", "confirmation"]);

function CustomerOrderFlowOutlet() {
  const session = useCustomerSession();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{
    slug?: string;
    tableNum?: string;
    restaurantSlug?: string;
    tableNumber?: string;
    qrToken?: string;
  }>();

  useEffect(() => {
    if (!session.ready) return;

    const base = getOrderFlowBasePath(params);
    if (!base) return;

    const segment = segmentAfterOrderBase(location.pathname, base);
    if (segment === undefined) return;

    const routeSlug = params.restaurantSlug ?? params.slug;
    if (session.qrToken && routeSlug && (params.qrToken !== session.qrToken || !params.qrToken)) {
      const canonicalBase = `/order/${routeSlug}/t/${session.qrToken}`;
      const canonicalTarget = segment ? `${canonicalBase}/${segment}` : canonicalBase;
      const pathNorm = location.pathname.replace(/\/$/, '') || '/';
      const targetNorm = canonicalTarget.replace(/\/$/, '') || '/';
      if (pathNorm !== targetNorm) {
        navigate(canonicalTarget, { replace: true });
        return;
      }
    }

    const isAvailable = isTableOrderingAvailable(session);
    if (isAvailable) {
      if (segment !== "service-unavailable") return;
      const target = `${base}/menu`;
      const pathNorm = location.pathname.replace(/\/$/, "") || "/";
      const targetNorm = target.replace(/\/$/, "") || "/";
      if (pathNorm === targetNorm) return;
      navigate(target, { replace: true });
      return;
    }
    if (ALLOWED_WHEN_UNAVAILABLE.has(segment)) return;

    const target = `${base}/service-unavailable`;
    const pathNorm = location.pathname.replace(/\/$/, "") || "/";
    const targetNorm = target.replace(/\/$/, "") || "/";
    if (pathNorm === targetNorm) return;

    navigate(target, { replace: true });
  }, [
    session.ready,
    session.tableId,
    session.tableStatus,
    session.restaurantOpen,
    location.pathname,
    navigate,
    params.slug,
    params.tableNum,
    params.restaurantSlug,
    params.tableNumber,
    params.qrToken,
    session.qrToken,
  ]);

  return (
    <CustomerGlobalLoadingGate>
      <Outlet />
    </CustomerGlobalLoadingGate>
  );
}

export function CustomerRouteLayout() {
  return (
    <CustomerSessionProvider>
      <MenuProvider>
        <CartProvider>
          <CustomerOrderFlowOutlet />
        </CartProvider>
      </MenuProvider>
    </CustomerSessionProvider>
  );
}
