import type { OrderStatus } from '../data/mock-data';

/** Format ISO 8601 for bills: "DD/MM/YYYY, HH:mm am/pm" (customer bill, kitchen receipt) */
export function formatISODateForBill(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  const time = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  return `${day}/${month}/${year}, ${time}`;
}

/** Format 24h time string (HH:mm or H:mm) to AM/PM (e.g. "23:00" → "11:00 PM") */
export function formatTime24ToAmPm(timeStr: string): string {
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] ? parseInt(parts[1], 10) : 0;
  const hour = isNaN(h) ? 0 : h % 24;
  const min = isNaN(m) ? 0 : Math.min(59, Math.max(0, m));
  if (hour === 0) return `12:${String(min).padStart(2, '0')} AM`;
  if (hour === 12) return `12:${String(min).padStart(2, '0')} PM`;
  if (hour < 12) return `${hour}:${String(min).padStart(2, '0')} AM`;
  return `${hour - 12}:${String(min).padStart(2, '0')} PM`;
}

/** Format ISO 8601 placedAt for display (e.g. "12:34 PM") */
export function formatPlacedAt(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

/** Sort orders by placedAt (ISO 8601) from earliest to latest */
export function sortByPlacedAt<T extends { placedAt: string }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime());
}

/** Priority map for sorting orders by status */
export const ORDER_STATUS_PRIORITY: Record<string, number> = {
  new: 0,
  preparing: 1,
  served: 2,
};

/** Shared status config for badges, dots, slider labels */
export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  new: {
    label: 'New Order',
    bg: 'bg-status-new-light',
    text: 'text-status-new-text',
    dot: 'bg-status-new',
  },
  preparing: {
    label: 'Preparing',
    bg: 'bg-status-preparing-light',
    text: 'text-status-preparing-text',
    dot: 'bg-status-preparing',
  },
  served: {
    label: 'Served',
    bg: 'bg-status-served-light',
    text: 'text-status-served-text',
    dot: 'bg-status-served',
  },
};
