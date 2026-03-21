import { Plus, Trash2, Pencil, FileUp, Loader2 } from 'lucide-react';
import { useState, useCallback, memo, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { extractMenuFromPdf } from '@restaurant-saas/api-client';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { type MenuItem } from '../data/mock-data';
import { useMenuConfig } from '../context/MenuConfigContext';
import { useAuth } from '../context/AuthContext';
import { MenuItemCard, MENU_ITEM_DRAG_TYPE } from '../components/MenuItemCard';
import { MenuItemModal } from '../components/MenuItemModal';
import { MenuDragLayer } from '../components/MenuDragLayer';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { InputModal } from '../components/ui/InputModal';
import { EmptyState } from '../components/ui/EmptyState';
import { DangerFAB } from '../components/ui/DangerFAB';
import { SearchInput } from '../components/ui/SearchInput';

interface DroppableCategoryTabProps {
  category: string;
  isActive: boolean;
  count: number;
  onSelect: () => void;
  onDrop: (itemId: string, category: string) => void;
  onRename: () => void;
}

const DroppableCategoryTab = memo(function DroppableCategoryTab({ category, isActive, count, onSelect, onDrop, onRename }: DroppableCategoryTabProps) {
  const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
    accept: MENU_ITEM_DRAG_TYPE,
    drop: (draggedItem: { id: string; name: string }) => {
      onDrop(draggedItem.id, category);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [category, onDrop]);

  return (
    <div ref={dropRef as unknown as React.Ref<HTMLDivElement>} className="group relative min-w-0">
      <button
        onClick={onSelect}
        className={`w-full min-w-0 px-4 py-2.5 rounded-xl text-xs transition-all text-left cursor-pointer pr-9 flex items-center gap-2 ${
          isOver && canDrop
            ? 'bg-primary/20 text-primary ring-2 ring-primary/40 border border-primary/30 scale-[1.03]'
            : isActive
              ? 'bg-primary text-white shadow-sm'
              : canDrop
                ? 'bg-white text-gray-500 hover:bg-gray-50 border border-dashed border-primary/30'
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
        }`}
      >
        <span className="min-w-0 truncate" title={category}>{category}</span>
        <span className="flex-shrink-0 text-xs opacity-70">{count}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
          isActive
            ? 'text-white/70 hover:text-white hover:bg-white/20'
            : 'text-gray-400 hover:text-primary hover:bg-brand-primary-light'
        }`}
        title={`Rename "${category}"`}
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
});

export function MenuManagement() {
  const { menuItems: configItems, categories: configCategories, loading, applyExtractedMenu } = useMenuConfig();
  const { accessToken, restaurant } = useAuth();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!loading) {
      setItems(configItems);
      setCategories(configCategories);
    }
  }, [loading, configItems, configCategories]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<string | null>(null);
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryValue, setRenameCategoryValue] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  const handleToggleAvailability = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isAvailable: !item.isAvailable } : item))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      return updated;
    });
  }, []);

  const handleEdit = useCallback((updatedItem: MenuItem) => {
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
  }, []);

  const handleDeleteCategory = (cat: string) => {
    // With single-category model, all items in this category get deleted
    setItems((prev) => prev.filter((item) => !item.categories.includes(cat)));
    setCategories((prev) => prev.filter((c) => c !== cat));
    if (activeCategory === cat) {
      setActiveCategory('All');
    }
    setDeleteCategoryTarget(null);
  };

  const handleRenameCategory = () => {
    if (!renamingCategory) return;
    const trimmed = renameCategoryValue.trim();
    if (!trimmed || trimmed === renamingCategory || categories.includes(trimmed)) {
      setRenamingCategory(null);
      setRenameCategoryValue('');
      return;
    }
    const oldName = renamingCategory;
    setCategories((prev) => prev.map((c) => (c === oldName ? trimmed : c)));
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        categories: item.categories.map((c) => (c === oldName ? trimmed : c)),
      }))
    );
    if (activeCategory === oldName) {
      setActiveCategory(trimmed);
    }
    setRenamingCategory(null);
    setRenameCategoryValue('');
  };

  const handleAddItem = (newItem: MenuItem) => {
    setItems((prev) => [...prev, newItem]);
    setShowAddItemModal(false);
  };

  /** Move item to a category (replaces existing category — single-category model) */
  const handleMoveToCategory = useCallback((itemId: string, targetCategory: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        // Already in this category? nothing to do
        if (item.categories.length === 1 && item.categories[0] === targetCategory) return item;
        return { ...item, categories: [targetCategory] };
      })
    );
    setActiveCategory(targetCategory);
  }, []);

  /** Remove item from its category (unassigns it, keeping the item in "All" with no category) */
  const handleRemoveFromCategory = useCallback((id: string, category: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, categories: item.categories.filter((c) => c !== category) };
      })
    );
  }, []);

  const emptyItem: MenuItem = {
    id: `item-${Date.now()}`,
    name: '',
    price: 0,
    categories: activeCategory !== 'All' ? [activeCategory] : categories.length > 0 ? [categories[0]] : [],
    image: '',
    isVeg: true,
    isAvailable: true,
    description: '',
    sizes: [],
    flavours: [],
  };

  const filteredItems = useMemo(
    () =>
      (activeCategory === 'All' ? items : items.filter((item) => item.categories.includes(activeCategory))).filter(
        (item) =>
          searchQuery.trim() === ''
            ? true
            : item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [items, activeCategory, searchQuery]
  );

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of categories) {
      map.set(cat, items.filter((i) => i.categories.includes(cat)).length);
    }
    return map;
  }, [items, categories]);

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const deleteCategoryItemCount = deleteCategoryTarget
    ? (categoryCounts.get(deleteCategoryTarget) ?? 0)
    : 0;

  const apiBaseConfigured = Boolean(import.meta.env.VITE_API_BASE_URL?.trim());
  const canImportPdf = apiBaseConfigured && !!accessToken && !!restaurant?.id;

  const handlePickPdf = () => {
    pdfInputRef.current?.click();
  };

  const onPdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!canImportPdf || !accessToken || !restaurant?.id) {
      toast.error('Set VITE_API_BASE_URL, start apps/api, and sign in.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please choose a PDF file.');
      return;
    }
    setPdfBusy(true);
    try {
      const data = await extractMenuFromPdf(file, accessToken, restaurant.id, restaurant.name);
      applyExtractedMenu(data);
      toast.success('Menu imported from PDF — review before saving to Supabase.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
    <MenuDragLayer />
    <div className="flex flex-col h-full -m-5 lg:-m-6">
      {/* Sticky Header Row */}
      <div className="sticky top-0 z-30 bg-background px-5 lg:px-6 pt-5 lg:pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="shrink-0">
            <h1 className="text-gray-900">Menu Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{items.length} items across {categories.length} categories</p>
          </div>

          <div className="flex-1 flex justify-center min-w-[180px]">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search menu items..."
              className="w-full max-w-md"
            />
          </div>

          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={onPdfSelected}
          />
          <button
            type="button"
            disabled={!canImportPdf || pdfBusy || loading}
            title={
              !apiBaseConfigured
                ? 'Set VITE_API_BASE_URL and run pnpm dev:api'
                : !accessToken || !restaurant?.id
                  ? 'Sign in to import'
                  : 'Extract menu from PDF (Gemini)'
            }
            onClick={handlePickPdf}
            className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            Import PDF
          </button>
          <button
            onClick={() => setShowAddItemModal(true)}
            className="shrink-0 flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-xl text-xs hover:brightness-90 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-row flex-1 min-h-0">
        {/* Category Sidebar */}
        <div className="w-52 flex-shrink-0 bg-background px-5 lg:px-6 pt-10 pb-4 border-r border-gray-100 overflow-y-auto max-h-[calc(100vh-120px)]">
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-4 py-2.5 rounded-xl text-xs whitespace-nowrap transition-colors text-left cursor-pointer ${
                activeCategory === 'All'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              All Items
              <span className="ml-2 text-xs opacity-70">{items.length}</span>
            </button>
            {categories.map((cat) => {
              const count = categoryCounts.get(cat) ?? 0;
              const isActive = activeCategory === cat;

              return (
                <DroppableCategoryTab
                  key={cat}
                  category={cat}
                  isActive={isActive}
                  count={count}
                  onSelect={() => setActiveCategory(cat)}
                  onDrop={handleMoveToCategory}
                  onRename={() => {
                    setRenamingCategory(cat);
                    setRenameCategoryValue(cat);
                  }}
                />
              );
            })}

            {/* Add Category button */}
            <button
              onClick={() => setShowAddCategory(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs whitespace-nowrap border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary transition-colors cursor-pointer mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-5 pt-6 lg:p-6 lg:pt-8">
          {filteredItems.length === 0 ? (
            <EmptyState
              title="No items found"
              subtitle="Add items to this category"
            />
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  activeCategory={activeCategory}
                  onToggleAvailability={handleToggleAvailability}
                  onDelete={handleDelete}
                  onRemoveFromCategory={handleRemoveFromCategory}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <MenuItemModal
          item={emptyItem}
          categories={categories}
          onClose={() => setShowAddItemModal(false)}
          onSave={handleAddItem}
          isNew
        />
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <InputModal
          title="Add New Category"
          label="Category Name"
          placeholder="e.g. Desserts, Beverages..."
          value={newCategoryName}
          onChange={setNewCategoryName}
          onConfirm={handleAddCategory}
          onCancel={() => { setShowAddCategory(false); setNewCategoryName(''); }}
          confirmLabel="Save Category"
          confirmDisabled={!newCategoryName.trim()}
        />
      )}

      {/* Rename Category Modal */}
      {renamingCategory && (
        <InputModal
          title="Rename Category"
          label="Category Name"
          placeholder="Enter new category name..."
          value={renameCategoryValue}
          onChange={setRenameCategoryValue}
          onConfirm={handleRenameCategory}
          onCancel={() => { setRenamingCategory(null); setRenameCategoryValue(''); }}
          confirmLabel="Save Changes"
          confirmDisabled={!renameCategoryValue.trim() || renameCategoryValue.trim() === renamingCategory || categories.includes(renameCategoryValue.trim())}
          error={renameCategoryValue.trim() && renameCategoryValue.trim() !== renamingCategory && categories.includes(renameCategoryValue.trim()) ? "A category with this name already exists" : undefined}
        />
      )}

      {/* Delete Category FAB - only visible when a specific category is selected */}
      <DangerFAB
        icon={<Trash2 className="w-5 h-5" />}
        onClick={() => setDeleteCategoryTarget(activeCategory)}
        title={`Delete category "${activeCategory}"`}
        visible={activeCategory !== 'All' && filteredItems.length > 0}
      />

      {/* Delete Category Confirmation Modal */}
      {deleteCategoryTarget && (
        <ConfirmModal
          icon={<Trash2 className="w-5 h-5 text-danger" />}
          iconBg="bg-danger-light"
          title="Delete Category"
          description={
            <>
              <p className="text-sm text-gray-500 mb-1">
                Are you sure you want to delete <span className="text-gray-900">"{deleteCategoryTarget}"</span>?
              </p>
              <p className="text-sm text-gray-400">
                This will permanently remove all <span className="text-danger">{deleteCategoryItemCount} item{deleteCategoryItemCount !== 1 ? 's' : ''}</span> in this category. This action cannot be undone.
              </p>
            </>
          }
          confirmLabel="Delete All Items"
          onConfirm={() => handleDeleteCategory(deleteCategoryTarget)}
          onCancel={() => setDeleteCategoryTarget(null)}
        />
      )}
    </div>
    </DndProvider>
  );
}