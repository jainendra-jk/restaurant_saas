import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import {
  initialOrders,
  initialTables,
  type Order,
  type OrderStatus,
  type OrderLine,
  type Table,
} from '../data/mock-data';

interface OrdersState {
  orders: Order[];
  tables: Table[];
  setOrders: (updater: Order[] | ((prev: Order[]) => Order[])) => void;
  setTables: (updater: Table[] | ((prev: Table[]) => Table[])) => void;
  updateOrderStatus: (orderNumber: string, newStatus: OrderStatus) => void;
  updateTableStatus: (tableId: string, status: 'active' | 'inactive') => void;
  updateTableSeats: (tableId: string, seats: number) => void;
}

const OrdersContext = createContext<OrdersState | null>(null);

// Mock store for when Supabase is not used
let mockOrders = [...initialOrders];
let mockTables = [...initialTables];
const mockListeners = new Set<() => void>();
function mockEmit() {
  mockListeners.forEach((l) => l());
}

function mapDbOrder(
  row: {
    id: string;
    order_number: string;
    table_id: string;
    status: string;
    customer_name: string | null;
    special_instructions: string | null;
    subtotal: number;
    tax: number;
    total: number;
    placed_at: string;
    restaurant?: { name?: string };
    order_items?: Array<{
      display_name: string;
      portion: string | null;
      quantity: number;
      unit_price: number;
      line_total: number;
      selected_option: string | null;
    }>;
  },
  restaurantName: string,
  tableNumber: number
): Order {
  const lines: OrderLine[] = (row.order_items ?? []).map((it) => ({
    displayName: it.display_name,
    portion: it.portion ?? undefined,
    quantity: it.quantity,
    unitPrice: it.unit_price,
    lineTotal: it.line_total,
    selectedOption: it.selected_option ?? undefined,
  }));
  return {
    orderNumber: row.order_number,
    placedAt: row.placed_at,
    tableNo: String(tableNumber),
    restaurantName,
    customerName: row.customer_name ?? undefined,
    specialInstructions: row.special_instructions ?? undefined,
    lines,
    status: row.status as OrderStatus,
    subTotal: row.subtotal,
    tax: row.tax,
    total: row.total,
  };
}

function mapDbTable(row: { id: string; number: number; status: string; seats: number }): Table {
  return {
    id: row.id,
    number: row.number,
    status: row.status as Table['status'],
    seats: row.seats,
  };
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { restaurant } = useAuth();
  const [orders, setOrdersState] = useState<Order[]>(initialOrders);
  const [tables, setTablesState] = useState<Table[]>(initialTables);

  const setOrders = useCallback((updater: Order[] | ((prev: Order[]) => Order[])) => {
    setOrdersState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!supabase) {
        mockOrders = next;
        mockEmit();
      }
      return next;
    });
  }, []);

  const setTables = useCallback((updater: Table[] | ((prev: Table[]) => Table[])) => {
    setTablesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!supabase) {
        mockTables = next;
        mockEmit();
      }
      return next;
    });
  }, []);

  const updateOrderStatus = useCallback(
    (orderNumber: string, newStatus: OrderStatus) => {
      setOrdersState((prev) => {
        const next = prev.map((o) =>
          o.orderNumber === orderNumber ? { ...o, status: newStatus } : o
        );
        if (!supabase) {
          mockOrders = next;
          mockEmit();
        }
        return next;
      });
      if (supabase && restaurant) {
        supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('restaurant_id', restaurant.id)
          .eq('order_number', orderNumber)
          .then(() => {});
      }
    },
    [restaurant?.id]
  );

  const updateTableStatus = useCallback(
    (tableId: string, status: 'active' | 'inactive') => {
      setTablesState((prev) => {
        const next = prev.map((t) =>
          t.id === tableId ? { ...t, status } : t
        );
        if (!supabase) {
          mockTables = next;
          mockEmit();
        }
        return next;
      });
      if (supabase) {
        supabase.from('tables').update({ status }).eq('id', tableId).then(() => {});
      }
    },
    []
  );

  const updateTableSeats = useCallback((tableId: string, seats: number) => {
    setTablesState((prev) => {
      const next = prev.map((t) => (t.id === tableId ? { ...t, seats } : t));
      if (!supabase) {
        mockTables = next;
        mockEmit();
      }
      return next;
    });
    if (supabase) {
      supabase.from('tables').update({ seats }).eq('id', tableId).then(() => {});
    }
  }, []);

  useEffect(() => {
    if (!supabase || !restaurant) {
      setOrdersState(mockOrders);
      setTablesState(mockTables);
      return;
    }

    const load = async () => {
      const { data: tblRows } = await supabase
        .from('tables')
        .select('id, number, status, seats')
        .eq('restaurant_id', restaurant.id)
        .order('number');
      if (tblRows?.length) {
        setTablesState(tblRows.map(mapDbTable));
      }

      const { data: ordRows } = await supabase
        .from('orders')
        .select(
          `
          id, order_number, table_id, status, customer_name, special_instructions,
          subtotal, tax, total, placed_at,
          order_items (display_name, portion, quantity, unit_price, line_total, selected_option)
        `
        )
        .eq('restaurant_id', restaurant.id)
        .order('placed_at', { ascending: false });

      if (ordRows?.length) {
        const tableMap = new Map<string, number>();
        (tblRows ?? []).forEach((t) => tableMap.set(t.id, t.number));
        setOrdersState(
          ordRows.map((o) =>
            mapDbOrder(o as Parameters<typeof mapDbOrder>[0], restaurant.name, tableMap.get(o.table_id) ?? 0)
          )
        );
      } else {
        setOrdersState([]);
      }
    };

    load();

    const sub = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [restaurant?.id]);

  const value: OrdersState = {
    orders,
    tables,
    setOrders,
    setTables,
    updateOrderStatus,
    updateTableStatus,
    updateTableSeats,
  };

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export function useOrders(): OrdersState {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider');
  return ctx;
}
