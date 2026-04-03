/// <reference types="vite/client" />

/** Base URL for apps/api (Vite: import.meta.env.VITE_API_BASE_URL). */
export function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '');
  }
  return 'http://localhost:8000';
}

export interface LogoutOnClosePayload {
  accessToken: string;
  eventId: string;
  delayMs?: number;
}

export function sendLogoutOnCloseBeacon(payload: LogoutOnClosePayload): boolean {
  if (typeof navigator === 'undefined') return false;
  const body = JSON.stringify({
    access_token: payload.accessToken,
    event_id: payload.eventId,
    delay_ms: payload.delayMs ?? 2500,
  });
  const url = `${getApiBaseUrl()}/v1/auth/logout-on-close`;
  if (typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' });
    return navigator.sendBeacon(url, blob);
  }
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
  return true;
}

export async function cancelLogoutOnClose(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  const res = await fetch(`${getApiBaseUrl()}/v1/auth/cancel-logout-on-close`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ event_id: eventId }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { cancelled?: boolean };
  return !!data.cancelled;
}

export async function extractMenuFromPdf(
  file: File,
  accessToken: string,
  restaurantId: string,
  restaurantName?: string
): Promise<unknown> {
  const base = getApiBaseUrl();
  const form = new FormData();
  form.append('file', file);
  form.append('restaurant_id', restaurantId);
  if (restaurantName?.trim()) {
    form.append('restaurant_name', restaurantName.trim());
  }
  const res = await fetch(`${base}/v1/menu/extract`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(res.ok ? 'Invalid JSON from API' : text || res.statusText);
  }
  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && data !== null && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : text || res.statusText;
    throw new Error(detail);
  }
  return data;
}

export interface QrTableEntry {
  table_number: number;
  url: string;
  png_base64: string;
}

export interface QrGenerateResponse {
  restaurant_name: string;
  restaurant_slug: string;
  tables: QrTableEntry[];
}

export async function generateTableQr(
  options: { restaurantId: string; tableCount: number; origin?: string },
  accessToken: string
): Promise<QrGenerateResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/v1/qr/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      restaurant_id: options.restaurantId,
      table_count: options.tableCount,
      ...(options.origin ? { origin: options.origin } : {}),
    }),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(res.ok ? 'Invalid JSON from API' : text || res.statusText);
  }
  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && data !== null && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : text || res.statusText;
    throw new Error(detail);
  }
  return data as QrGenerateResponse;
}

/** Persist extracted menu JSON to Supabase via API (replaces all categories/items for the restaurant). */
export async function replaceMenuFromExtract(
  restaurantId: string,
  menu: unknown,
  accessToken: string
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/v1/menu/replace`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ restaurant_id: restaurantId, menu }),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(res.ok ? 'Invalid JSON from API' : text || res.statusText);
  }
  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && data !== null && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : text || res.statusText;
    throw new Error(detail);
  }
}
