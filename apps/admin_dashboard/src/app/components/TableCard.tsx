import { useState } from 'react';
import { QrCode, Users, Eye, Pencil } from 'lucide-react';
import type { Table } from '../data/mock-data';
import { InputModal } from './ui/InputModal';

interface TableCardProps {
  table: Table;
  activeOrderCount: number;
  onToggle: (tableId: string) => void;
  onViewOrders: (tableNumber: number) => void;
  onViewQR: (tableNumber: number) => void;
   onUpdateSeats: (tableId: string, newSeatCount: number) => void;
  isSelected?: boolean;
  selectedType?: 'orders' | 'qr' | null;
}

export function TableCard({
  table,
  activeOrderCount,
  onToggle,
  onViewOrders,
  onViewQR,
  onUpdateSeats,
  isSelected,
  selectedType,
}: TableCardProps) {
  const isActive = table.status === 'active';
  const [isEditingSeats, setIsEditingSeats] = useState(false);
  const [seatsValue, setSeatsValue] = useState(String(table.seats));
  const [seatsError, setSeatsError] = useState<string | undefined>();

  const openEditSeats = () => {
    setSeatsValue(String(table.seats));
    setSeatsError(undefined);
    setIsEditingSeats(true);
  };

  const handleConfirmSeats = () => {
    const trimmed = seatsValue.trim();
    const parsed = Number.parseInt(trimmed, 10);

    if (!trimmed || Number.isNaN(parsed) || parsed <= 0) {
      setSeatsError('Seats must be a positive whole number.');
      return;
    }

    onUpdateSeats(table.id, parsed);
    setIsEditingSeats(false);
  };

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md flex flex-col group ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : isActive
          ? 'border-primary/30'
          : 'border-gray-100'
      }`}
    >
      {/* Header row — table info + toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm ${
              isActive
                ? 'bg-table-occupied-light text-table-occupied'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {table.number}
          </div>
          <div>
            <h4 className="text-gray-900">Table {table.number}</h4>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-3 h-3" />
              {table.seats} seats
              <button
                type="button"
                onClick={openEditSeats}
                className="ml-1 p-1 rounded-full text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100"
                aria-label="Edit seats"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Toggle switch: OFF (left) = Inactive, ON (right) = Active */}
        <button
          onClick={() => onToggle(table.id)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
            isActive ? 'bg-table-available' : 'bg-gray-300'
          }`}
          aria-label={isActive ? 'Set table inactive' : 'Set table active'}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
              isActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Status badge — fixed height row */}
      <div className="h-6 mb-3 flex items-center">
        {isActive ? (
          <span className="flex items-center gap-1.5 text-xs bg-table-available-light text-table-available-text px-2 py-1 rounded-full w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-table-available" />
            Active
            {activeOrderCount > 0 && (
              <span className="bg-primary text-white rounded-full px-1.5 py-0 text-[10px] ml-0.5">
                {activeOrderCount}
              </span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Inactive
          </span>
        )}
      </div>

      {/* Action buttons — always visible */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onViewQR(table.number)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
            isSelected && selectedType === 'qr'
              ? 'bg-primary/10 text-primary'
              : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          QR Code
        </button>
        <button
          onClick={() => onViewOrders(table.number)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
            isSelected && selectedType === 'orders'
              ? 'bg-primary/10 text-primary'
              : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Orders
        </button>
      </div>

      {isEditingSeats && (
        <InputModal
          title="Edit seats"
          label="Seats"
          value={seatsValue}
          onChange={(value) => {
            setSeatsValue(value);
            if (seatsError) setSeatsError(undefined);
          }}
          onConfirm={handleConfirmSeats}
          onCancel={() => {
            setIsEditingSeats(false);
            setSeatsError(undefined);
          }}
          confirmLabel="Save"
          confirmDisabled={!seatsValue.trim()}
          error={seatsError}
        />
      )}
    </div>
  );
}
