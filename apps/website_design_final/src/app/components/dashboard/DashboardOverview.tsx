import { motion } from "motion/react";
import { TrendingUp, Users, ShoppingBag, ArrowUpRight, Package } from "lucide-react";
import { Link } from "react-router";
import { getAdminDashboardHref, getOnboardingHref } from "../../utils/routeTargets";
import { useWebsiteAuth } from "../../context/WebsiteAuthContext";
import { useRestaurantDashboard } from "../../context/RestaurantDashboardContext";

function formatMoney(amount: number, currency: string) {
  const n = Number.isFinite(amount) ? amount : 0;
  if (currency === "USD" || currency === "$") return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPlanName(tier: string) {
  return tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : "—";
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatDateTimeNoSeconds(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function formatTableLabel(tableNumber: number | null | undefined) {
  if (!Number.isInteger(tableNumber) || (tableNumber ?? 0) <= 0) return "TAB_--";
  return `TAB_${String(tableNumber).padStart(2, "0")}`;
}

export function DashboardOverview() {
  const adminLoginHref = `${getAdminDashboardHref()}/login`;
  const { user, primaryRestaurant, entitlement, profileLoading } = useWebsiteAuth();
  const onboardingBase = getOnboardingHref().replace(/\/+$/, "");
  const onboardingHref = entitlement?.plan_tier
    ? `${onboardingBase}/?plan=${encodeURIComponent(entitlement.plan_tier)}`
    : onboardingBase;
  const { stats, recentOrders, loading: dataLoading, error } = useRestaurantDashboard();
  const menuImportCompleted = Boolean(primaryRestaurant?.menu_import_completed_at);

  const currency = primaryRestaurant?.currency ?? "Rs";
  const welcomeName =
    primaryRestaurant?.name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "there";

  const maxTables = entitlement?.max_tables;
  const tableUsageLabel =
    stats ? `${stats.activeTableCount}/${maxTables ?? stats.tableCount} tables` : "—";
  const nextBillingDate = entitlement
    ? (() => {
        const next = new Date(entitlement.updated_at);
        next.setMonth(next.getMonth() + 1);
        return next.toISOString();
      })()
    : null;

  if (profileLoading) {
    return (
      <div className="max-w-6xl mx-auto text-gray-400 text-sm py-12">Loading your workspace…</div>
    );
  }

  if (!primaryRestaurant) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-gray-900 mb-2" style={{ fontSize: 22, fontWeight: 800 }}>
          Set up your restaurant
        </h1>
        <p className="text-gray-500 mb-6" style={{ fontSize: 14, lineHeight: 1.6 }}>
          Your account is signed in, but no restaurant is linked yet. Complete onboarding to see orders, menu, and
          settings here.
        </p>
        <a
          href={onboardingHref}
          className="inline-flex items-center justify-center bg-[#f97316] hover:bg-[#ea580c] text-white px-6 py-3 rounded-xl font-semibold text-sm"
        >
          Go to onboarding
        </a>
      </div>
    );
  }

  const statBlocks = stats
    ? [
        {
          label: "Orders",
          value: String(stats.orderCount),
          change: "All time",
          icon: ShoppingBag,
          color: "bg-orange-50 text-[#f97316]",
        },
        {
          label: "Menu items",
          value: String(stats.menuItemCount),
          change: "In catalog",
          icon: Package,
          color: "bg-blue-50 text-blue-500",
        },
        {
          label: "Tables",
          value: String(stats.tableCount),
          change: `${stats.activeTableCount} active`,
          icon: Users,
          color: "bg-green-50 text-green-500",
        },
        {
          label: "Revenue",
          value: formatMoney(stats.revenueTotal, currency),
          change: "Order totals",
          icon: TrendingUp,
          color: "bg-purple-50 text-purple-500",
        },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto">
      {!menuImportCompleted && primaryRestaurant && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-amber-900 text-sm mb-2">
            Complete onboarding to unlock your dashboard features.
          </p>
          <a
            href={`${onboardingHref}${onboardingHref.includes("?") ? "&" : "/?"}menu=1`}
            className="inline-flex items-center justify-center bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-2 rounded-lg text-xs font-semibold"
          >
            Complete onboarding
          </a>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1" style={{ fontSize: 22, fontWeight: 800 }}>
          Welcome back, {welcomeName}
        </h1>
        <p className="text-gray-400" style={{ fontSize: 13 }}>
          Live snapshot of your restaurant on Ratolabs.
        </p>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {dataLoading && !stats && <p className="text-gray-400 text-sm mt-2">Loading stats…</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statBlocks.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-5 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <span className="text-gray-400 flex items-center gap-0.5" style={{ fontSize: 11, fontWeight: 600 }}>
                {stat.change} <ArrowUpRight size={12} />
              </span>
            </div>
            <div className="text-gray-900" style={{ fontSize: 22, fontWeight: 800 }}>{stat.value}</div>
            <div className="text-gray-400" style={{ fontSize: 11 }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-gray-900" style={{ fontSize: 14, fontWeight: 700 }}>Recent orders</h2>
            <Link to="/dashboard/products" className="text-[#f97316] hover:underline" style={{ fontSize: 12, fontWeight: 600 }}>
              Menu
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 && (
              <p className="text-gray-400 text-sm py-6 text-center">No orders yet. They will appear here in real time.</p>
            )}
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Package size={16} className="text-[#f97316]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 truncate" style={{ fontSize: 12, fontWeight: 600 }}>
                    {order.order_number}
                  </div>
                  <div className="text-gray-400" style={{ fontSize: 10 }}>
                    {formatTableLabel(order.tables?.number)} · {formatDateTimeNoSeconds(order.placed_at)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-gray-900" style={{ fontSize: 12, fontWeight: 600 }}>
                    {formatMoney(Number(order.total), currency)}
                  </div>
                  <div className="text-gray-500 capitalize" style={{ fontSize: 10, fontWeight: 500 }}>
                    {order.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <h2 className="text-gray-900 mb-4" style={{ fontSize: 14, fontWeight: 700 }}>Your plan</h2>
          {entitlement ? (
            <div className="bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-xl p-5 text-white mb-5">
              <div style={{ fontSize: 11, fontWeight: 500 }} className="opacity-80 mb-1">Subscription</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{formatPlanName(entitlement.plan_tier)}</div>
              <div className="opacity-80 mt-2" style={{ fontSize: 12 }}>
                Status: {formatStatus(entitlement.status)} · Up to {entitlement.max_tables} tables
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-5 mb-5 text-gray-500 text-sm">
              No active subscription on file. Choose a plan to unlock billing-aligned limits.
              <Link to="/#pricing" className="block mt-3 text-[#f97316] font-semibold">
                View pricing
              </Link>
            </div>
          )}
          <div className="space-y-3 mb-5">
            <div className="flex justify-between gap-2">
              <span className="text-gray-400" style={{ fontSize: 11 }}>Tables</span>
              <span className="text-gray-900 text-right" style={{ fontSize: 11, fontWeight: 600 }}>{tableUsageLabel}</span>
            </div>
            {entitlement && (
              <div className="flex justify-between">
                <span className="text-gray-400" style={{ fontSize: 11 }}>Next billing date</span>
                <span className="text-gray-900" style={{ fontSize: 11, fontWeight: 600 }}>
                  {nextBillingDate ? formatDateOnly(nextBillingDate) : "—"}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <Link
              to="/dashboard/subscription"
              className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-900 py-2.5 rounded-xl transition-colors"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              Manage plan
            </Link>
            <a
              href={adminLoginHref}
              className="block text-center border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 py-2.5 rounded-xl transition-colors"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              Admin dashboard
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
