import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./components/shared/RootLayout";
import { CustomerRouteLayout } from "./components/shared/CustomerRouteLayout";
import { LoadingScreen } from "./components/screens/LoadingScreen";
import { MenuScreen } from "./components/screens/MenuScreen";
import { CartScreen } from "./components/screens/CartScreen";
import { CheckoutScreen } from "./components/screens/CheckoutScreen";
import { ConfirmationScreen } from "./components/screens/ConfirmationScreen";
import { ServiceUnavailableScreen } from "./components/screens/ServiceUnavailableScreen";

export const router = createBrowserRouter([
  {
    path: "/service-unavailable",
    Component: ServiceUnavailableScreen,
  },
  {
    path: "/r/:slug/t/:tableNum",
    Component: CustomerRouteLayout,
    children: [
      { index: true, Component: LoadingScreen },
      { path: "menu", Component: MenuScreen },
      { path: "cart", Component: CartScreen },
      { path: "checkout", Component: CheckoutScreen },
      { path: "confirmation", Component: ConfirmationScreen },
      { path: "*", Component: LoadingScreen },
    ],
  },
  {
    path: "/order/:restaurantSlug/table/:tableNumber",
    Component: CustomerRouteLayout,
    children: [
      { index: true, Component: LoadingScreen },
      { path: "menu", Component: MenuScreen },
      { path: "cart", Component: CartScreen },
      { path: "checkout", Component: CheckoutScreen },
      { path: "confirmation", Component: ConfirmationScreen },
      { path: "service-unavailable", Component: ServiceUnavailableScreen },
      { path: "*", Component: LoadingScreen },
    ],
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: LoadingScreen },
      { path: "menu", Component: MenuScreen },
      { path: "cart", Component: CartScreen },
      { path: "checkout", Component: CheckoutScreen },
      { path: "confirmation", Component: ConfirmationScreen },
      { path: "*", Component: LoadingScreen },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
