import { useState } from 'react';
import { TableCard } from '../components/TableCard';
import { OrderSlider } from '../components/OrderSlider';
import { QRCodeSlider } from '../components/QRCodeSlider';
import { useOrders } from '../context/OrdersContext';
import { PageHeader } from '../components/ui/PageHeader';
import { SliderLayout } from '../components/ui/SliderLayout';

type SliderState = { type: 'orders' | 'qr'; tableNumber: number } | null;

export function Tables() {
  const { orders, tables, updateTableStatus, updateTableSeats } = useOrders();
  const [slider, setSlider] = useState<SliderState>(null);

  const handleToggle = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      updateTableStatus(tableId, table.status === 'active' ? 'inactive' : 'active');
    }
  };

  const handleUpdateSeats = (tableId: string, newSeatCount: number) => {
    updateTableSeats(tableId, newSeatCount);
  };

  const handleOpenSlider = (type: 'orders' | 'qr', tableNumber: number) => {
    setSlider((prev) =>
      prev?.type === type && prev.tableNumber === tableNumber
        ? null
        : { type, tableNumber }
    );
  };

  const getActiveOrderCount = (tableNumber: number) =>
    orders.filter((o) => o.tableNo === String(tableNumber)).length;

  const activeTables = tables.filter((t) => t.status === 'active').length;
  const inactiveTables = tables.filter((t) => t.status === 'inactive').length;
  const isSliderOpen = slider !== null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Table Management"
        subtitle={`${activeTables} active · ${inactiveTables} inactive · ${tables.length} total`}
      />

      <SliderLayout
        isOpen={isSliderOpen}
        gridColsClosed="grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        gridColsOpen="grid-cols-2"
        sliderWidth={360}
        sliderHeight="calc(100vh - 140px)"
        sliderContent={
          slider?.type === 'orders' ? (
            <OrderSlider
              tableNumber={slider.tableNumber}
              orders={orders}
              onClose={() => setSlider(null)}
            />
          ) : slider?.type === 'qr' ? (
            <QRCodeSlider
              tableNumber={slider.tableNumber}
              onClose={() => setSlider(null)}
            />
          ) : null
        }
      >
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            activeOrderCount={getActiveOrderCount(table.number)}
            onToggle={handleToggle}
            onViewOrders={(num) => handleOpenSlider('orders', num)}
            onViewQR={(num) => handleOpenSlider('qr', num)}
            onUpdateSeats={handleUpdateSeats}
            isSelected={slider?.tableNumber === table.number}
            selectedType={slider?.tableNumber === table.number ? slider.type : null}
          />
        ))}
      </SliderLayout>
    </div>
  );
}
