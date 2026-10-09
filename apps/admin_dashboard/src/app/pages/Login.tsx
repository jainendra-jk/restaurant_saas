import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, ChefHat } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useMenuConfig } from '../context/MenuConfigContext';
import { useAuth, requiresAuth } from '../context/AuthContext';
import { getStoredProfileLogo } from '../context/ProfileLogoContext';
import { getRememberMePreference, supabase } from '../../lib/supabase';
import { PasswordRecoveryDialog } from '@restaurant-saas/supabase-auth';
import { toast } from 'sonner';
import { readLoginBrandingCache } from '../utils/loginBrandingCache';
import { resolvePostLoginPath } from '../utils/accessRouting';

const LAST_EMAIL_STORAGE_KEY = 'admin_last_email';
const PRODUCT_BRAND = 'RATOLABS';
const OAUTH_PENDING_STORAGE_KEY = 'admin_oauth_pending';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useMenuConfig();
  const { signIn, signInWithGoogle, user, restaurant, loading: authLoading, accessState } = useAuth();

  const { displayTitle, displayTagline, welcomeHeading, footerEntity, emailPlaceholder } = useMemo(() => {
    const cached = readLoginBrandingCache();
    if (user && restaurant) {
      return {
        displayTitle: branding.restaurantName,
        displayTagline: branding.tagline?.trim() || 'Restaurant Dashboard',
        welcomeHeading: branding.welcomeMessage,
        footerEntity: branding.restaurantName,
        emailPlaceholder: `you@${branding.restaurantName.toLowerCase().replace(/\s+/g, '')}.com`,
      };
    }
    if (cached?.restaurantName) {
      return {
        displayTitle: cached.restaurantName,
        displayTagline: cached.tagline?.trim() || 'Restaurant Dashboard',
        welcomeHeading: cached.welcomeMessage?.trim() || 'Welcome back',
        footerEntity: cached.restaurantName,
        emailPlaceholder: `you@${cached.restaurantName.toLowerCase().replace(/\s+/g, '')}.com`,
      };
    }
    return {
      displayTitle: PRODUCT_BRAND,
      displayTagline: 'Restaurant Dashboard',
      welcomeHeading: 'Welcome back',
      footerEntity: PRODUCT_BRAND,
      emailPlaceholder: 'you@company.com',
    };
  }, [user, restaurant, branding.restaurantName, branding.tagline, branding.welcomeMessage]);
  const [logoUrl] = useState<string | null>(getStoredProfileLogo);
  const [email, setEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(LAST_EMAIL_STORAGE_KEY) ?? '';
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState<boolean>(getRememberMePreference);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLogoutSkeleton, setShowLogoutSkeleton] = useState(
    Boolean((location.state as { logoutInProgress?: boolean } | null)?.logoutInProgress)
  );
  const [forgotOpen, setForgotOpen] = useState(false);
  const hasNavigatedRef = useRef(false);

  const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  const requestedPath = `${from?.pathname ?? ''}${from?.search ?? ''}${from?.hash ?? ''}`;
  const isSafeInternalPath =
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//') &&
    !requestedPath.includes('://');
  const redirectTarget = isSafeInternalPath ? requestedPath : '/';
  const toLoginErrorMessage = useCallback((message?: string) => {
    const m = String(message ?? '').toLowerCase();
    if (
      m.includes('invalid login credentials') ||
      m.includes('invalid credentials') ||
      m.includes('email not confirmed')
    ) {
      return 'Invalid credentials';
    }
    return message ?? 'Login failed';
  }, []);

  const completePostLoginRedirect = useCallback(() => {
    const targetPath = resolvePostLoginPath(accessState, redirectTarget);
    navigate(targetPath, { replace: true });
  }, [accessState, navigate, redirectTarget]);

  /** Clear any recovery session if the user dismisses the dialog (success path already signs out first). */
  const handleForgotOpenChange = useCallback((open: boolean) => {
    setForgotOpen(open);
    if (!open && supabase) {
      void supabase.auth.signOut();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    if (requiresAuth()) {
      const { error: err } = await signIn(email, password, rememberMe);
      setLoading(false);
      if (err) {
        setError(toLoginErrorMessage(err.message));
        return;
      }
      if (typeof window !== 'undefined') {
        if (rememberMe) {
          window.localStorage.setItem(LAST_EMAIL_STORAGE_KEY, email.trim());
        } else {
          window.localStorage.removeItem(LAST_EMAIL_STORAGE_KEY);
        }
      }
      return;
    } else {
      setTimeout(() => {
        setLoading(false);
        completePostLoginRedirect();
      }, 1200);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(OAUTH_PENDING_STORAGE_KEY, 'google');
    }
    setLoading(true);
    const { error: err } = await signInWithGoogle(redirectTarget, rememberMe);
    setLoading(false);
    if (err) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(OAUTH_PENDING_STORAGE_KEY);
      }
      setError(err.message ?? 'Google login failed');
    }
  };

  useEffect(() => {
    if (!requiresAuth() || authLoading || typeof window === 'undefined') return;
    const pending = window.sessionStorage.getItem(OAUTH_PENDING_STORAGE_KEY) === 'google';
    if (!pending) return;

    if (user) {
      window.sessionStorage.removeItem(OAUTH_PENDING_STORAGE_KEY);
      return;
    }

    const hasOAuthReturnSignal = (() => {
      const q = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace(/^#/, '');
      if (q.has('code') || q.has('error') || q.has('error_description')) return true;
      if (!hash) return false;
      const h = new URLSearchParams(hash);
      return (
        h.has('access_token') ||
        h.has('error') ||
        h.has('error_description') ||
        h.has('refresh_token')
      );
    })();
    if (!hasOAuthReturnSignal) return;

    let alive = true;
    const timer = window.setTimeout(() => {
      if (!alive) return;
      if (!user) {
        setError('Google login failed. Please try again.');
      }
      window.sessionStorage.removeItem(OAUTH_PENDING_STORAGE_KEY);
    }, 1200);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (!showLogoutSkeleton) return;
    const timer = window.setTimeout(() => {
      setShowLogoutSkeleton(false);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [showLogoutSkeleton]);

  useEffect(() => {
    if (!requiresAuth() || authLoading) return;
    if (!user) {
      hasNavigatedRef.current = false;
      return;
    }
    // Password recovery: verifyOtp(recovery) creates a session before the user sets a new password.
    // Stay on /login until the dialog closes (success path signs out; dismiss may leave a recovery session).
    if (forgotOpen) return;
    // Entitlement not resolved yet — wait. Redirecting now would pick a
    // destination from an unknown access state.
    if (accessState === 'unknown') return;
    if (accessState === 'no_subscription') {
      hasNavigatedRef.current = false;
      return;
    }
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(OAUTH_PENDING_STORAGE_KEY);
    }
    completePostLoginRedirect();
  }, [accessState, authLoading, completePostLoginRedirect, forgotOpen, user]);

  if (showLogoutSkeleton) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-11 rounded-xl bg-white border border-gray-200 animate-pulse" />
            <div className="h-11 rounded-xl bg-white border border-gray-200 animate-pulse" />
            <div className="h-11 rounded-xl bg-gray-200 animate-pulse" />
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">Logging you out...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Left — Image Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1771360963016-1408c2de12c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwa2l0Y2hlbiUyMGZvb2QlMjBwcmVwYXJhdGlvbnxlbnwxfHx8fDE3NzMzOTc4MDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Restaurant kitchen"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <h1 className="text-white text-3xl mb-2">{displayTitle}</h1>
          <p className="text-white/70 text-sm max-w-md">{displayTagline}</p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ChefHat className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-gray-900 text-lg">{displayTitle}</h2>
              <p className="text-xs text-gray-400">{displayTagline}</p>
            </div>
          </div>

          {/* Welcome */}
          <div className="mb-6">
            <h3 className="text-gray-900 text-xl mb-1">{welcomeHeading}</h3>
            <p className="text-sm text-gray-400">Sign in to your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder={emailPlaceholder}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 appearance-none rounded border border-gray-300 bg-white checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer relative checked:after:content-['✓'] checked:after:text-white checked:after:text-[10px] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-xs text-gray-500">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white text-sm rounded-xl hover:brightness-90 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-300">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 border border-gray-200 bg-white text-sm text-gray-700 rounded-xl hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.61 20.08H42V20H24v8h11.3C33.65 32.66 29.19 36 24 36c-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.95 3.03l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92z"
              />
              <path
                fill="#FF3D00"
                d="M6.31 14.69l6.57 4.82C14.67 15.11 18.99 12 24 12c3.06 0 5.84 1.15 7.95 3.03l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.66 8.34 6.31 14.69z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.17 0 9.86-1.98 13.41-5.2l-6.19-5.24C29.16 35.08 26.68 36 24 36c-5.17 0-9.61-3.31-11.25-7.91l-6.52 5.02C9.54 39.56 16.24 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.61 20.08H42V20H24v8h11.3c-.79 2.34-2.3 4.33-4.08 5.56l.01-.01 6.19 5.24C37 39.06 44 34 44 24c0-1.34-.14-2.65-.39-3.92z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-gray-300 mt-8">
            &copy; 2026 {footerEntity}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Powered by */}
      <span className="absolute bottom-4 right-4 text-[11px] text-gray-400/60">
        powered by ratolabs
      </span>

      <PasswordRecoveryDialog
        supabase={supabase}
        open={forgotOpen}
        onOpenChange={handleForgotOpenChange}
        initialEmail={email.trim()}
        primaryButtonClassName="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:brightness-90 disabled:opacity-50"
        onSuccess={() =>
          toast.success('Password updated successfully.', { closeButton: false })
        }
      />
    </div>
  );
}