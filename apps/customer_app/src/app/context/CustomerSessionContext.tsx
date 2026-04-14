import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { useParams, useSearchParams } from 'react-router';
import { supabase } from '../../lib/supabase';

export type TableServiceStatus = 'active' | 'inactive';

export interface CustomerSession {
  slug: string | null;
  qrToken: string | null;
  tableNum: number | null;
  tableId: string | null;
  /** Set when a table row was returned from Supabase; null if missing or not resolved yet. */
  tableStatus: TableServiceStatus | null;
  /** Restaurant-level ordering switch. false means store is closed for QR ordering. */
  restaurantOpen: boolean;
  ready: boolean;
}

const CustomerSessionContext = createContext<CustomerSession | null>(null);

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const params = useParams<{
    slug?: string;
    tableNum?: string;
    restaurantSlug?: string;
    tableNumber?: string;
    qrToken?: string;
  }>();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<CustomerSession>({
    slug: null,
    qrToken: null,
    tableNum: null,
    tableId: null,
    tableStatus: null,
    restaurantOpen: false,
    ready: false,
  });

  useEffect(() => {
    const slug = params.restaurantSlug ?? params.slug ?? searchParams.get('r');
    const qrToken = params.qrToken ?? searchParams.get('q');
    const tableParam = params.tableNumber ?? params.tableNum ?? searchParams.get('t');
    const tableNum = tableParam ? parseInt(tableParam, 10) : null;
    const validNum = tableNum != null && !isNaN(tableNum) && tableNum > 0;

    if (!slug || (!qrToken && !validNum) || !supabase) {
      setSession({
        slug: slug || null,
        qrToken: qrToken || null,
        tableNum: validNum ? tableNum : null,
        tableId: null,
        tableStatus: null,
        restaurantOpen: false,
        ready: true,
      });
      return;
    }

    let cancelled = false;
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    let pollInterval: ReturnType<typeof window.setInterval> | null = null;
    let subscribeWatchdog: ReturnType<typeof window.setTimeout> | null = null;
    const stopPollingFallback = () => {
      if (pollInterval) {
        window.clearInterval(pollInterval);
        pollInterval = null;
      }
    };
    const startPollingFallback = () => {
      if (pollInterval) return;
      pollInterval = window.setInterval(() => {
        if (!cancelled) void load();
      }, 15000);
    };
    const load = async () => {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, is_open')
        .eq('slug', slug)
        .maybeSingle();
      if (cancelled || !rest) {
        setSession({
          slug,
          qrToken: qrToken || null,
          tableNum,
          tableId: null,
          tableStatus: null,
          restaurantOpen: false,
          ready: true,
        });
        return;
      }
      const tableQuery = supabase
        .from('tables')
        .select('id, status, number, qr_token')
        .eq('restaurant_id', rest.id);
      const { data: tbl } = await (qrToken
        ? tableQuery.eq('qr_token', qrToken).maybeSingle()
        : tableQuery.eq('number', tableNum!).maybeSingle());
      const status =
        tbl?.status === 'active' || tbl?.status === 'inactive' ? tbl.status : null;
      setSession({
        slug,
        qrToken: (tbl?.qr_token as string | undefined) ?? qrToken ?? null,
        tableNum: typeof tbl?.number === 'number' ? tbl.number : tableNum,
        tableId: tbl?.id ?? null,
        tableStatus: status,
        restaurantOpen: rest.is_open !== false,
        ready: true,
      });
      if (!channel) {
        const tableFilter = tbl?.id ? `id=eq.${tbl.id}` : `restaurant_id=eq.${rest.id}`;
        channel = supabase
          .channel(`customer-session-${rest.id}-${tbl?.id ?? 'na'}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'restaurants',
              filter: `id=eq.${rest.id}`,
            },
            () => {
              void load();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tables',
              filter: tableFilter,
            },
            () => {
              void load();
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              stopPollingFallback();
              if (subscribeWatchdog) {
                window.clearTimeout(subscribeWatchdog);
                subscribeWatchdog = null;
              }
              return;
            }
            if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
              startPollingFallback();
            }
          });
      }
    };
    void load();
    subscribeWatchdog = window.setTimeout(() => {
      startPollingFallback();
    }, 5000);
    return () => {
      cancelled = true;
      stopPollingFallback();
      if (subscribeWatchdog) window.clearTimeout(subscribeWatchdog);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [
    params.restaurantSlug,
    params.tableNumber,
    params.slug,
    params.tableNum,
    params.qrToken,
    searchParams,
  ]);

  const value = useMemo(
    () => session,
    [
      session.slug,
      session.qrToken,
      session.tableNum,
      session.tableId,
      session.tableStatus,
      session.restaurantOpen,
      session.ready,
    ]
  );

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession(): CustomerSession {
  const ctx = useContext(CustomerSessionContext);
  return ctx ?? {
    slug: null,
    qrToken: null,
    tableNum: null,
    tableId: null,
    tableStatus: null,
    restaurantOpen: false,
    ready: true,
  };
}

/** Ordering (menu/cart/checkout) is allowed only when the table row exists and is active in Supabase. */
export function isTableOrderingAvailable(s: CustomerSession): boolean {
  return Boolean(s.restaurantOpen && s.tableId && s.tableStatus === 'active');
}
