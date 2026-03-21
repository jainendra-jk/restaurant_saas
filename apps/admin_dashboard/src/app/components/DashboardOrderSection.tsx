import { Clock, ArrowRight } from 'lucide-react';
import type { Order } from '../data/mock-data';
import { formatPlacedAt } from '../utils/helpers';

interface DashboardOrderSectionProps {
  title: string;
  /** Leading indicator: icon element or pulsing dot */
  indicator: React.ReactNode;
  /** Count badge with its own bg/text colors */
  badgeClass: string;
  count: number;
  /** Route to navigate on "View All" */
  viewAllHref: string;
  onViewAll: () => void;
  orders: Order[];
  /** Background class for each order row */
  rowBg: string;
  /** Render the secondary line per order. Receives the order. */
  renderDetail: (order: Order) => React.ReactNode;
  emptyMessage: string;
}

export function DashboardOrderSection({
  title,
  indicator,
  badgeClass,
  count,
  onViewAll,
  orders,
  rowBg,
  renderDetail,
  emptyMessage,
}: DashboardOrderSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          {indicator}
          <h3 className="text-gray-900">{title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>{count}</span>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
        >
          View All <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-2.5">
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{emptyMessage}</p>
        ) : (
          orders.map((order) => (
            <div key={order.orderNumber} className={`flex items-center justify-between p-2.5 rounded-lg ${rowBg}`}>
              <div>
                <span className="text-sm text-gray-900">Table {order.tableNo}</span>
                {order.customerName != null && <span className="text-xs text-gray-400 ml-1.5">{order.customerName}</span>}
                <p className="text-xs text-gray-400">{renderDetail(order)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {formatPlacedAt(order.placedAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
