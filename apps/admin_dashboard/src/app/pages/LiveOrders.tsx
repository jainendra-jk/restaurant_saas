import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Trash2, AlertTriangle, History, ArchiveX } from 'lucide-react';
import { type OrderStatus } from '../data/mock-data';
import { OrderCard } from '../components/OrderCard';
import { useOrders } from '../context/OrdersContext';
import { ORDER_STATUS_PRIORITY } from '../utils/helpers';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { DangerFAB } from '../components/ui/DangerFAB';
import { FilterTabs } from '../components/ui/FilterTabs';

type OrderFilter = OrderStatus | 'all';

const filterTabs: { label: string; value: OrderFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Served', value: 'served' },
];

export function LiveOrders() {
  const { orders, updateOrderStatus, hideServedOrders, abandonOrder } = useOrders();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingServed, setClearingServed] = useState(false);
  const [abandoningOrderNumber, setAbandoningOrderNumber] = useState<string | null>(null);
  const filterParam = searchParams.get('filter') as OrderStatus | 'all' | null;
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'all'>(
    filterParam && ['all', 'new', 'preparing', 'served'].includes(filterParam)
      ? filterParam
      : 'all'
  );

  useEffect(() => {
    if (filterParam && ['all', 'new', 'preparing', 'served'].includes(filterParam)) {
      setActiveFilter(filterParam);
    }
  }, [filterParam]);

  const handleFilterChange = (value: OrderStatus | 'all') => {
    setActiveFilter(value);
    if (value === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ filter: value });
    }
  };

  const handleClearAll = async () => {
    try {
      setClearingServed(true);
      await hideServedOrders();
    } finally {
      setClearingServed(false);
      setShowClearConfirm(false);
    }
  };

  const nowMs = Date.now();
  const isExpiredOrder = (placedAt: string, status: OrderStatus) => {
    if (status !== 'new' && status !== 'preparing') return false;
    const placedAtMs = new Date(placedAt).getTime();
    if (!Number.isFinite(placedAtMs)) return false;
    return nowMs - placedAtMs >= 24 * 60 * 60 * 1000;
  };

  const filteredOrders = useMemo(
    () => (activeFilter === 'all' ? orders : orders.filter((o) => o.status === activeFilter)),
    [activeFilter, orders]
  );

  const expiredOrders = useMemo(
    () => filteredOrders.filter((order) => isExpiredOrder(order.placedAt, order.status)),
    [filteredOrders]
  );

  const activeOrders = useMemo(
    () => filteredOrders.filter((order) => !isExpiredOrder(order.placedAt, order.status)),
    [filteredOrders]
  );

  const sortedOrders = [...activeOrders].sort((a, b) => {
    const priorityDiff = (ORDER_STATUS_PRIORITY[a.status] ?? 99) - (ORDER_STATUS_PRIORITY[b.status] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime();
  });

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const getTabCount = (value: OrderStatus | 'all') =>
    value === 'all' ? orders.length : statusCounts[value] || 0;

  const formatOrderAge = (placedAt: string) => {
    const placedMs = new Date(placedAt).getTime();
    if (!Number.isFinite(placedMs)) return 'Expired';
    const totalHours = Math.max(24, Math.floor((nowMs - placedMs) / (1000 * 60 * 60)));
    return `Expired ${totalHours}h ago`;
  };

  const handleAbandonOrder = async (orderNumber: string) => {
    try {
      setAbandoningOrderNumber(orderNumber);
      await abandonOrder(orderNumber);
    } finally {
      setAbandoningOrderNumber((current) => (current === orderNumber ? null : current));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Live Orders" subtitle={`${orders.length} orders total`} />
      </div>

      {/* Filter Tabs */}
      <div className="sticky -top-5 lg:-top-6 z-10 bg-gray-50 -mx-5 lg:-mx-6 px-5 lg:px-6 pt-5 lg:pt-6 pb-2">
        <div className="flex items-center gap-2 pb-1">
          <FilterTabs
            tabs={filterTabs}
            activeValue={activeFilter}
            onSelect={handleFilterChange}
            getCount={getTabCount}
          />
        </div>
      </div>

      {/* Orders Grid */}
      {sortedOrders.length === 0 ? (
        <EmptyState title="No orders found" subtitle="Orders with this status will appear here" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedOrders.map((order) => (
            <OrderCard key={order.orderNumber} order={order} onUpdateStatus={updateOrderStatus} />
          ))}
        </div>
      )}

      {/* Expired Orders */}
      {expiredOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-700">
            <History className="w-4 h-4" />
            <p className="text-sm font-medium">Expired Orders ({expiredOrders.length})</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {expiredOrders.map((order) => (
              <div key={`expired-${order.orderNumber}`} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">Table {order.tableNo} · {formatOrderAge(order.placedAt)}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs">
                    {order.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                  {order.lines.map((line) => `${line.quantity}x ${line.displayName}`).join(', ')}
                </p>
                <button
                  type="button"
                  onClick={() => void handleAbandonOrder(order.orderNumber)}
                  disabled={abandoningOrderNumber === order.orderNumber}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-amber-600 text-white py-2 text-sm hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ArchiveX className="w-4 h-4" />
                  {abandoningOrderNumber === order.orderNumber ? 'Marking...' : 'Mark Abandoned'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clear Served Orders FAB */}
      <DangerFAB
        icon={<Trash2 className="w-5 h-5" />}
        onClick={() => setShowClearConfirm(true)}
        title="Clear served orders"
        visible={activeFilter === 'served' && (statusCounts['served'] || 0) > 0}
      />

      {/* Clear Served Orders Confirmation */}
      {showClearConfirm && (
        <ConfirmModal
          icon={<AlertTriangle className="w-5 h-5 text-danger" />}
          iconBg="bg-danger-light"
          title="Clear Served Orders?"
          description={
            <p>
              This will hide all <strong>{statusCounts['served'] || 0}</strong> served orders from live views. Historical analytics remain unchanged.
            </p>
          }
          confirmLabel={clearingServed ? 'Clearing...' : 'Clear All'}
          onConfirm={() => void handleClearAll()}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}