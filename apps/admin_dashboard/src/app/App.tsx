import { Toaster } from 'sonner';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { MenuConfigProvider } from './context/MenuConfigContext';
import { OrdersProvider } from './context/OrdersContext';
import { RestaurantProfileProvider } from './context/RestaurantProfileContext';
import { PaymentProvider } from './context/PaymentContext';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MenuConfigProvider>
          <OrdersProvider>
          <RestaurantProfileProvider>
            <PaymentProvider>
              <RouterProvider router={router} />
              <Toaster position="top-center" richColors closeButton />
            </PaymentProvider>
          </RestaurantProfileProvider>
          </OrdersProvider>
        </MenuConfigProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}