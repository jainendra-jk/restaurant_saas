import { X, Plus, ChevronDown } from 'lucide-react';
import { useState, useRef } from 'react';
import type { MenuItem } from '../data/mock-data';
import type { DietType } from '../types/menu-config';
import { useMenuConfig } from '../context/MenuConfigContext';
import { useClickOutside } from '../hooks/useClickOutside';

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'veg', label: 'Veg' },
  { value: 'egg', label: 'Egg' },
  { value: 'nonveg', label: 'Non-veg' },
  { value: 'seafood', label: 'Seafood' },
];

/** FSSAI-style square frame + centered dot; same geometry for all diets. */
function DietGlyph({ diet, selected }: { diet: DietType; selected: DietType }) {
  const active = diet === selected;
  const ring =
    'inline-flex shrink-0 items-center justify-center size-[18px] rounded-[4px] border-2 box-border';
  const inner = 'rounded-full size-[8px]';
  let ringCls = `${ring} border-gray-300`;
  let innerCls = `${inner} bg-gray-300`;
  if (active) {
    switch (diet) {
      case 'veg':
        ringCls = `${ring} border-menu-veg`;
        innerCls = `${inner} bg-menu-veg`;
        break;
      case 'egg':
        ringCls = `${ring} border-amber-500`;
        innerCls = `${inner} bg-amber-500`;
        break;
      case 'nonveg':
        ringCls = `${ring} border-menu-nonveg`;
        innerCls = `${inner} bg-menu-nonveg`;
        break;
      case 'seafood':
        ringCls = `${ring} border-rose-600`;
        innerCls = `${inner} bg-rose-600`;
        break;
      default:
        break;
    }
  }
  return (
    <span className={ringCls} aria-hidden>
      <span className={innerCls} />
    </span>
  );
}

function dietSegmentClasses(d: DietType, selected: DietType): string {
  const base =
    'min-w-0 flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all cursor-pointer border leading-none';
  const inactive = 'bg-white border-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600';
  if (d !== selected) return `${base} ${inactive}`;
  switch (d) {
    case 'veg':
      return `${base} bg-green-50 border-menu-veg text-menu-veg`;
    case 'egg':
      return `${base} bg-amber-50 border-amber-500 text-amber-800`;
    case 'nonveg':
      return `${base} bg-red-50 border-menu-nonveg text-menu-nonveg`;
    case 'seafood':
      return `${base} bg-rose-50 border-rose-600 text-rose-800`;
    default:
      return `${base} ${inactive}`;
  }
}

interface MenuItemModalProps {
  item: MenuItem;
  categories: string[];
  onClose: () => void;
  onSave: (item: MenuItem) => void;
  isNew?: boolean;
}

