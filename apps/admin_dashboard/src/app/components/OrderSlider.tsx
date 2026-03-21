import { Clock, ShoppingBag } from 'lucide-react';
import type { Order } from '../data/mock-data';
import { STATUS_CONFIG, ORDER_STATUS_PRIORITY, formatPlacedAt } from '../utils/helpers';
import { SliderShell } from './ui/SliderShell';
import { EmptyState } from './ui/EmptyState';
import { useMenuConfig } from '../context/MenuConfigContext';

interface OrderSliderProps {
  tableNumber: number;
  orders: Order[];
  onClose: () => void;
}

export function OrderSlider({ tableNumber, orders, onClose }: OrderSliderProps) {
  const { branding } = useMenuConfig();
  const tableOrders = orders
    .filter((o) => o.tableNo === String(tableNumber))
    .sort((a, b) => {
      const priorityDiff = (ORDER_STATUS_PRIORITY[a.status] ?? 3) - (ORDER_STATUS_PRIORITY[b.status] ?? 3);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime();
    });

  return (
    <SliderShell
      title={`Table ${tableNumber}`}
      subtitle={`${tableOrders.length} order${tableOrders.length !== 1 ? 's' : ''}`}
      onClose={onClose}
    >
      {tableOrders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12" />}
          title="No orders for this table"
        />
      ) : (
        <div className="space-y-3">
          {tableOrders.map((order) => {
            const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
            const statusLabel = status.label;
            return (
              <div
                key={order.orderNumber}
                className="bg-gray-50 rounded-xl p-4 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text} w-fit`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${order.status === 'preparing' ? 'animate-pulse' : ''}`} />
                    {statusLabel}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatPlacedAt(order.placedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-100">
                    {branding.orderNumberPrefix}{order.orderNumber.split('-')[1]}
                  </span>
                  {order.customerName != null && <span className="text-xs text-gray-500">{order.customerName}</span>}
                </div>

                <div className="space-y-1.5">
                  {order.lines.map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {line.displayName}
                        <span className="text-gray-400 ml-1">&times;{line.quantity}</span>
                      </span>
                      <span className="text-gray-500">{branding.currency}{line.lineTotal}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Total</span>
                  <span className="text-sm text-gray-900">{branding.currency}{order.total.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SliderShell>
  );
}
