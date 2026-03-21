import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ShoppingBag,
  IndianRupee,
  TrendingUp,
  Clock,
  ChefHat,
  CreditCard,
  X,
} from 'lucide-react';
import { analyticsData } from '../data/mock-data';
import { useOrders } from '../context/OrdersContext';
import { useMenuConfig } from '../context/MenuConfigContext';
import { usePayment, type PaymentDetails } from '../context/PaymentContext';
import { useRestaurantProfile } from '../context/RestaurantProfileContext';
import { useShopStatus } from '../context/ShopStatusContext';
import { sortByPlacedAt, formatTime24ToAmPm } from '../utils/helpers';
import { StatCard } from '../components/ui/StatCard';
import { DashboardOrderSection } from '../components/DashboardOrderSection';
import { ShopClosedState } from '../components/ShopClosed';
import { ConfirmModal } from '../components/ui/ConfirmModal';

/** Returns the specific reason payment is not valid for opening the shop (for modal message). */
function getPaymentRequiredReason(
  configured: boolean,
  details: PaymentDetails
): string {
  if (!configured) {
    return 'Connect a payment gateway (Razorpay/Stripe) or enable UPI and choose a Primary Gateway in Payment settings before opening your shop.';
  }
  return 'Set up and enable at least one payment method in Payment settings before opening your shop.';
}

const PAYMENT_PROMPT_SEEN_KEY = 'dashboard-has-seen-payment-prompt';

