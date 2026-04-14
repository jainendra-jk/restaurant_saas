const CACHE_VERSION = 1;
const CACHE_KEY_PREFIX = 'admin_qr_cache:';
const CACHE_PRIMED_PREFIX = 'admin_qr_cache_primed:';

export interface QrCacheEntry {
  tableId: string;
  tableNumber: number;
  qrPngBase64: string | null;
  orderUrl: string | null;
  updatedAt: number;
}

interface QrCachePayload {
  version: number;
  updatedAt: number;
  entries: Record<string, QrCacheEntry>;
}

function cacheKey(restaurantId: string): string {
  return `${CACHE_KEY_PREFIX}${restaurantId}`;
}

function primedKey(restaurantId: string): string {
  return `${CACHE_PRIMED_PREFIX}${restaurantId}`;
}

function readPayload(restaurantId: string): QrCachePayload {
  try {
    const raw = localStorage.getItem(cacheKey(restaurantId));
    if (!raw) return { version: CACHE_VERSION, updatedAt: Date.now(), entries: {} };
    const parsed = JSON.parse(raw) as Partial<QrCachePayload>;
    if (parsed.version !== CACHE_VERSION || !parsed.entries || typeof parsed.entries !== 'object') {
      return { version: CACHE_VERSION, updatedAt: Date.now(), entries: {} };
    }
    return {
      version: CACHE_VERSION,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      entries: parsed.entries as Record<string, QrCacheEntry>,
    };
  } catch {
    return { version: CACHE_VERSION, updatedAt: Date.now(), entries: {} };
  }
}

function writePayload(restaurantId: string, payload: QrCachePayload): void {
  try {
    localStorage.setItem(cacheKey(restaurantId), JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

export function getCachedQrByTableId(
  restaurantId: string,
  tableId: string
): QrCacheEntry | null {
  const payload = readPayload(restaurantId);
  return payload.entries[tableId] ?? null;
}

export function upsertCachedQrEntries(
  restaurantId: string,
  entries: Array<{
    tableId: string;
    tableNumber: number;
    qrPngBase64?: string | null;
    orderUrl?: string | null;
  }>
): void {
  const payload = readPayload(restaurantId);
  const now = Date.now();
  for (const row of entries) {
    if (!row.tableId) continue;
    payload.entries[row.tableId] = {
      tableId: row.tableId,
      tableNumber: row.tableNumber,
      qrPngBase64: row.qrPngBase64?.trim() || null,
      orderUrl: row.orderUrl?.trim() || null,
      updatedAt: now,
    };
  }
  payload.updatedAt = now;
  writePayload(restaurantId, payload);
}

export function markQrCachePrimed(restaurantId: string): void {
  try {
    localStorage.setItem(primedKey(restaurantId), 'true');
  } catch {
    // ignore storage failures
  }
}

export function isQrCachePrimed(restaurantId: string): boolean {
  try {
    return localStorage.getItem(primedKey(restaurantId)) === 'true';
  } catch {
    return false;
  }
}
