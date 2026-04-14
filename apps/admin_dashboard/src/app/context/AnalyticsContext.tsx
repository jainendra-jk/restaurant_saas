import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import {
  fetchHourlyAnalyticsSnapshot,
  fetchLiveTodayMetrics,
  type HourlyAnalyticsSnapshot,
  type LiveTodayMetrics,
} from '../utils/analytics';
import { withTimeout } from '../utils/withTimeout';

interface AnalyticsContextValue {
  hourly: HourlyAnalyticsSnapshot;
  live: LiveTodayMetrics;
  loading: boolean;
  error: string | null;
  refreshLive: () => Promise<void>;
  refreshHourly: () => Promise<void>;
}

const DEFAULT_HOURLY: HourlyAnalyticsSnapshot = {
  mostOrderedDish: '-',
  peakHours: '-',
  ordersPerHour: [],
  revenueTrend: [],
  capturedAt: null,
};

const DEFAULT_LIVE: LiveTodayMetrics = {
  totalOrdersToday: 0,
  revenueToday: 0,
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { restaurant } = useAuth();
  const [hourly, setHourly] = useState<HourlyAnalyticsSnapshot>(DEFAULT_HOURLY);
  const [live, setLive] = useState<LiveTodayMetrics>(DEFAULT_LIVE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const hourTimerRef = useRef<number | null>(null);
  const subRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const lastLiveRefreshAtRef = useRef(0);
  const lastHourlyRefreshAtRef = useRef(0);
  const requestVersionRef = useRef(0);

  const refreshLive = useCallback(async () => {
    if (!supabase || !restaurant?.id) return;
    const now = Date.now();
    if (now - lastLiveRefreshAtRef.current < 500) return;
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }
    refreshInFlightRef.current = true;
    lastLiveRefreshAtRef.current = now;
    try {
      const next = await withTimeout(
        fetchLiveTodayMetrics(supabase, restaurant.id),
        10000,
        'Live analytics fetch'
      );
      setLive(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh live analytics');
    } finally {
      refreshInFlightRef.current = false;
      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        await refreshLive();
      }
    }
  }, [restaurant?.id]);

  const refreshHourly = useCallback(async () => {
    if (!supabase || !restaurant?.id) return;
    try {
      const next = await withTimeout(
        fetchHourlyAnalyticsSnapshot(supabase, restaurant.id),
        12000,
        'Hourly analytics fetch'
      );
      setHourly(next);
      lastHourlyRefreshAtRef.current = Date.now();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh hourly analytics');
    }
  }, [restaurant?.id]);

  useEffect(() => {
    if (!supabase || !restaurant?.id) {
      setHourly(DEFAULT_HOURLY);
      setLive(DEFAULT_LIVE);
      setLoading(false);
      setError(null);
      requestVersionRef.current += 1;
      return;
    }

    let cancelled = false;
    requestVersionRef.current += 1;
    const effectVersion = requestVersionRef.current;
    setLoading(true);

    const runInitial = async () => {
      try {
        const [nextHourly, nextLive] = await Promise.all([
          withTimeout(fetchHourlyAnalyticsSnapshot(supabase, restaurant.id), 12000, 'Initial hourly analytics'),
          withTimeout(fetchLiveTodayMetrics(supabase, restaurant.id), 10000, 'Initial live analytics'),
        ]);
        if (cancelled || effectVersion !== requestVersionRef.current) return;
        setHourly(nextHourly);
        setLive(nextLive);
        lastHourlyRefreshAtRef.current = Date.now();
        setError(null);
      } catch (e) {
        if (cancelled || effectVersion !== requestVersionRef.current) return;
        setError(e instanceof Error ? e.message : 'Failed to load analytics');
      } finally {
        if (cancelled || effectVersion !== requestVersionRef.current) return;
        setLoading(false);
      }
    };

    const scheduleLiveRefresh = (delayMs: number) => {
      if (document.visibilityState !== 'visible' && delayMs > 0) return;
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        void refreshLive();
      }, delayMs);
    };

    void runInitial();

    if (subRef.current) {
      subRef.current.unsubscribe();
      subRef.current = null;
    }
    subRef.current = supabase
      .channel(`shared-analytics-${restaurant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        () => scheduleLiveRefresh(300)
      )
      .subscribe();

    const now = new Date();
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
    hourTimerRef.current = window.setTimeout(() => {
      void refreshHourly();
    }, Math.max(1000, msUntilNextHour));

    const handleResume = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshLive();
      if (Date.now() - lastHourlyRefreshAtRef.current > 60 * 60 * 1000) {
        void refreshHourly();
      }
    };
    window.addEventListener('focus', handleResume);
    document.addEventListener('visibilitychange', handleResume);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleResume);
      document.removeEventListener('visibilitychange', handleResume);
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (hourTimerRef.current) {
        window.clearTimeout(hourTimerRef.current);
        hourTimerRef.current = null;
      }
      if (subRef.current) {
        subRef.current.unsubscribe();
        subRef.current = null;
      }
    };
  }, [refreshHourly, refreshLive, restaurant?.id]);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      hourly,
      live,
      loading,
      error,
      refreshLive,
      refreshHourly,
    }),
    [hourly, live, loading, error, refreshLive, refreshHourly]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalyticsData(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalyticsData must be used within AnalyticsProvider');
  return ctx;
}
