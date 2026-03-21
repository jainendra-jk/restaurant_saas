import React, { createContext, useContext, useState, useCallback } from "react";
import { MenuItem, PortionSize } from "./menu-data";

export type { PortionSize };

export interface CartItem {
  item: MenuItem;
  quantity: number;
  portion: PortionSize;
  /** Selected flavor/type when item has options (e.g. "Mango" for Lassi). */
  selectedOption?: string;
}

export function getPortionPrice(item: MenuItem, portion: PortionSize): number {
  switch (portion) {
    case "quarter":
      return item.priceQuarter ?? Math.round(item.price * 0.35);
    case "half":
      return item.priceHalf ?? Math.round(item.price * 0.6);
    case "full":
    default:
      return item.price;
  }
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, portion: PortionSize, selectedOption?: string) => void;
  removeItem: (itemId: string, portion: PortionSize, selectedOption?: string) => void;
  updateQuantity: (itemId: string, portion: PortionSize, quantity: number, selectedOption?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  getItemQuantity: (itemId: string, portion: PortionSize, selectedOption?: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const matchLine = (ci: CartItem, itemId: string, portion: PortionSize, selectedOption?: string) =>
    ci.item.id === itemId && ci.portion === portion && (ci.selectedOption ?? undefined) === (selectedOption ?? undefined);

  const addItem = useCallback((item: MenuItem, portion: PortionSize, selectedOption?: string) => {
    setItems((prev) => {
      const existing = prev.find((ci) => matchLine(ci, item.id, portion, selectedOption));
      if (existing) {
        return prev.map((ci) =>
          matchLine(ci, item.id, portion, selectedOption)
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prev, { item, quantity: 1, portion, selectedOption }];
    });
  }, []);

  const removeItem = useCallback((itemId: string, portion: PortionSize, selectedOption?: string) => {
    setItems((prev) =>
      prev.filter((ci) => !matchLine(ci, itemId, portion, selectedOption))
    );
  }, []);

  const updateQuantity = useCallback(
    (itemId: string, portion: PortionSize, quantity: number, selectedOption?: string) => {
      if (quantity <= 0) {
        setItems((prev) =>
          prev.filter((ci) => !matchLine(ci, itemId, portion, selectedOption))
        );
      } else {
        setItems((prev) =>
          prev.map((ci) =>
            matchLine(ci, itemId, portion, selectedOption)
              ? { ...ci, quantity }
              : ci
          )
        );
      }
    },
    []
  );

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, ci) => sum + ci.quantity, 0);
  const totalPrice = items.reduce(
    (sum, ci) => sum + getPortionPrice(ci.item, ci.portion) * ci.quantity,
    0
  );

  const getItemQuantity = useCallback(
    (itemId: string, portion: PortionSize, selectedOption?: string) => {
      const ci = items.find((c) => matchLine(c, itemId, portion, selectedOption));
      return ci?.quantity || 0;
    },
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
