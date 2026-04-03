import { ShoppingBag, IndianRupee, ChefHat, Clock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { fetchAnalyticsSnapshot, type AnalyticsSnapshot } from '../utils/analytics';
import { useMenuConfig } from '../context/MenuConfigContext';
import { StatCard } from '../components/ui/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { useContainerSize } from '../hooks/useContainerSize';
import { AdminAnalyticsSkeleton } from '../components/AppSkeletons';

const WEEKDAY_TICKS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Read a CSS variable from :root; returns trimmed value or fallback. */
function getThemeVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function Analytics() {
  const { branding } = useMenuConfig();
  const { restaurant } = useAuth();
  const barContainer = useContainerSize();
  const lineContainer = useContainerSize();
  const currency = branding.currency;
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const refreshTimerRef = useRef<number | null>(null);
  const subRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const chartPrimary = getThemeVar('--brand-primary', getThemeVar('--primary', '#f97316'));
  const chartGrid = getThemeVar('--muted', '#f1f5f9');
  const chartAxis = getThemeVar('--muted-foreground', '#94a3b8');
  const tooltipStyle = {
    borderRadius: '12px',
    border: `1px solid ${getThemeVar('--border', '#f1f5f9')}`,
    backgroundColor: getThemeVar('--card', '#ffffff'),
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    fontSize: '13px',
  };

  const stats = useMemo(() => {
    const snapshot = data ?? {
      totalOrdersToday: 0,
      revenueToday: 0,
      mostOrderedDish: '-',
      peakHours: '-',
      ordersPerHour: [],
      revenueTrend: [],
    };
    return [
      {
        label: 'Total Orders Today',
        value: String(snapshot.totalOrdersToday),
        icon: ShoppingBag,
        color: 'bg-primary/10 text-primary',
      },
      {
        label: 'Revenue Today',
        value: `${currency}${snapshot.revenueToday.toLocaleString()}`,
        icon: IndianRupee,
        color: 'bg-status-served-light text-status-served',
      },
      {
        label: 'Most Ordered Dish',
        value: snapshot.mostOrderedDish,
        icon: ChefHat,
        color: 'bg-[var(--stat-popular-light)] text-[var(--stat-popular)]',
      },
      {
        label: 'Peak Ordering Hours',
        value: snapshot.peakHours,
        icon: Clock,
        color: 'bg-[var(--stat-peak-light)] text-[var(--stat-peak)]',
      },
    ];
  }, [data, currency]);

  useEffect(() => {
    if (!supabase || !restaurant?.id) {
      setData(null);
      setError(null);
      setInitialLoading(false);
      return;
    }

    let cancelled = false;
    setInitialLoading(true);

    const refresh = async () => {
      try {
        const next = await fetchAnalyticsSnapshot(supabase, restaurant.id);
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load analytics');
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    const scheduleRefresh = (delayMs: number) => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        void refresh();
      }, delayMs);
    };

    void refresh();

    // Realtime: refresh on new orders and on status updates (served transitions).
    if (subRef.current) {
      subRef.current.unsubscribe();
      subRef.current = null;
    }
    subRef.current = supabase
      .channel(`analytics-${restaurant.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const rid = (payload.new as { restaurant_id?: string } | null)?.restaurant_id;
          if (rid && rid !== restaurant.id) return;
          scheduleRefresh(350);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const newRow = (payload.new as { restaurant_id?: string; status?: string } | null) ?? null;
          const oldRow = (payload.old as { restaurant_id?: string; status?: string } | null) ?? null;
          const rid = newRow?.restaurant_id ?? oldRow?.restaurant_id;
          if (rid && rid !== restaurant.id) return;
          // Only refresh when status changes or totals could impact charts.
          if (newRow?.status !== oldRow?.status) {
            scheduleRefresh(350);
            return;
          }
          scheduleRefresh(650);
        }
      )
      .subscribe();

    // Hourly boundary refresh (so “per-hour” and “today” stay correct).
    const now = new Date();
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
    const hourTimer = window.setTimeout(() => scheduleRefresh(0), Math.max(1000, msUntilNextHour));

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      window.clearTimeout(hourTimer);
      if (subRef.current) {
        subRef.current.unsubscribe();
        subRef.current = null;
      }
    };
  }, [restaurant?.id]);

  if (initialLoading) {
    return <AdminAnalyticsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Track your restaurant's performance" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            {...stat}
            value={(stat as { value: string }).value}
          />
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
          {error}
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders per Hour */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-w-0">
          <h3 className="text-gray-900 mb-3">Orders per Hour</h3>
          <div ref={barContainer.ref} className="h-64 w-full min-w-0 overflow-hidden">
            {barContainer.width > 0 && barContainer.height > 0 && (
              <BarChart
                width={barContainer.width}
                height={barContainer.height}
                data={data?.ordersPerHour ?? []}
              >
                <CartesianGrid key="bar-grid" strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis key="bar-x" dataKey="hour" tick={{ fontSize: 12 }} stroke={chartAxis} />
                <YAxis key="bar-y" tick={{ fontSize: 12 }} stroke={chartAxis} />
                <Tooltip key="bar-tooltip" contentStyle={tooltipStyle} />
                <Bar key="bar-orders" dataKey="orders" fill={chartPrimary} radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-w-0">
          <h3 className="text-gray-900 mb-3">Revenue Trend (This Week)</h3>
          <div ref={lineContainer.ref} className="h-64 w-full min-w-0 overflow-hidden">
            {lineContainer.width > 0 && lineContainer.height > 0 && (
              <LineChart
                width={lineContainer.width}
                height={lineContainer.height}
                data={data?.revenueTrend ?? []}
              >
                <CartesianGrid key="line-grid" strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis
                  key="line-x"
                  dataKey="day"
                  type="category"
                  interval={0}
                  ticks={[...WEEKDAY_TICKS]}
                  tick={{ fontSize: 12 }}
                  stroke={chartAxis}
                />
                <YAxis
                  key="line-y"
                  width={64}
                  domain={[0, (max: number) => Math.max(1000, Math.ceil(max * 1.1))]}
                  tick={{ fontSize: 12 }}
                  stroke={chartAxis}
                  tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  key="line-tooltip"
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${currency}${value.toLocaleString()}`, 'Revenue']}
                />
                <Line
                  key="line-revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke={chartPrimary}
                  strokeWidth={2.5}
                  isAnimationActive={false}
                  dot={{ fill: chartPrimary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}