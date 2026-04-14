import { useState } from 'react';
import { Clock, MessageSquareWarning, Check, FileDown } from 'lucide-react';
import type { Order, OrderStatus } from '../data/mock-data';
import { formatPlacedAt } from '../utils/helpers';
import { useMenuConfig } from '../context/MenuConfigContext';
import { useRestaurantProfile } from '../context/RestaurantProfileContext';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { downloadCustomerBill } from '../bill/customerBill';
import { downloadKitchenReceipt } from '../bill.config/kitchenReceipt';
import { buildRestaurantBillAddressFromRow } from '../utils/billAddress';

const statusBorderColors: Record<OrderStatus, string> = {
  new: 'border-l-status-new',
  preparing: 'border-l-status-preparing',
  served: 'border-l-status-served',
};

const nextStatusMap: Record<OrderStatus, OrderStatus | null> = {
  new: 'preparing',
  preparing: 'served',
  served: null,
};

const nextStatusLabel: Record<OrderStatus, string> = {
  new: 'Start Preparing',
  preparing: 'Mark Served',
  served: '',
};

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (orderNumber: string, newStatus: OrderStatus) => void;
}

/** Build bill branding from menu config + saved profile. When profile is null, taxRules is [] and bill renders without tax lines. */
function cleanText(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function buildDbLocationLine(restaurant: {
  city: string | null;
  state: string | null;
  pincode: string | null;
} | null): string | undefined {
  if (!restaurant) return undefined;
  const city = cleanText(restaurant.city);
  const state = cleanText(restaurant.state);
  const pincode = cleanText(restaurant.pincode);
  const cityState = [city, state].filter(Boolean).join(', ');
  const line = [cityState, pincode].filter(Boolean).join(' - ');
  return line || undefined;
}

function getBillBranding(
  branding: {
    restaurantName: string;
    currency: string;
    address?: string;
    contact?: string;
    fssaiNumber?: string;
    gstNumber?: string;
  },
  profile: {
    address: string;
    phone?: string;
    fssaiNumber: string;
    gstNumber: string;
    taxRules: { name: string; percent: number }[];
  } | null,
  restaurant: {
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    phone: string | null;
    fssaiNumber: string | null;
    gstNumber: string | null;
    branding?: Record<string, unknown>;
  } | null
) {
  const restaurantBranding = (restaurant?.branding ?? {}) as Record<string, unknown>;
  const restaurantBrandingAddress = cleanText(
    typeof restaurantBranding.address === 'string' ? restaurantBranding.address : undefined
  );
  const restaurantBrandingContact = cleanText(
    typeof restaurantBranding.phone === 'string'
      ? restaurantBranding.phone
      : typeof restaurantBranding.contact === 'string'
        ? restaurantBranding.contact
        : undefined
  );
  const restaurantBrandingFssai = cleanText(
    typeof restaurantBranding.fssaiNumber === 'string' ? restaurantBranding.fssaiNumber : undefined
  );
  const restaurantBrandingGst = cleanText(
    typeof restaurantBranding.gstNumber === 'string' ? restaurantBranding.gstNumber : undefined
  );

  const profileAddress = cleanText(profile?.address);
  const restaurantComposedAddress = restaurant
    ? buildRestaurantBillAddressFromRow(restaurant)
    : undefined;
  const dbLocationLine = buildDbLocationLine(restaurant);
  const menuBrandingAddress = cleanText(branding.address);
  const mergedProfileAddress = profileAddress
    ? [profileAddress, dbLocationLine].filter(Boolean).join('\n')
    : undefined;

  const profilePhone = cleanText(profile?.phone);
  const restaurantPhone = cleanText(restaurant?.phone);
  const menuBrandingContact = cleanText(branding.contact);

  const profileFssai = cleanText(profile?.fssaiNumber);
  const restaurantFssai = cleanText(restaurant?.fssaiNumber);
  const menuBrandingFssai = cleanText(branding.fssaiNumber);

  const profileGst = cleanText(profile?.gstNumber);
  const restaurantGst = cleanText(restaurant?.gstNumber);
  const menuBrandingGst = cleanText(branding.gstNumber);

  return {
    restaurantName: branding.restaurantName,
    currency: branding.currency,
    address:
      mergedProfileAddress ||
      restaurantComposedAddress ||
      restaurantBrandingAddress ||
      menuBrandingAddress,
    contact:
      profilePhone || restaurantPhone || restaurantBrandingContact || menuBrandingContact,
    gstNumber: profileGst || restaurantGst || restaurantBrandingGst || menuBrandingGst,
    fssaiNumber:
      profileFssai || restaurantFssai || restaurantBrandingFssai || menuBrandingFssai,
    taxRules: profile?.taxRules ?? [],
  };
}

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const { branding } = useMenuConfig();
  const { profile } = useRestaurantProfile();
  const { restaurant } = useAuth();
  const { pushNotification } = useOrders();
  const nextStatus = nextStatusMap[order.status];
  const [noteAcknowledged, setNoteAcknowledged] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  const hasNote = !!order.specialInstructions;

  const handleDownloadBill = () => {
    downloadCustomerBill(order, getBillBranding(branding, profile, restaurant));
  };

  const handleDownloadKitchen = () => {
    downloadKitchenReceipt(order, branding.restaurantName);
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow border-l-4 ${statusBorderColors[order.status]} overflow-hidden flex flex-col h-full`}
    >
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-gray-900">Table {order.tableNo}</h3>
            {hasNote && !noteAcknowledged && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </div>
          <StatusBadge status={order.status} size="sm" />
        </div>

        {order.customerName != null && <p className="text-xs text-gray-400 -mt-1 mb-2">{order.customerName}</p>}

        {/* Special Note */}
        {hasNote && (
          <div
            onClick={() => setNoteExpanded(!noteExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNoteExpanded(!noteExpanded); } }}
            className={`mb-2 w-full text-left rounded-lg border transition-all cursor-pointer ${
              noteAcknowledged
                ? 'bg-green-50/50 border-green-100'
                : 'bg-amber-50 border-amber-200 animate-pulse-subtle'
            }`}
          >
            <div className="flex items-start gap-2 px-2.5 py-2">
              <MessageSquareWarning
                className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                  noteAcknowledged ? 'text-green-500' : 'text-amber-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[11px] leading-relaxed ${
                    noteAcknowledged ? 'text-green-700' : 'text-amber-800'
                  } ${noteExpanded ? '' : 'line-clamp-1'}`}
                >
                  {order.specialInstructions}
                </p>
              </div>
              {noteAcknowledged && (
                <Check className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
              )}
            </div>
            {noteExpanded && !noteAcknowledged && (
              <div className="px-2.5 pb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteAcknowledged(true);
                    setNoteExpanded(false);
                  }}
                  className="w-full text-[11px] py-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Acknowledge Note
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1 mb-2.5">
          {order.lines.map((line, idx) => (
            <div key={idx} className="flex justify-between text-sm text-gray-600">
              <span>
                {line.quantity}x {line.displayName}
              </span>
              <span className="text-gray-400">{branding.currency}{line.lineTotal}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-50 pt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            {formatPlacedAt(order.placedAt)}
          </div>
          <span className="text-sm text-gray-900">{branding.currency}{order.total}</span>
        </div>

        <div className="flex-1" />

        {nextStatus && (
          <button
            onClick={() => {
              if (nextStatus === 'preparing') {
                try {
                  downloadCustomerBill(order, getBillBranding(branding, profile, restaurant));
                } catch (error) {
                  console.error('Failed to download customer bill', error);
                }
                try {
                  downloadKitchenReceipt(order, branding.restaurantName);
                } catch (error) {
                  console.error('Failed to download kitchen receipt', error);
                }
                pushNotification({
                  type: 'preparing',
                  title: `Started Preparing - Table ${order.tableNo}`,
                  description: `${order.orderNumber} \u00b7 ${order.lines.length} item${order.lines.length === 1 ? '' : 's'}`,
                });
              }
              if (nextStatus === 'served') {
                pushNotification({
                  type: 'served',
                  title: `Order Served - Table ${order.tableNo}`,
                  description: `${order.orderNumber} \u00b7 ${branding.currency}${Math.round(order.total)}`,
                });
              }
              onUpdateStatus(order.orderNumber, nextStatus);
            }}
            className={`group relative mt-2.5 w-full py-1.5 rounded-lg text-sm transition-colors cursor-pointer overflow-hidden ${
              order.status === 'new'
                ? 'text-white'
                : order.status === 'preparing'
                ? 'text-white'
                : 'text-gray-700'
            }`}
          >
            {/* Background layer: only this fades 10% on hover so text opacity stays unchanged */}
            <span
              aria-hidden
              className={`absolute inset-0 rounded-lg transition-[filter] duration-150 group-hover:brightness-90 ${
                order.status === 'new'
                  ? 'bg-primary'
                  : order.status === 'preparing'
                  ? 'bg-status-served'
                  : 'bg-gray-100 group-hover:brightness-90'
              }`}
            />
            <span className="relative z-10">{nextStatusLabel[order.status]}</span>
          </button>
        )}
      </div>
    </div>
  );
}