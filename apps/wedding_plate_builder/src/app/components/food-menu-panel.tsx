import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Flame,
  ChefHat,
  Wheat,
  Soup,
  Cake,
  GlassWater,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { categories, type FoodItem } from './food-data';

interface FoodMenuPanelProps {
  selectedItems: Map<string, { item: FoodItem; qty: number }>;
  onAddItem: (item: FoodItem) => void;
  onRemoveItem: (itemId: string) => void;
}

const categoryIconMap: Record<string, LucideIcon> = {
  'Starters': Flame,
  'Main Course': ChefHat,
  'Breads': Wheat,
  'Rice': Soup,
  'Desserts': Cake,
  'Drinks': GlassWater,
  'Add-ons': Sparkles,
};

export function FoodMenuPanel({ selectedItems, onAddItem, onRemoveItem }: FoodMenuPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Starters', 'Main Course']));

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // count how many items from a category are currently selected
  const categorySelectedCount = (catName: string) =>
    categories
      .find(c => c.name === catName)
      ?.items.filter(i => selectedItems.has(i.id)).length ?? 0;

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="px-5 py-4 border-b border-[#e5e7eb]">
        <h2 className="text-[#111827]">Food Menu</h2>
        <p className="text-[#6b7280] text-sm mt-1">Select items for your wedding plate</p>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-2" style={{ scrollbarWidth: 'thin' }}>
        {categories.map(cat => {
          const isExpanded = expandedCategories.has(cat.name);
          const Icon = categoryIconMap[cat.name] ?? Sparkles;
          const selectedCount = categorySelectedCount(cat.name);
          const hasSelection = selectedCount > 0;

          return (
            <div key={cat.name} className="mb-1.5">
              <button
                onClick={() => toggleCategory(cat.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                  isExpanded ? 'bg-[#fff7ed]' : 'hover:bg-[#f9fafb]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {/* Monochromatic icon container */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: isExpanded || hasSelection
                        ? 'linear-gradient(135deg, #fff7ed, #ffedd5)'
                        : '#f3f4f6',
                      border: isExpanded || hasSelection
                        ? '1px solid rgba(249,115,22,0.25)'
                        : '1px solid #e5e7eb',
                    }}
                  >
                    <Icon
                      size={14}
                      color={isExpanded || hasSelection ? '#f97316' : '#9ca3af'}
                      strokeWidth={2}
                    />
                  </div>

                  <span
                    className="text-sm transition-colors"
                    style={{ color: isExpanded || hasSelection ? '#111827' : '#374151' }}
                  >
                    {cat.name}
                  </span>

                  {/* Item count badge — orange when items are selected */}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full transition-all"
                    style={{
                      background: hasSelection ? '#fff7ed' : '#f3f4f6',
                      color: hasSelection ? '#f97316' : '#9ca3af',
                      border: hasSelection ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                    }}
                  >
                    {hasSelection ? `${selectedCount}/${cat.items.length}` : cat.items.length}
                  </span>
                </div>

                {isExpanded ? (
                  <ChevronUp size={14} color="#9ca3af" />
                ) : (
                  <ChevronDown size={14} color="#9ca3af" />
                )}
              </button>

              {isExpanded && (
                <div className="grid gap-1.5 pb-2 pt-1 pl-1">
                  {cat.items.map(item => {
                    const selected = selectedItems.get(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded-xl border transition-all h-14 overflow-hidden ${
                          selected
                            ? 'border-[#f97316] bg-[#fff7ed] shadow-sm'
                            : 'border-[#e5e7eb] bg-white hover:border-[#f97316]/50 hover:shadow-sm'
                        }`}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-xs text-[#111827] truncate">{item.name}</p>
                          <p className="text-[10px] text-[#9ca3af]">₹{item.price}/plate</p>
                        </div>
                        {selected ? (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="w-6 h-6 rounded-full bg-[#f97316] text-white flex items-center justify-center hover:bg-[#ea580c] transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-5 text-center text-xs text-[#111827]">{selected.qty}</span>
                            <button
                              onClick={() => onAddItem(item)}
                              className="w-6 h-6 rounded-full bg-[#f97316] text-white flex items-center justify-center hover:bg-[#ea580c] transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onAddItem(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#f97316] text-white text-[11px] hover:bg-[#ea580c] transition-colors flex items-center gap-1 flex-shrink-0"
                          >
                            <Plus size={12} />
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}