import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

/**
 * After Stripe, the marketing app redirects here with access/refresh tokens in the
 * URL hash (cross-origin localStorage). Restore session then strip the hash.
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
    console.warn('Auth handoff failed:', error.message);
    return;
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
