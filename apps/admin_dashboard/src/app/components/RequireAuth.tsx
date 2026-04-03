import { Navigate, useLocation } from 'react-router';
import { useAuth, requiresAuth } from '../context/AuthContext';
import { AdminShellSkeleton } from './AppSkeletons';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!requiresAuth()) return <>{children}</>;

  if (loading) {
    return <AdminShellSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
