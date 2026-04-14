import { Navigate, useLocation } from 'react-router';
import { useAuth, requiresAuth } from '../context/AuthContext';
import { AdminShellSkeleton } from './AppSkeletons';
import { getCheckoutUrl } from '../utils/accessRouting';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, accessState } = useAuth();
  const location = useLocation();
  const checkoutUrl = getCheckoutUrl();

  if (!requiresAuth()) return <>{children}</>;

  if (loading) {
    return <AdminShellSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (accessState === 'no_subscription') {
    if (checkoutUrl && typeof window !== 'undefined') {
      window.location.replace(checkoutUrl);
      return <AdminShellSkeleton />;
    }
    return <Navigate to="/login" replace />;
  }

  if (accessState === 'onboarding_incomplete' && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  if (accessState === 'ready' && location.pathname === '/setup') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
