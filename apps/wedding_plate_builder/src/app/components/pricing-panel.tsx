import React from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import type { FoodItem } from './food-data';

interface PricingPanelProps {
  selectedItems: Map<string, { item: FoodItem; qty: number }>;
  onRemoveItem: (itemId: string) => void;
  plateTotal: number;
}

export function PricingPanel({ selectedItems, onRemoveItem, plateTotal }: PricingPanelProps) {
  const itemsArray = Array.from(selectedItems.values());

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="px-5 py-4 border-b border-[#e5e7eb]">
        <h2 className="text-[#111827]">Plate Summary</h2>
        <p className="text-[#6b7280] text-sm mt-1">
          {itemsArray.length} item{itemsArray.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'thin' }}>
        {itemsArray.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-14 h-14 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-3">
              <Sparkles size={24} className="text-[#f97316]" />
            </div>
            <p className="text-[#6b7280] text-sm">No items added yet</p>
            <p className="text-[#9ca3af] text-xs mt-1">Select from the menu to start</p>
          </div>
        ) : (
          <div className="space-y-2">
            {itemsArray.map(({ item, qty }) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#f9fafb] border border-[#e5e7eb]"
              >
                <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#111827] truncate">{item.name}</p>
                  <p className="text-xs text-[#6b7280]">
                    {qty} × ₹{item.price}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#f97316]">₹{qty * item.price}</span>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="w-6 h-6 rounded-full hover:bg-[#f3f4f6] flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={12} className="text-[#9ca3af]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price summary */}
      <div className="px-4 py-4 border-t border-[#e5e7eb]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#6b7280]">Subtotal</span>
          <span className="text-sm text-[#111827]">₹{plateTotal}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#6b7280]">Service charge</span>
          <span className="text-sm text-[#111827]">₹{Math.round(plateTotal * 0.1)}</span>
        </div>
        <div className="h-px bg-[#e5e7eb] my-2" />
        <div className="flex items-center justify-between">
          <span className="text-[#111827]">Per Plate</span>
          <span className="text-xl text-[#f97316]">
            ₹{Math.round(plateTotal * 1.1)}
          </span>
        </div>
      </div>
    </div>
  );
}
