/// <reference types="vite/client" />

/** Base URL for apps/api (Vite: import.meta.env.VITE_API_BASE_URL). */
export function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '');
  }
  return 'http://localhost:8000';
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
