import React, { createContext, useContext } from "react";

export interface QrOrderContextValue {
  restaurantSlug: string | null;
  tableNumber: string;
}

const defaultValue: QrOrderContextValue = {
  restaurantSlug: null,
  tableNumber: "7",
};

const QrOrderContext = createContext<QrOrderContextValue>(defaultValue);

export function QrOrderProvider({
  value,
  children,
}: {
  value: QrOrderContextValue;
  children: React.ReactNode;
}) {
  return (
    <QrOrderContext.Provider value={value}>{children}</QrOrderContext.Provider>
  );
}

export function useQrOrder(): QrOrderContextValue {
  return useContext(QrOrderContext);
}

/** Base path for order flow (e.g. /order/tasty-bites/table/3) or "" for root. Use for navigation. */
export function useOrderBasePath(): string {
  const { restaurantSlug, tableNumber } = useContext(QrOrderContext);
  return restaurantSlug && tableNumber ? `/order/${restaurantSlug}/table/${tableNumber}` : "";
}
