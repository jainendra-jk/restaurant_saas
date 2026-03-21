import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth, requiresAuth } from '../context/AuthContext';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!requiresAuth()) return;
    if (loading) return;
    if (!user) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [user, loading, navigate, location]);

  if (requiresAuth() && (loading || !user)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
