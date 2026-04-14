import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const REMEMBER_ME_STORAGE_KEY = 'admin_remember_me';

/**
 * Persists the "Remember me" checkbox for the login UI (and related UX like last email).
 * Auth session uses the Supabase default (localStorage), same as the marketing app.
 */
export function setRememberMePreference(rememberMe: boolean): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, rememberMe ? 'true' : 'false');
  }
}

export function getRememberMePreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) === 'true';
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const hasSupabase = !!supabase;

/**
 * Handles OAuth callback tokens returned in URL hash by setting Supabase session,
 * then cleans hash to avoid leaking tokens in the address bar.
 */
export async function consumeAuthHandoffFromHash(): Promise<void> {
  if (!supabase || typeof window === 'undefined') return;
  const raw = window.location.hash?.replace(/^#/, '').trim();
  if (!raw) return;

  const params = new URLSearchParams(raw);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    console.warn('Admin auth handoff failed:', error.message);
    return;
  }

  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
