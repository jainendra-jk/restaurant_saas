import { Outlet, useParams } from "react-router";
import { CustomerSessionProvider } from "../../context/CustomerSessionContext";
import { QrOrderProvider } from "../../context/QrOrderContext";
import { MenuProvider } from "../../context/MenuContext";
import { CartProvider } from "./CartContext";

export function OrderEntryLayout() {
  const { restaurantSlug, tableNumber } = useParams<{
    restaurantSlug: string;
    tableNumber: string;
  }>();

  return (
    <QrOrderProvider
      value={{
        restaurantSlug: restaurantSlug ?? null,
        tableNumber: tableNumber ?? "7",
      }}
    >
      <CustomerSessionProvider>
        <MenuProvider>
          <CartProvider>
            <Outlet />
          </CartProvider>
        </MenuProvider>
      </CustomerSessionProvider>
    </QrOrderProvider>
  );
}