function getHasSeenPaymentPrompt(): boolean {
  try {
    return localStorage.getItem(PAYMENT_PROMPT_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function setHasSeenPaymentPrompt(): void {
  try {
    localStorage.setItem(PAYMENT_PROMPT_SEEN_KEY, 'true');
  } catch {
    // ignore
  }
}

const stats = [
  {
    label: 'Total Orders Today',
    value: analyticsData.totalOrdersToday,
    icon: ShoppingBag,
    color: 'bg-primary/10 text-primary',
    change: '+12%',
  },
  {
    label: 'Revenue Today',
    value: '',
    icon: IndianRupee,
    color: 'bg-status-served-light text-status-served',
    change: '+8%',
    revenue: true,
  },
  {
    label: 'Most Ordered',
    value: analyticsData.mostOrderedDish,
    icon: ChefHat,
    color: 'bg-[var(--stat-popular-light)] text-[var(--stat-popular)]',
    change: '23 orders',
  },
  {
    label: 'Peak Hours',
    value: analyticsData.peakHours,
    icon: Clock,
    color: 'bg-[var(--stat-peak-light)] text-[var(--stat-peak)]',
    change: 'Lunch rush',
  },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const { branding } = useMenuConfig();
  const { paymentMode, hasSavedPaymentDetails, isPaymentConfigured, paymentDetails } = usePayment();
  const { profile: restaurantProfile } = useRestaurantProfile();
  const { effectiveIsShopActive, setShopActive } = useShopStatus();

  const closingTime = restaurantProfile?.closingTime ?? '23:00';
  const openingTime = restaurantProfile?.openingTime ?? '11:00';
  const lastClosedText = `Today, ${formatTime24ToAmPm(closingTime)}`;
  const nextOpeningText = `Tomorrow, ${formatTime24ToAmPm(openingTime)}`;
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(() => !getHasSeenPaymentPrompt());
  const [showPaymentRequiredModal, setShowPaymentRequiredModal] = useState(false);

  const newOrders = sortByPlacedAt(orders.filter((o) => o.status === 'new'));
  const preparingOrders = sortByPlacedAt(orders.filter((o) => o.status === 'preparing'));

  const handleSetupPaymentCta = useCallback(() => {
    setHasSeenPaymentPrompt();
    setShowPaymentPrompt(false);
    navigate('/settings?open=payments');
  }, [navigate]);

  const handleDismissPaymentPrompt = useCallback(() => {
    setHasSeenPaymentPrompt();
    setShowPaymentPrompt(false);
  }, []);

  const canTurnShopOn =
    paymentMode === 'pay_at_table' ||
    isPaymentConfigured;

  /** Same logic as toggle turn-on: validate payment, show modal if invalid, else set shop active. */
  const handleOpenShop = useCallback(() => {
    if (!canTurnShopOn) {
      setShowPaymentRequiredModal(true);
      return;
    }
    setShopActive(true);
  }, [canTurnShopOn, setShopActive]);

  const handleGoToPaymentSettings = useCallback(() => {
    setShowPaymentRequiredModal(false);
    navigate('/settings?open=payments');
  }, [navigate]);

  const showPaymentBanner =
    paymentMode !== 'pay_at_table' && !hasSavedPaymentDetails && showPaymentPrompt;

  return (
    <div className="space-y-6">
      {/* First-time payment setup banner */}
      {showPaymentBanner && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">Set up payment</p>
              <p className="text-xs text-gray-500 mt-0.5">Add your merchant and UPI details to accept payments.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleSetupPaymentCta}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-95 transition-colors cursor-pointer"
            >
              Set up payment
            </button>
            <button
              type="button"
              onClick={handleDismissPaymentPrompt}
              className="p-2 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {!effectiveIsShopActive ? (
        <ShopClosedState
          restaurantName={branding.restaurantName}
          onOpenShop={handleOpenShop}
          lastClosedText={lastClosedText}
          nextOpeningText={nextOpeningText}
        />
      ) : (
        <>
          {/* Top row: greeting + shop status toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-gray-900">Good Afternoon!</h1>
              <p className="text-sm text-gray-400 mt-1">Here's what's happening at {branding.restaurantName} today</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">
                Shop open
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!effectiveIsShopActive && !canTurnShopOn) {
                    setShowPaymentRequiredModal(true);
                    return;
                  }
                  setShopActive(!effectiveIsShopActive);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
                  effectiveIsShopActive ? 'bg-table-available' : 'bg-gray-300'
                }`}
                aria-label={effectiveIsShopActive ? 'Close shop' : 'Open shop'}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    effectiveIsShopActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                {...stat}
                value={('revenue' in stat && stat.revenue) ? `${branding.currency}${analyticsData.revenueToday.toLocaleString()}` : stat.value}
              />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardOrderSection
              title="New Orders"
              indicator={<span className="w-2 h-2 bg-status-new rounded-full animate-pulse" />}
              badgeClass="bg-status-new-badge-bg text-status-new-badge-text"
              count={newOrders.length}
              viewAllHref="/orders?filter=new"
              onViewAll={() => navigate('/orders?filter=new')}
              orders={newOrders}
              rowBg="bg-status-new-light/50"
              renderDetail={(order) => (
                <>{order.lines.length} items &middot; {branding.currency}{order.total}</>
              )}
              emptyMessage="No new orders"
            />

            <DashboardOrderSection
              title="Preparing"
              indicator={<TrendingUp className="w-4 h-4 text-status-preparing" />}
              badgeClass="bg-status-preparing-badge-bg text-status-preparing-badge-text"
              count={preparingOrders.length}
              viewAllHref="/orders?filter=preparing"
              onViewAll={() => navigate('/orders?filter=preparing')}
              orders={preparingOrders}
              rowBg="bg-status-preparing-light/50"
              renderDetail={(order) => (
                <>{order.lines.map((l) => `${l.quantity}x ${l.displayName}`).join(', ')}</>
              )}
              emptyMessage="No orders being prepared"
            />
          </div>
        </>
      )}

      {/* Modal: payment required to turn shop on (toggle or Open Shop Now) */}
      {showPaymentRequiredModal && (
        <ConfirmModal
          icon={<CreditCard className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          title="Setup your payment"
          description={
            <p>{getPaymentRequiredReason(isPaymentConfigured, paymentDetails)}</p>
          }
          confirmLabel="Go to Payment settings"
          cancelLabel="Later"
          confirmClassName="bg-primary text-white hover:brightness-95"
          onConfirm={handleGoToPaymentSettings}
          onCancel={() => setShowPaymentRequiredModal(false)}
        />
      )}
    </div>
  );
}