export function MenuItemModal({ item, categories, onClose, onSave, isNew }: MenuItemModalProps) {
  const { branding } = useMenuConfig();
  const [editForm, setEditForm] = useState<MenuItem>(() => {
    const sizes = item.sizes && item.sizes.length > 0
      ? [...item.sizes]
      : isNew ? [] : [{ label: 'Full', price: item.price }];
    return {
      ...item,
      sizes,
      flavours: item.flavours ? [...item.flavours] : [],
      categories: [...item.categories],
      diet: item.diet ?? 'veg',
    };
  });
  const [newFlavour, setNewFlavour] = useState('');
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [newSizePrice, setNewSizePrice] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(categoryDropdownRef, () => setShowCategoryDropdown(false), showCategoryDropdown);

  const handleSave = () => {
    const name = editForm.name.trim();
    const selectedCategory = editForm.categories?.[0]?.trim() ?? '';
    if (!name) {
      setFormError('Item name is required.');
      return;
    }
    if (!selectedCategory) {
      setFormError('Please select a category before saving.');
      return;
    }
    setFormError(null);
    const updatedForm = { ...editForm };
    updatedForm.name = name;
    updatedForm.categories = [selectedCategory];
    if (updatedForm.sizes && updatedForm.sizes.length > 0) {
      updatedForm.price = updatedForm.sizes[0].price;
    }
    onSave(updatedForm);
  };

  const addFlavour = () => {
    const trimmed = newFlavour.trim();
    if (trimmed && !(editForm.flavours || []).includes(trimmed)) {
      setEditForm({ ...editForm, flavours: [...(editForm.flavours || []), trimmed] });
    }
    setNewFlavour('');
  };

  const removeFlavour = (f: string) => {
    setEditForm({ ...editForm, flavours: (editForm.flavours || []).filter((fl) => fl !== f) });
  };

  const addSize = () => {
    const label = newSizeLabel.trim();
    const price = parseFloat(newSizePrice);
    if (label && !isNaN(price) && price > 0) {
      setEditForm({ ...editForm, sizes: [...(editForm.sizes || []), { label, price }] });
      setNewSizeLabel('');
      setNewSizePrice('');
    }
  };

  const removeSize = (idx: number) => {
    setEditForm({ ...editForm, sizes: (editForm.sizes || []).filter((_, i) => i !== idx) });
  };

  const toggleCategory = (cat: string) => {
    // Single-category model: always set to just this one category
    setEditForm({ ...editForm, categories: [cat] });
    setShowCategoryDropdown(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-gray-900 text-base">{isNew ? 'Add Menu Item' : 'Edit Menu Item'}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Item Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Enter item name..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={2}
              placeholder="Enter description..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Diet: veg / egg / nonveg / seafood — single row */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Type</label>
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-1.5 grid grid-cols-4 gap-1">
              {DIET_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEditForm({ ...editForm, diet: value })}
                  className={dietSegmentClasses(value, editForm.diet)}
                >
                  <DietGlyph diet={value} selected={editForm.diet} />
                  <span className="text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Categories — single-select dropdown */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Category</label>
            <div ref={categoryDropdownRef} className="relative">
              <div
                className={`w-full px-3 py-2.5 rounded-xl border bg-white text-sm text-gray-700 cursor-pointer flex items-center min-h-[42px] transition-all ${
                  showCategoryDropdown ? 'border-primary ring-2 ring-primary/30' : 'border-gray-200'
                }`}
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                {editForm.categories && editForm.categories.length > 0 ? (
                  <span className="text-xs text-gray-700">{editForm.categories[0]}</span>
                ) : (
                  <span className="text-gray-400 text-xs">Select a category...</span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto flex-shrink-0 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              </div>

              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                  {categories.map((cat) => {
                    const isSelected = editForm.categories?.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-brand-primary-light text-primary'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full flex-shrink-0 border-2 grid place-items-center transition-colors ${
                          isSelected
                            ? 'border-primary'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </span>
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {categories.length === 0 ? (
              <p className="text-xs text-amber-700 mt-1.5">
                Add at least one category first, then add items.
              </p>
            ) : null}
          </div>

          {/* Portions / Sizes */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Portions / Sizes</label>
            {(editForm.sizes || []).length > 0 && (
              <div className="space-y-2 mb-2">
                {(editForm.sizes || []).map((size, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={size.label}
                      onChange={(e) => {
                        const updated = [...(editForm.sizes || [])];
                        updated[idx] = { ...updated[idx], label: e.target.value.toUpperCase() };
                        setEditForm({ ...editForm, sizes: updated });
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 uppercase focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <div className="relative w-24">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{branding.currency}</span>
                      <input
                        type="number"
                        value={size.price}
                        onChange={(e) => {
                          const updated = [...(editForm.sizes || [])];
                          updated[idx] = { ...updated[idx], price: parseFloat(e.target.value) || 0 };
                          setEditForm({ ...editForm, sizes: updated });
                        }}
                        className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <button
                      onClick={() => removeSize(idx)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSizeLabel}
                onChange={(e) => setNewSizeLabel(e.target.value.toUpperCase())}
                placeholder="Label (e.g. HALF)"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <input
                type="number"
                value={newSizePrice}
                onChange={(e) => setNewSizePrice(e.target.value)}
                placeholder="Price"
                className="w-24 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={addSize}
                className="p-2 rounded-lg bg-brand-primary-light text-primary hover:bg-[var(--color-brand-primary)]/20 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Flavours */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Flavours</label>
            {(editForm.flavours || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(editForm.flavours || []).map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-brand-primary-light text-primary border border-[var(--color-brand-primary)]/20"
                  >
                    {f}
                    <button
                      onClick={() => removeFlavour(f)}
                      className="text-primary/50 hover:text-primary cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFlavour}
                onChange={(e) => setNewFlavour(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFlavour(); } }}
                placeholder="Add a flavour..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                onClick={addFlavour}
                className="p-2 rounded-lg bg-brand-primary-light text-primary hover:bg-[var(--color-brand-primary)]/20 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        {formError ? <p className="text-xs text-danger mt-3">{formError}</p> : null}

        {/* Footer buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editForm.name.trim() || !editForm.categories?.[0]?.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-primary text-white hover:brightness-90 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isNew ? 'Add Item' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}