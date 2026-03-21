import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { useAuth, requiresAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  Grid3X3,
  UtensilsCrossed,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { NotificationPopup } from './NotificationPopup';
import { useMenuConfig } from '../context/MenuConfigContext';
import { useProfileLogo } from '../context/ProfileLogoContext';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/orders', icon: ClipboardList, label: 'Live Orders' },
  { path: '/tables', icon: Grid3X3, label: 'Tables' },
  { path: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const DYNAMIC_FAVICON_ID = 'dashboard-dynamic-favicon';

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useMenuConfig();
  const { logoUrl } = useProfileLogo();
  const { signOut } = useAuth();

  // Tab title: "{restaurantName} Dashboard", update when branding or route changes
  useEffect(() => {
    const name = branding?.restaurantName?.trim() || 'Dashboard';
    document.title = `${name} Dashboard`;
  }, [branding?.restaurantName, location.pathname]);

  // Favicon: use user-uploaded logo when available
  useEffect(() => {
    let link = document.head.querySelector<HTMLLinkElement>(`link[rel="icon"]#${DYNAMIC_FAVICON_ID}`);
    if (logoUrl) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.id = DYNAMIC_FAVICON_ID;
        document.head.appendChild(link);
      }
      link.href = logoUrl;
    } else if (link) {
      link.remove();
    }
  }, [logoUrl]);

  // Default sidebar collapsed on tablet, expanded on desktop
  useEffect(() => {
    const handleResize = () => {
      // lg breakpoint = 1024px
      setCollapsed(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar — always visible, collapsed on tablet, expanded on desktop */}
      <aside
        className={`h-full bg-white border-r border-gray-100 flex flex-col flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Sidebar header */}
        <div
          className={`h-16 border-b border-gray-50 flex-shrink-0 flex items-center ${
            collapsed ? 'justify-center px-3' : 'justify-between px-4'
          }`}
        >
          {/* Profile avatar */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 overflow-hidden ${
              collapsed ? 'hidden' : logoUrl ? 'bg-transparent' : 'bg-primary/10 text-primary text-sm'
            }`}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initials(branding.restaurantName)
            )}
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="relative w-9 h-9 border border-primary/20 bg-primary/5 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer overflow-hidden"
          >
            <span
              className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                collapsed
                  ? 'opacity-0 rotate-180 scale-75'
                  : 'opacity-100 rotate-0 scale-100'
              }`}
            >
              <X className="w-4 h-4 text-primary" />
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                collapsed
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-180 scale-75'
              }`}
            >
              <Menu className="w-4 h-4 text-primary" />
            </span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center py-2.5 rounded-xl text-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  collapsed ? 'justify-center px-0 gap-0' : 'gap-3 px-3'
                } ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0 transition-transform duration-300" />
              <span
                className={`whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  collapsed
                    ? 'w-0 opacity-0 overflow-hidden'
                    : 'w-auto opacity-100'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 flex-shrink-0 border-t border-gray-100 pt-3">
          <button
            onClick={() => (requiresAuth() ? signOut().then(() => navigate('/login')) : navigate('/login'))}
            className={`flex items-center py-2.5 rounded-xl text-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] w-full text-red-500 hover:bg-red-50 cursor-pointer ${
              collapsed ? 'justify-center px-0 gap-0' : 'gap-3 px-3'
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-300" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                collapsed
                  ? 'w-0 opacity-0 overflow-hidden'
                  : 'w-auto opacity-100'
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center gap-4 px-6 lg:px-8 flex-shrink-0">
          <h2 className="text-gray-900">{branding.restaurantName}</h2>
          <div className="flex-1" />
          <NotificationPopup />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
