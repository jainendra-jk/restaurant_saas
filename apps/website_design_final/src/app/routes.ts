import { createBrowserRouter } from "react-router";
import { HomePage } from "./components/HomePage";
import { CheckoutPage } from "./components/CheckoutPage";
import { BillingReturnPage } from "./components/BillingReturnPage";
import { PrivacyPage, TermsPage, SecurityPage } from "./components/LegalPage";
import { RootLayout } from "./components/RootLayout";
import { RequireAuth } from "./components/dashboard/RequireAuth";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { DashboardProducts } from "./components/dashboard/DashboardProducts";
import { DashboardSubscription } from "./components/dashboard/DashboardSubscription";
import { DashboardSettings } from "./components/dashboard/DashboardSettings";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: "/", Component: HomePage },
      { path: "/checkout", Component: CheckoutPage },
      { path: "/checkout/billing-return", Component: BillingReturnPage },
      { path: "/privacy", Component: PrivacyPage },
      { path: "/terms", Component: TermsPage },
      { path: "/security", Component: SecurityPage },
      {
        path: "/dashboard",
        Component: RequireAuth,
        children: [
          {
            Component: DashboardLayout,
            children: [
              { index: true, Component: DashboardOverview },
              { path: "products", Component: DashboardProducts },
              { path: "subscription", Component: DashboardSubscription },
              { path: "settings", Component: DashboardSettings },
            ],
          },
        ],
      },
    ],
  },
]);
