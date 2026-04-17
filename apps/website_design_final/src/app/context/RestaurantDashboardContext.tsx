import { createContext, useContext, type ReactNode } from "react";
import { useRestaurantDashboardData } from "../hooks/useRestaurantDashboardData";
import { useWebsiteAuth } from "./WebsiteAuthContext";

type RestaurantDashboardContextValue = ReturnType<typeof useRestaurantDashboardData>;

const RestaurantDashboardContext = createContext<RestaurantDashboardContextValue | null>(null);

export function RestaurantDashboardProvider({ children }: { children: ReactNode }) {
  const { primaryRestaurant } = useWebsiteAuth();
  const data = useRestaurantDashboardData(primaryRestaurant?.id ?? null);
  return (
    <RestaurantDashboardContext.Provider value={data}>{children}</RestaurantDashboardContext.Provider>
  );
}

export function useRestaurantDashboard() {
  const ctx = useContext(RestaurantDashboardContext);
  if (!ctx) throw new Error("useRestaurantDashboard must be used within RestaurantDashboardProvider");
  return ctx;
}
