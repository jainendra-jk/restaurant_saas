import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Trash2, AlertTriangle } from 'lucide-react';
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
  const { orders, setOrders, updateOrderStatus } = useOrders();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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

  const handleClearAll = () => {
    setOrders((prev) => prev.filter((o) => o.status !== 'served'));
    setShowClearConfirm(false);
  };

  const filteredOrders = activeFilter === 'all' ? orders : orders.filter((o) => o.status === activeFilter);
  const sortedOrders = [...filteredOrders].sort((a, b) => {
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
              This will permanently remove all <strong>{statusCounts['served'] || 0}</strong> served orders. This action cannot be undone.
            </p>
          }
          confirmLabel="Clear All"
          onConfirm={handleClearAll}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}