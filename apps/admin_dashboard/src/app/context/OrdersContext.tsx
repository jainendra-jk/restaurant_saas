import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { playNotificationSound } from '../utils/notificationSound';
import { toast } from 'sonner';
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
  initialLoading: boolean;
  refreshing: boolean;
  /** Backward-compatible alias for initialLoading. */
  loading: boolean;
  notifications: AdminNotification[];
  setOrders: (updater: Order[] | ((prev: Order[]) => Order[])) => void;
  setTables: (updater: Table[] | ((prev: Table[]) => Table[])) => void;
  updateOrderStatus: (orderNumber: string, newStatus: OrderStatus) => void;
  updateTableStatus: (tableId: string, status: 'active' | 'inactive') => void;
  updateTableSeats: (tableId: string, seats: number) => void;
  pushNotification: (notification: Omit<AdminNotification, 'id' | 'createdAt' | 'unread'> & { createdAt?: string }, options?: { playSound?: boolean }) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

const OrdersContext = createContext<OrdersState | null>(null);

export interface AdminNotification {
  id: string;
  type: 'new-order' | 'preparing' | 'served';
  title: string;
  description: string;
  createdAt: string;
  unread: boolean;
}

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

function mapDbTable(row: {
  id: string;
  number: number;
  status: string;
  seats: number;
  order_url?: string | null;
  qr_png_base64?: string | null;
}): Table {
  return {
    id: row.id,
    number: row.number,
    status: row.status as Table['status'],
    seats: row.seats,
    orderUrl: row.order_url ?? null,
    qrPngBase64: row.qr_png_base64 ?? null,
  };
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { restaurant } = useAuth();
  const [orders, setOrdersState] = useState<Order[]>(initialOrders);
  const [tables, setTablesState] = useState<Table[]>(initialTables);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const notifiedOrderIdsRef = useRef<Set<string>>(new Set());
  const tableNumberByIdRef = useRef<Map<string, number>>(new Map());
  const hasLoadedOnceRef = useRef(false);
  const loadVersionRef = useRef(0);

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
      let previousStatus: Table['status'] | null = null;
      setTablesState((prev) => {
        const current = prev.find((t) => t.id === tableId);
        previousStatus = current?.status ?? null;
        const next = prev.map((t) =>
          t.id === tableId ? { ...t, status } : t
        );
        if (!supabase) {
          mockTables = next;
          mockEmit();
        }
        return next;
      });
      if (supabase && restaurant?.id) {
        void (async () => {
          try {
            await supabase
              .from('tables')
              .update({ status })
              .eq('id', tableId)
              .eq('restaurant_id', restaurant.id)
              .throwOnError();

            // Lightweight consistency refresh for this row.
            const { data: refreshed } = await supabase
              .from('tables')
              .select('id, number, status, seats, order_url, qr_png_base64')
              .eq('id', tableId)
              .eq('restaurant_id', restaurant.id)
              .maybeSingle();
            if (refreshed) {
              const mapped = mapDbTable(refreshed);
              setTablesState((prev) => prev.map((t) => (t.id === tableId ? mapped : t)));
            }
          } catch (error) {
            if (previousStatus) {
              setTablesState((prev) =>
                prev.map((t) => (t.id === tableId ? { ...t, status: previousStatus } : t))
              );
            }
            console.error('Failed to update table status', error);
            toast.error('Could not update table status. Please retry.');
          }
        })();
      }
    },
    [restaurant?.id]
  );

  const updateTableSeats = useCallback((tableId: string, seats: number) => {
    let previousSeats: number | null = null;
    setTablesState((prev) => {
      const current = prev.find((t) => t.id === tableId);
      previousSeats = typeof current?.seats === 'number' ? current.seats : null;
      const next = prev.map((t) => (t.id === tableId ? { ...t, seats } : t));
      if (!supabase) {
        mockTables = next;
        mockEmit();
      }
      return next;
    });
    if (supabase && restaurant?.id) {
      void (async () => {
        try {
          await supabase
            .from('tables')
            .update({ seats })
            .eq('id', tableId)
            .eq('restaurant_id', restaurant.id)
            .throwOnError();

          const { data: refreshed } = await supabase
            .from('tables')
            .select('id, number, status, seats, order_url, qr_png_base64')
            .eq('id', tableId)
            .eq('restaurant_id', restaurant.id)
            .maybeSingle();
          if (refreshed) {
            const mapped = mapDbTable(refreshed);
            setTablesState((prev) => prev.map((t) => (t.id === tableId ? mapped : t)));
          }
        } catch (error) {
          if (typeof previousSeats === 'number') {
            setTablesState((prev) =>
              prev.map((t) => (t.id === tableId ? { ...t, seats: previousSeats } : t))
            );
          }
          console.error('Failed to update table seats', error);
          toast.error('Could not update table seats. Please retry.');
        }
      })();
    }
  }, [restaurant?.id]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const pushNotification = useCallback(
    (
      notification: Omit<AdminNotification, 'id' | 'createdAt' | 'unread'> & { createdAt?: string },
      options?: { playSound?: boolean }
    ) => {
      const createdAt = notification.createdAt ?? new Date().toISOString();
      const id = `${notification.type}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
      setNotifications((prev) => [
        {
          id,
          type: notification.type,
          title: notification.title,
          description: notification.description,
          createdAt,
          unread: true,
        },
        ...prev,
      ].slice(0, 50));

      if (options?.playSound !== false) {
        playNotificationSound();
      }
    },
    []
  );

  const notifyNewOrder = useCallback(
    (payload: {
      id?: string;
      order_number?: string;
      table_id?: string;
      total?: number;
      placed_at?: string;
    }) => {
      if (!payload.id || notifiedOrderIdsRef.current.has(payload.id)) return;
      notifiedOrderIdsRef.current.add(payload.id);
      const tableNo = payload.table_id
        ? (tableNumberByIdRef.current.get(payload.table_id) ?? 0)
        : 0;
      const total = Number(payload.total ?? 0);
      pushNotification(
        {
          type: 'new-order',
          title: `New Order - Table ${tableNo || 'Unknown'}`,
          description: `${payload.order_number ?? 'Order'} · ₹${Math.round(total)}`,
          createdAt: payload.placed_at ?? new Date().toISOString(),
        },
        { playSound: true }
      );
    },
    [pushNotification]
  );

  useEffect(() => {
    if (!supabase || !restaurant) {
      loadVersionRef.current += 1;
      setOrdersState(mockOrders);
      setTablesState(mockTables);
      setInitialLoading(false);
      setRefreshing(false);
      setNotifications([]);
      seenOrderIdsRef.current = new Set();
      notifiedOrderIdsRef.current = new Set();
      hasLoadedOnceRef.current = false;
      return;
    }

    seenOrderIdsRef.current = new Set();
    notifiedOrderIdsRef.current = new Set();
    hasLoadedOnceRef.current = false;
    loadVersionRef.current += 1;
    const effectLoadVersion = loadVersionRef.current;
    const load = async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const { data: tblRows, error: tblErr } = await supabase
          .from('tables')
          .select('id, number, status, seats, order_url, qr_png_base64')
          .eq('restaurant_id', restaurant.id)
          .order('number');
        if (tblErr) throw tblErr;
        if (effectLoadVersion !== loadVersionRef.current) return;

        if (tblRows?.length) {
          const mappedTables = tblRows.map(mapDbTable);
          setTablesState(mappedTables);
          tableNumberByIdRef.current = new Map(mappedTables.map((t) => [t.id, t.number]));
        } else {
          tableNumberByIdRef.current = new Map();
        }

        const { data: ordRows, error: ordErr } = await supabase
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
        if (ordErr) throw ordErr;
        if (effectLoadVersion !== loadVersionRef.current) return;

        if (ordRows?.length) {
          const tableMap = new Map<string, number>();
          (tblRows ?? []).forEach((t) => tableMap.set(t.id, t.number));
          setOrdersState(
            ordRows.map((o) =>
              mapDbOrder(o as Parameters<typeof mapDbOrder>[0], restaurant.name, tableMap.get(o.table_id) ?? 0)
            )
          );
          const incomingIds = new Set<string>();
          for (const row of ordRows) {
            if (!row.id) continue;
            incomingIds.add(row.id);
            if (!hasLoadedOnceRef.current && !seenOrderIdsRef.current.has(row.id)) {
              // First hydration should not ring for historical orders.
              seenOrderIdsRef.current.add(row.id);
              continue;
            }
            if (!seenOrderIdsRef.current.has(row.id)) {
              seenOrderIdsRef.current.add(row.id);
              notifyNewOrder({
                id: row.id,
                order_number: row.order_number ?? undefined,
                table_id: row.table_id ?? undefined,
                total: row.total ?? undefined,
                placed_at: row.placed_at ?? undefined,
              });
            }
          }
          // Keep seen IDs trimmed to active query scope.
          seenOrderIdsRef.current = incomingIds;
          hasLoadedOnceRef.current = true;
        } else {
          setOrdersState([]);
          seenOrderIdsRef.current = new Set();
          hasLoadedOnceRef.current = true;
        }
      } catch (err) {
        if (effectLoadVersion !== loadVersionRef.current) return;
        console.error('Failed to load orders/tables', err);
      } finally {
        if (effectLoadVersion !== loadVersionRef.current) return;
        if (mode === 'initial') {
          setInitialLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    };

    void load('initial');

    let pollInterval: ReturnType<typeof window.setInterval> | null = null;
    let subscribeWatchdog: ReturnType<typeof window.setTimeout> | null = null;
    const startPollingFallback = (reason: string) => {
      if (pollInterval) return;
      console.warn('[orders] realtime not subscribed; starting polling fallback', {
        restaurantId: restaurant.id,
        reason,
      });
      pollInterval = window.setInterval(() => {
        void load('refresh');
      }, 3000);
    };
    const stopPollingFallback = () => {
      if (pollInterval) {
        window.clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const sub = supabase
      .channel(`restaurant-${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          const handleInsert = async () => {
            const insertedNew = (payload?.new ?? {}) as Partial<{
              id: string;
              order_number: string | null;
              table_id: string | null;
              restaurant_id: string | null;
              total: number | null;
              placed_at: string | null;
            }>;

            const incomingRestaurantId = insertedNew.restaurant_id ?? null;
            if (incomingRestaurantId && incomingRestaurantId !== restaurant.id) return;

            const extracted = {
              id: insertedNew.id,
              order_number: insertedNew.order_number ?? undefined,
              table_id: insertedNew.table_id ?? undefined,
              total: insertedNew.total ?? undefined,
              placed_at: insertedNew.placed_at ?? undefined,
            };

            const isNonEmptyString = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
            const isValidTotal = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

            const needsFallback =
              !isNonEmptyString(extracted.id) ||
              !isNonEmptyString(extracted.order_number) ||
              !isNonEmptyString(extracted.table_id) ||
              !isNonEmptyString(extracted.placed_at) ||
              !isValidTotal(extracted.total);

            let nextPayload = extracted;

            if (needsFallback) {
              // Realtime payload can occasionally arrive without all columns; recover by querying Supabase.
              // Priority: match by order_number (when available), otherwise pick newest by placed_at.
              const { id, order_number } = extracted;

              let fetched:
                | {
                    id: string;
                    order_number: string | null;
                    table_id: string | null;
                    total: number | null;
                    placed_at: string | null;
                  }
                | null = null;

              if (id) {
                const { data } = await supabase
                  .from('orders')
                  .select('id, order_number, table_id, total, placed_at')
                  .eq('restaurant_id', restaurant.id)
                  .eq('id', id)
                  .maybeSingle();
                fetched = data ?? null;
              } else if (order_number) {
                const { data } = await supabase
                  .from('orders')
                  .select('id, order_number, table_id, total, placed_at')
                  .eq('restaurant_id', restaurant.id)
                  .eq('order_number', order_number)
                  .order('placed_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                fetched = data ?? null;
              } else {
                const { data } = await supabase
                  .from('orders')
                  .select('id, order_number, table_id, total, placed_at')
                  .eq('restaurant_id', restaurant.id)
                  .order('placed_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                fetched = data ?? null;
              }

              if (!fetched?.id) {
                console.warn('New order notification: realtime payload missing fields; fallback query returned none.', {
                  restaurantId: restaurant.id,
                  extracted,
                });
                void load('refresh');
                return;
              }

              nextPayload = {
                id: fetched.id,
                order_number: fetched.order_number ?? undefined,
                table_id: fetched.table_id ?? undefined,
                total: fetched.total ?? undefined,
                placed_at: fetched.placed_at ?? undefined,
              };
            }

            if (nextPayload.id) seenOrderIdsRef.current.add(nextPayload.id);
            notifyNewOrder(nextPayload);
            try {
              await load('refresh');
            } catch (err) {
              console.error('Failed to refresh orders after realtime insert', err);
            }
          };

          void handleInsert().catch((err) => {
            console.error('Realtime order INSERT handler failed', err);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          // Keeps status changes (preparing/served) in sync across open admin tabs.
          void load('refresh').catch((err) =>
            console.error('Failed to refresh orders after realtime update', err)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          void load('refresh').catch((err) =>
            console.error('Failed to refresh orders after realtime delete', err)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          const nextRid =
            ((payload?.new ?? {}) as Partial<{ restaurant_id: string | null }>).restaurant_id ??
            ((payload?.old ?? {}) as Partial<{ restaurant_id: string | null }>).restaurant_id ??
            null;
          if (nextRid && nextRid !== restaurant.id) return;
          void load('refresh').catch((err) => console.error('Failed to refresh tables after realtime change', err));
        }
      )
      .subscribe((status) => {
        console.info('[orders] realtime channel status', { restaurantId: restaurant.id, status });
        if (status === 'SUBSCRIBED') {
          stopPollingFallback();
          if (subscribeWatchdog) {
            window.clearTimeout(subscribeWatchdog);
            subscribeWatchdog = null;
          }
          return;
        }
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          startPollingFallback(status);
        }
      });

    // If subscribe never reaches SUBSCRIBED (blocked websockets, replication off), still refresh.
    subscribeWatchdog = window.setTimeout(() => {
      startPollingFallback('watchdog_timeout');
    }, 5000);

    return () => {
      loadVersionRef.current += 1;
      stopPollingFallback();
      if (subscribeWatchdog) window.clearTimeout(subscribeWatchdog);
      sub.unsubscribe();
    };
  }, [restaurant?.id, notifyNewOrder]);

  const value: OrdersState = {
    orders,
    tables,
    initialLoading,
    refreshing,
    loading: initialLoading,
    notifications,
    setOrders,
    setTables,
    updateOrderStatus,
    updateTableStatus,
    updateTableSeats,
    pushNotification,
    markAllNotificationsRead,
    clearNotifications,
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
