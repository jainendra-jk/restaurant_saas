import { supabase } from '../../lib/supabase';

export interface SecuritySettingsData {
  sessionTimeout: string;
}

export interface LoginSessionEntry {
  id: string;
  device: string;
  ip: string;
  time: string;
  current: boolean;
}

const SESSION_HISTORY_KEY_PREFIX = 'admin_security_session_history:';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function formatRelativeTime(dateIso?: string | null): string {
  if (!dateIso) return 'Unknown';
  const timestamp = new Date(dateIso).getTime();
  if (Number.isNaN(timestamp)) return 'Unknown';
  const deltaMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (deltaMinutes < 1) return 'Just now';
  if (deltaMinutes < 60) return `${deltaMinutes} minute${deltaMinutes === 1 ? '' : 's'} ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours} hour${deltaHours === 1 ? '' : 's'} ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays < 7) return `${deltaDays} day${deltaDays === 1 ? '' : 's'} ago`;
  return new Date(timestamp).toLocaleString();
}

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua) || /Opera\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  return 'Browser';
}

function detectPlatform(ua: string): string {
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Device';
}

function getCleanDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Current device';
  const ua = navigator.userAgent || '';
  const browser = detectBrowser(ua);
  const platform = detectPlatform(ua);
  return `${browser} on ${platform}`;
}

export async function fetchSecuritySettings(restaurantId: string): Promise<SecuritySettingsData> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('restaurants')
    .select('session_timeout_minutes')
    .eq('id', restaurantId)
    .single();
  if (error) throw new Error(error.message || 'Failed to load security settings');
  const value = Number(data?.session_timeout_minutes);
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(240, value)) : 60;
  return { sessionTimeout: String(safeValue) };
}

export async function saveSessionTimeout(restaurantId: string, minutes: number): Promise<void> {
  const client = requireSupabase();
  const safeMinutes = Math.max(0, Math.min(240, Math.floor(minutes)));
  const { error } = await client
    .from('restaurants')
    .update({ session_timeout_minutes: safeMinutes })
    .eq('id', restaurantId);
  if (error) throw new Error(error.message || 'Failed to save session timeout');
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  const client = requireSupabase();
  const { data: sessionData } = await client.auth.getSession();
  const email = sessionData.session?.user.email;
  if (!email) throw new Error('Unable to determine current account email');

  const verify = await client.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verify.error) throw new Error('Current password is incorrect');

  const updated = await client.auth.updateUser({ password: newPassword });
  if (updated.error) throw new Error(updated.error.message || 'Failed to update password');
}

export async function fetchRecentLoginSessions(): Promise<LoginSessionEntry[]> {
  const client = requireSupabase();
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    client.auth.getUser(),
    client.auth.getSession(),
  ]);
  const user = userData.user;
  const session = sessionData.session;
  if (!session) return [];

  const currentId = session.access_token.slice(0, 16);
  const storageKey = `${SESSION_HISTORY_KEY_PREFIX}${user?.id ?? 'unknown'}`;
  let history: LoginSessionEntry[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) history = JSON.parse(raw) as LoginSessionEntry[];
    } catch {
      history = [];
    }
  }

  const device = getCleanDeviceLabel();
  const currentEntry: LoginSessionEntry = {
    id: currentId,
    device,
    ip: 'Current network',
    time: formatRelativeTime(user?.last_sign_in_at),
    current: true,
  };

  const merged = [
    currentEntry,
    ...history.filter((entry) => entry.id !== currentId).map((entry) => ({ ...entry, current: false })),
  ].slice(0, 5);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, JSON.stringify(merged.map((entry) => ({ ...entry, current: false }))));
  }

  return merged;
}

export async function revokeSession(sessionId: string): Promise<void> {
  const client = requireSupabase();
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    client.auth.getUser(),
    client.auth.getSession(),
  ]);
  const currentId = sessionData.session?.access_token.slice(0, 16) ?? '';
  if (!sessionData.session) throw new Error('No active session');
  if (sessionId === currentId) throw new Error('Current session cannot be revoked from this list');

  const userId = userData.user?.id ?? 'unknown';
  const storageKey = `${SESSION_HISTORY_KEY_PREFIX}${userId}`;
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const history = raw ? (JSON.parse(raw) as LoginSessionEntry[]) : [];
      const next = history.filter((entry) => entry.id !== sessionId);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignore local history parse errors.
    }
  }

  const { error } = await client.auth.signOut({ scope: 'others' });
  if (error) throw new Error(error.message || 'Failed to revoke session');
}
