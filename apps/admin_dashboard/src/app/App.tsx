import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { MenuConfigProvider } from './context/MenuConfigContext';
import { OrdersProvider } from './context/OrdersContext';
import { RestaurantProfileProvider } from './context/RestaurantProfileContext';
import { PaymentProvider } from './context/PaymentContext';
import { AnalyticsProvider } from './context/AnalyticsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { consumeAuthHandoffFromHash } from '../lib/supabase';

export default function App() {
  const [authReady, setAuthReady] = useState(() => false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await consumeAuthHandoffFromHash();
      if (alive) setAuthReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <MenuConfigProvider>
          <OrdersProvider>
          <RestaurantProfileProvider>
            <PaymentProvider>
              <AnalyticsProvider>
                <RouterProvider router={router} />
                <Toaster position="top-center" richColors closeButton />
              </AnalyticsProvider>
            </PaymentProvider>
          </RestaurantProfileProvider>
          </OrdersProvider>
        </MenuConfigProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}