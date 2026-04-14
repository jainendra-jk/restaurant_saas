import { createBrowserRouter } from 'react-router';
import { RootLayout } from './components/RootLayout';
import { RequireAuth } from './components/RequireAuth';
import { Dashboard } from './pages/Dashboard';
import { LiveOrders } from './pages/LiveOrders';
import { Tables } from './pages/Tables';
import { MenuManagement } from './pages/MenuManagement';
import { Analytics } from './pages/Analytics';
import { SettingsPage } from './pages/SettingsPage';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/setup',
    element: (
      <RequireAuth>
        <Setup />
      </RequireAuth>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: 'orders', Component: LiveOrders },
      { path: 'tables', Component: Tables },
      { path: 'menu', Component: MenuManagement },
      { path: 'analytics', Component: Analytics },
      { path: 'settings', Component: SettingsPage },
    ],
  },
]);
