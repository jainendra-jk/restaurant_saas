import type { SupabaseClient } from '@supabase/supabase-js';

type OrdersPerHourPoint = { hour: string; orders: number };
type RevenueTrendPoint = { day: string; revenue: number };

export interface AnalyticsSnapshot {
  totalOrdersToday: number;
  revenueToday: number;
  mostOrderedDish: string;
  peakHours: string;
  ordersPerHour: OrdersPerHourPoint[];
  revenueTrend: RevenueTrendPoint[];
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfLocalWeekMonday(d: Date): Date {
  const start = startOfLocalDay(d);
  const day = start.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  start.setDate(start.getDate() - diff);
  return start;
}

function formatHourLabel(hour24: number): string {
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hr = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hr} ${ampm}`;
}

function formatHourRange(startHour24: number, endHour24Exclusive: number): string {
  const startLabel = `${(startHour24 % 12 === 0 ? 12 : startHour24 % 12)}:00 ${startHour24 >= 12 ? 'PM' : 'AM'}`;
  const endH = endHour24Exclusive % 24;
  const endLabel = `${(endH % 12 === 0 ? 12 : endH % 12)}:00 ${endH >= 12 ? 'PM' : 'AM'}`;
  return `${startLabel} - ${endLabel}`;
}

function clampNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumBy<T>(arr: T[], pick: (x: T) => number): number {
  return arr.reduce((acc, x) => acc + pick(x), 0);
}

type DbOrderRow = {
  id: string;
  status: string;
  total: number | string | null;
  placed_at: string;
};

type DbOrderItemRow = {
  display_name: string;
  quantity: number | string | null;
};

/** Compute snapshot for current restaurant in browser-local timezone. */
export async function fetchAnalyticsSnapshot(
  supabase: SupabaseClient,
  restaurantId: string,
  now = new Date()
): Promise<AnalyticsSnapshot> {
  const todayStart = startOfLocalDay(now);
  const todayEnd = addDays(todayStart, 1);
  const weekStart = startOfLocalWeekMonday(now);
  const weekEnd = addDays(weekStart, 7);

  const todayStartIso = todayStart.toISOString();
  const todayEndIso = todayEnd.toISOString();
  const weekStartIso = weekStart.toISOString();
  const weekEndIso = weekEnd.toISOString();

  const { data: todayOrdersRaw, error: todayErr } = await supabase
    .from('orders')
    .select('id, status, total, placed_at')
    .eq('restaurant_id', restaurantId)
    .gte('placed_at', todayStartIso)
    .lt('placed_at', todayEndIso)
    .order('placed_at', { ascending: true });
  if (todayErr) throw todayErr;

  const todayOrders = (todayOrdersRaw ?? []) as DbOrderRow[];

  const totalOrdersToday = todayOrders.length;
  const servedToday = todayOrders.filter((o) => o.status === 'served');
  const revenueToday = Math.round(sumBy(servedToday, (o) => clampNumber(o.total)));

  // Orders per hour (local)
  const perHour = new Array<number>(24).fill(0);
  for (const o of todayOrders) {
    const dt = new Date(o.placed_at);
    const h = dt.getHours();
    if (h >= 0 && h < 24) perHour[h] += 1;
  }
  const ordersPerHour: OrdersPerHourPoint[] = perHour
    .map((orders, hour24) => ({ hour: formatHourLabel(hour24), orders }))
    .filter((p) => p.orders > 0 || true); // keep all 24 for consistent chart

  // Peak 2-hour window based on perHour counts
  let bestStart = 0;
  let bestSum = -1;
  for (let h = 0; h < 23; h++) {
    const s = perHour[h] + perHour[h + 1];
    if (s > bestSum) {
      bestSum = s;
      bestStart = h;
    }
  }
  const peakHours = formatHourRange(bestStart, bestStart + 2);

  // Most ordered dish (today, across all statuses) by sum(quantity) from order_items
  const orderIds = todayOrders.map((o) => o.id).filter(Boolean);
  let mostOrderedDish = '-';
  if (orderIds.length) {
    // Supabase has practical limits for large IN lists; chunk defensively.
    const counts = new Map<string, number>();
    const chunkSize = 200;
    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize);
      const { data: itemsRaw, error: itemsErr } = await supabase
        .from('order_items')
        .select('display_name, quantity')
        .in('order_id', chunk);
      if (itemsErr) throw itemsErr;
      const items = (itemsRaw ?? []) as DbOrderItemRow[];
      for (const it of items) {
        const name = typeof it.display_name === 'string' ? it.display_name.trim() : '';
        if (!name) continue;
        const q = clampNumber(it.quantity);
        counts.set(name, (counts.get(name) ?? 0) + q);
      }
    }
    if (counts.size) {
      const sorted = Array.from(counts.entries()).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });
      mostOrderedDish = sorted[0]![0];
    }
  }

  // Weekly revenue trend (Mon..Sun) served only
  const { data: weekOrdersRaw, error: weekErr } = await supabase
    .from('orders')
    .select('status, total, placed_at')
    .eq('restaurant_id', restaurantId)
    .gte('placed_at', weekStartIso)
    .lt('placed_at', weekEndIso);
  if (weekErr) throw weekErr;

  const weekTotals = new Array<number>(7).fill(0);
  for (const row of (weekOrdersRaw ?? []) as Array<{ status: string; total: number | string | null; placed_at: string }>) {
    if (row.status !== 'served') continue;
    const dt = new Date(row.placed_at);
    const dayStart = startOfLocalDay(dt);
    const idx = Math.floor((dayStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
    if (idx >= 0 && idx < 7) weekTotals[idx] += clampNumber(row.total);
  }
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const revenueTrend: RevenueTrendPoint[] = weekTotals.map((revenue, i) => ({
    day: dayLabels[i] ?? `D${i + 1}`,
    revenue: Math.round(revenue),
  }));

  return {
    totalOrdersToday,
    revenueToday,
    mostOrderedDish,
    peakHours,
    ordersPerHour,
    revenueTrend,
  };
}

