import { Outlet, useLocation, Navigate } from "react-router";
import { CustomerSessionProvider } from "../../context/CustomerSessionContext";
import { MenuProvider } from "../../context/MenuContext";
import { CartProvider } from "./CartContext";
import { isTableEnabled } from "../../utils/tableConfig";

const SERVICE_UNAVAILABLE_PATH = "/service-unavailable";

export function RootLayout() {
  const location = useLocation();
  const pathname = location.pathname;

  if (!isTableEnabled && pathname !== SERVICE_UNAVAILABLE_PATH) {
    return <Navigate to={SERVICE_UNAVAILABLE_PATH} replace />;
  }

  return (
    <CustomerSessionProvider>
      <MenuProvider>
        <CartProvider>
          <Outlet />
        </CartProvider>
      </MenuProvider>
    </CustomerSessionProvider>
  );
}
