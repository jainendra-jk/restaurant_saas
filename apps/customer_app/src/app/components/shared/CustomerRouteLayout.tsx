import { Outlet } from "react-router";
import { CustomerSessionProvider } from "../../context/CustomerSessionContext";
import { MenuProvider } from "../../context/MenuContext";
import { CartProvider } from "./CartContext";

export function CustomerRouteLayout() {
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
