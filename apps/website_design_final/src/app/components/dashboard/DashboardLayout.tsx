import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import ratolabsLogo from "../../../assets/ratolabs_logo.svg";
import ratolabsWordmark from "../../../assets/ratolabs_wordmark.svg";
import {
  LayoutDashboard,
  UtensilsCrossed,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../../lib/supabase";
import { useWebsiteAuth } from "../../context/WebsiteAuthContext";
import { RestaurantDashboardProvider } from "../../context/RestaurantDashboardContext";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Products", icon: UtensilsCrossed, path: "/dashboard/products" },
  { label: "Subscription", icon: CreditCard, path: "/dashboard/subscription" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

function initialsFromUser(email: string | undefined) {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "?";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return local.slice(0, 1).toUpperCase();
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, primaryRestaurant, entitlement } = useWebsiteAuth();

  const displayName = primaryRestaurant?.name ?? user?.email ?? "Account";
  const planLabel = entitlement?.plan_tier
    ? `${entitlement.plan_tier.charAt(0).toUpperCase()}${entitlement.plan_tier.slice(1)} plan`
    : "No subscription";
  const avatarLetter = initialsFromUser(user?.email);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    navigate("/", { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? "" : ""}`}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
        <img src={ratolabsLogo} alt="Ratolabs" width={32} height={32} />
        <img src={ratolabsWordmark} alt="" aria-hidden={true} height={14} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => mobile && setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                active
                  ? "bg-orange-50 text-[#f97316]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
              style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}
            >
              <item.icon size={18} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-[#f97316]" style={{ fontSize: 12, fontWeight: 700 }}>{avatarLetter}</span>
          </div>
          <div className="min-w-0">
            <div className="text-gray-900 truncate" style={{ fontSize: 12, fontWeight: 600 }}>{displayName}</div>
            <div className="text-gray-400 truncate" style={{ fontSize: 10 }}>{planLabel}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 w-full"
          style={{ fontSize: 13, fontWeight: 500 }}
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50/80">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-[260px] bg-white border-r border-gray-100 shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-[260px] bg-white z-50 lg:hidden shadow-xl"
            >
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center lg:hidden">
              <span className="text-[#f97316]" style={{ fontSize: 11, fontWeight: 700 }}>{avatarLetter}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <RestaurantDashboardProvider>
            <Outlet />
          </RestaurantDashboardProvider>
        </main>
      </div>
    </div>
  );
}
