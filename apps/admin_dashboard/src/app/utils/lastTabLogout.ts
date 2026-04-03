import { cancelLogoutOnClose, sendLogoutOnCloseBeacon } from '@restaurant-saas/api-client';

const TAB_REGISTRY_KEY = 'admin:last_tab_registry_v1';
const PENDING_EVENT_KEY = 'admin:last_tab_pending_event_v1';
const HEARTBEAT_MS = 5000;
const STALE_MS = 20000;

type TabRegistry = Record<string, number>;

function nowMs(): number {
  return Date.now();
}

function readRegistry(): TabRegistry {
  try {
    const raw = window.localStorage.getItem(TAB_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TabRegistry;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRegistry(next: TabRegistry): void {
  window.localStorage.setItem(TAB_REGISTRY_KEY, JSON.stringify(next));
}

function pruneStale(registry: TabRegistry, at: number): TabRegistry {
  const result: TabRegistry = {};
  Object.entries(registry).forEach(([tabId, ts]) => {
    if (at - ts < STALE_MS) result[tabId] = ts;
  });
  return result;
}

function upsertTab(tabId: string): TabRegistry {
  const current = pruneStale(readRegistry(), nowMs());
  current[tabId] = nowMs();
  writeRegistry(current);
  return current;
}

function removeTab(tabId: string): TabRegistry {
  const current = pruneStale(readRegistry(), nowMs());
  delete current[tabId];
  writeRegistry(current);
  return current;
}

function getOrCreateTabId(): string {
  const existing = window.sessionStorage.getItem('admin:last_tab_id');
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  window.sessionStorage.setItem('admin:last_tab_id', id);
  return id;
}

function getPendingEventId(): string | null {
  return window.sessionStorage.getItem(PENDING_EVENT_KEY);
}

function setPendingEventId(eventId: string): void {
  window.sessionStorage.setItem(PENDING_EVENT_KEY, eventId);
}

function clearPendingEventId(): void {
  window.sessionStorage.removeItem(PENDING_EVENT_KEY);
}

export interface LastTabLogoutController {
  start: () => void;
  stop: () => void;
}

export function createLastTabLogoutController(accessToken: string): LastTabLogoutController {
  const tabId = getOrCreateTabId();
  let heartbeatTimer: number | null = null;
  let unloadHandled = false;

  const onStorage = () => {
    upsertTab(tabId);
  };

  const onUnload = () => {
    if (unloadHandled) return;
    unloadHandled = true;
    const next = removeTab(tabId);
    if (Object.keys(next).length > 0) return;
    const eventId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `evt-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    setPendingEventId(eventId);
    sendLogoutOnCloseBeacon({ accessToken, eventId, delayMs: 2500 });
  };

  const start = () => {
    upsertTab(tabId);
    const pendingEventId = getPendingEventId();
    if (pendingEventId) {
      cancelLogoutOnClose(accessToken, pendingEventId)
        .catch(() => undefined)
        .finally(() => clearPendingEventId());
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
    heartbeatTimer = window.setInterval(() => {
      upsertTab(tabId);
    }, HEARTBEAT_MS);
  };

  const stop = () => {
    if (heartbeatTimer !== null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('pagehide', onUnload);
    window.removeEventListener('beforeunload', onUnload);
    removeTab(tabId);
  };

  return { start, stop };
}
