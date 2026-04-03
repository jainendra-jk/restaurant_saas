import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REMEMBER_ME_STORAGE_KEY = 'admin_remember_me';

let usePersistentCookie =
  typeof window !== 'undefined'
    ? window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) === 'true'
    : false;

function baseCookieAttributes(): string {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? '; Secure'
    : '';
  return `Path=/; SameSite=Lax${secure}`;
}

function setCookie(name: string, value: string, persistent: boolean): void {
  if (typeof document === 'undefined') return;
  const encoded = encodeURIComponent(value);
  const maxAge = persistent ? '; Max-Age=31536000' : '';
  document.cookie = `${name}=${encoded}; ${baseCookieAttributes()}${maxAge}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    if (!part.startsWith(prefix)) continue;
    const raw = part.slice(prefix.length);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; ${baseCookieAttributes()}; Max-Age=0`;
}

const cookieStorage: Storage = {
  getItem: (key: string) => readCookie(key),
  setItem: (key: string, value: string) => setCookie(key, value, usePersistentCookie),
  removeItem: (key: string) => clearCookie(key),
  clear: () => {},
  key: () => null,
  get length() {
    return 0;
  },
};

export function setRememberMeCookieMode(rememberMe: boolean): void {
  usePersistentCookie = rememberMe;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, rememberMe ? 'true' : 'false');
  }
}

export function getRememberMeCookieMode(): boolean {
  return usePersistentCookie;
}

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        storage: cookieStorage,
      },
    })
  : null;

export const hasSupabase = !!supabase;
