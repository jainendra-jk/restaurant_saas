import { Pencil, Trash2, XCircle } from 'lucide-react';
import { useState, useEffect, memo } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import type { MenuItem } from '../data/mock-data';
import type { DietType } from '../types/menu-config';

function cardDietRing(diet: DietType): { border: string; fill: string } {
  switch (diet) {
    case 'veg':
      return { border: 'border-menu-veg', fill: 'bg-menu-veg' };
    case 'egg':
      return { border: 'border-amber-500', fill: 'bg-amber-500' };
    case 'nonveg':
      return { border: 'border-menu-nonveg', fill: 'bg-menu-nonveg' };
    case 'seafood':
      return { border: 'border-rose-600', fill: 'bg-rose-600' };
    default:
      return { border: 'border-gray-300', fill: 'bg-gray-300' };
  }
}
import { useMenuConfig } from '../context/MenuConfigContext';
import { MenuItemModal } from './MenuItemModal';

export const MENU_ITEM_DRAG_TYPE = 'MENU_ITEM';

interface MenuItemCardProps {
  item: MenuItem;
  categories: string[];
  activeCategory?: string;
  onToggleAvailability: (id: string) => void;
  onDelete: (id: string) => void;
  onRemoveFromCategory?: (id: string, category: string) => void;
  onEdit: (updatedItem: MenuItem) => void;
}

export const MenuItemCard = memo(function MenuItemCard({ item, categories, activeCategory, onToggleAvailability, onDelete, onRemoveFromCategory, onEdit }: MenuItemCardProps) {
  const { branding } = useMenuConfig();
  const [showEditModal, setShowEditModal] = useState(false);
  const dietRing = cardDietRing(item.diet ?? 'veg');

  const [{ isDragging }, dragRef, previewRef] = useDrag(() => ({
    type: MENU_ITEM_DRAG_TYPE,
    item: { id: item.id, name: item.name },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [item.id, item.name]);

  // Hide the default browser drag preview
  useEffect(() => {
    previewRef(getEmptyImage(), { captureDraggingState: true });
  }, [previewRef]);

  const openEditModal = () => {
    setShowEditModal(true);
  };

  const handleSave = (updatedItem: MenuItem) => {
    onEdit(updatedItem);
    setShowEditModal(false);
  };

  return (
    <>
      <div
        ref={dragRef as unknown as React.Ref<HTMLDivElement>}
        className={`relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4 overflow-hidden flex flex-col cursor-grab active:cursor-grabbing ${!item.isAvailable ? 'opacity-50' : ''} ${isDragging ? 'opacity-40 scale-95 shadow-lg ring-2 ring-primary/30' : ''}`}
      >
        {/* Top row: Veg indicator + Name + Availability toggle */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Veg / Non-veg indicator */}
            <span
              className={`flex-shrink-0 w-[18px] h-[18px] rounded border-[1.5px] grid place-items-center ${dietRing.border}`}
            >
              <span className={`w-[9px] h-[9px] rounded-full ${dietRing.fill}`} />
            </span>
            <h4 className="text-gray-900 truncate">{item.name}</h4>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <button
              onClick={() => onToggleAvailability(item.id)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer z-20 ${
                item.isAvailable ? 'bg-status-served' : 'bg-switch-background'
              }`}
              aria-label={item.isAvailable ? 'Mark unavailable' : 'Mark available'}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  item.isAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            {!item.isAvailable && (
              <span className="text-[10px] text-danger">Unavailable</span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 mb-3 leading-relaxed truncate">{item.description}</p>

        {/* Flavours section */}
        {item.flavours && item.flavours.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.flavours.map((flavour) => (
              <span
                key={flavour}
                className="px-2.5 py-0.5 rounded-full text-[11px] bg-brand-primary-light text-primary border border-[var(--color-brand-primary)]/20"
              >
                {flavour}
              </span>
            ))}
          </div>
        )}

        {/* Size/portion display */}
        <div className="flex items-center mt-auto mb-3">
          {item.sizes && item.sizes.length > 0 ? (
            <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-100 gap-0.5">
              {item.sizes.map((size) => (
                <div
                  key={size.label}
                  className="px-3 py-1.5 rounded-md text-xs flex flex-col items-center gap-0.5 text-gray-600"
                >
                  <span>{size.label.toUpperCase()}</span>
                  <span className="text-[10px] text-gray-400">{branding.currency}{size.price}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-100">
              <div className="px-3 py-1.5 rounded-md text-xs flex flex-col items-center gap-0.5 text-gray-600">
                <span>FULL</span>
                <span className="text-[10px] text-gray-400">{branding.currency}{item.price}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={openEditModal}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg bg-brand-primary-light text-primary hover:bg-[var(--color-brand-primary)]/20 transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          {activeCategory && activeCategory !== 'All' && onRemoveFromCategory ? (
            <button
              onClick={() => onRemoveFromCategory(item.id, activeCategory)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Remove
            </button>
          ) : (
            <button
              onClick={() => onDelete(item.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg bg-danger-light text-danger hover:bg-[var(--color-danger)]/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <MenuItemModal
          item={item}
          categories={categories}
          onClose={() => setShowEditModal(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
});