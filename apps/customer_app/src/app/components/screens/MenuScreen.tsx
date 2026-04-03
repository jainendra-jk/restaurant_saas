import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, Leaf } from "lucide-react";
import { useMenu } from "../../context/MenuContext";
import { useCustomerSession } from "../../context/CustomerSessionContext";
import type { MenuItem } from "../shared/menu-data";

function TableLabel() {
  const { tableNum } = useCustomerSession();
  if (tableNum == null) return null;
  return (
    <p className="text-muted-foreground/50 mt-1" style={typography.bodyMd}>
      Table #{tableNum}
    </p>
  );
}
import { useCart, PortionSize, getPortionPrice } from "../shared/CartContext";
import { ArchHeader, BotanicalDecor } from "../shared/ArchFrame";
import { BottomCartBar } from "../shared/BottomCartBar";
import { DietIndicator } from "../shared/DietIndicator";
import { FoodCategoryIcon } from "../shared/FoodCategoryIcon";
import { PORTION_LABELS } from "../../constants/portions";
import * as typography from "../../theme/typography";
import { formatPrice } from "../../utils/formatPrice";
import { haptics } from "../../utils/haptics";
import { MenuScreenSkeleton } from "../shared/CustomerSkeletons";

function PortionCapsule({
  selected,
  onChange,
  itemId,
  options,
}: {
  selected: PortionSize;
  onChange: (p: PortionSize) => void;
  itemId: string;
  options: PortionSize[];
}) {
  return (
    <div
      className="flex min-w-[7rem] rounded-full border border-primary/20 bg-background relative"
      style={typography.fontBody}
    >
      {options.map((key, i) => {
        const isFirst = i === 0;
        const isLast = i === options.length - 1;
        const { short } = PORTION_LABELS[key];
        return (
          <button
            key={key}
            onClick={() => {
              haptics.gestureLight();
              onChange(key);
            }}
            className={`relative z-10 flex-1 min-w-0 px-2 py-1.5 active:scale-95 transition-colors duration-200 ${
              selected === key
                ? "text-primary-foreground"
                : "text-foreground/50 hover:text-foreground/70"
            } ${!isLast ? "border-r border-primary/15" : ""}`}
            style={typography.bodyStyle("0.6rem", { fontWeight: 600, letterSpacing: "0.05em" })}
          >
            {selected === key && (
              <motion.span
                layoutId={`portion-pill-${itemId}`}
                className={`absolute inset-0 bg-primary ${
                  isFirst ? "rounded-l-full" : ""
                } ${isLast ? "rounded-r-full" : ""}`}
                style={{ zIndex: -1 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            {short}
          </button>
        );
      })}
    </div>
  );
}

function getDefaultPortion(availablePortions: PortionSize[]): PortionSize {
  if (availablePortions.includes("full")) return "full";
  return availablePortions[0] ?? "full";
}

function MenuItemCard({ item, currency }: { item: MenuItem; currency: string }) {
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  const hasOptions = (item.options?.length ?? 0) > 0;
  const [selectedPortion, setSelectedPortion] = useState<PortionSize>(() =>
    getDefaultPortion(item.availablePortions)
  );
  const [selectedOption, setSelectedOption] = useState<string | undefined>(() =>
    hasOptions ? item.options![0] : undefined
  );
  const [showAdded, setShowAdded] = useState(false);

  const quantity = getItemQuantity(item.id, selectedPortion, selectedOption);
  const currentPrice = getPortionPrice(item, selectedPortion);
  const showCapsule = item.availablePortions.length > 1;

  const handleAdd = () => {
    addItem(item, selectedPortion, selectedOption);
    haptics.cartAdd();
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 800);
  };

  return (
    <motion.div
      className={`bg-card rounded-xl p-4 border transition-colors duration-300 ${
        quantity > 0 ? "border-primary/30 shadow-sm" : "border-primary/10"
      }`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      {/* Top row: name + veg indicator & add button */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2.5 mb-1">
            <div className="pt-0.5">
              <DietIndicator diet={item.diet} />
            </div>
            <h3
              className="text-foreground/90 line-clamp-2 min-h-[2.5em] leading-tight"
              style={typography.body2xlMid}
            >
              {item.name}
            </h3>
          </div>
          {item.description ? (
            <p
              className="text-muted-foreground/70 mt-1 whitespace-pre-wrap break-words"
              style={{ ...typography.bodyMd2, lineHeight: 1.5 }}
            >
              {item.description}
            </p>
          ) : null}
          {hasOptions && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.options!.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    haptics.gestureLight();
                    setSelectedOption(opt);
                  }}
                  className={`px-2.5 py-1 rounded-full border text-[0.65rem] font-medium transition-colors active:scale-95 ${
                    selectedOption === opt
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground/70 border-primary/20 hover:border-primary/40"
                  }`}
                  style={{ ...typography.fontBody, letterSpacing: "0.02em" }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add / Qty control */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <AnimatePresence mode="wait">
            {quantity === 0 ? (
              <motion.button
                key="add"
                onClick={handleAdd}
                className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-transform"
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            ) : (
              <motion.div
                key="qty"
                className="flex items-center gap-1 bg-primary rounded-xl overflow-hidden"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <button
                  onClick={() => {
                    updateQuantity(item.id, selectedPortion, quantity - 1, selectedOption);
                    haptics.quantityChange();
                  }}
                  className="w-9 h-9 flex items-center justify-center text-primary-foreground active:bg-primary/80 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span
                  className="w-6 text-center text-primary-foreground"
                  style={{
                    ...typography.bodyLgSemi,
                  }}
                >
                  {quantity}
                </span>
                <button
                  onClick={() => {
                    updateQuantity(item.id, selectedPortion, quantity + 1, selectedOption);
                    haptics.quantityChange();
                  }}
                  className="w-9 h-9 flex items-center justify-center text-primary-foreground active:bg-primary/80 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showAdded && (
              <motion.span
                className="text-primary"
                style={typography.bodySm}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                Added!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom row: portion capsule (if >1 variant) & price */}
      <div className="flex items-center justify-between mt-3">
        {showCapsule ? (
          <PortionCapsule
            selected={selectedPortion}
            onChange={setSelectedPortion}
            itemId={item.id}
            options={item.availablePortions}
          />
        ) : (
          <div aria-hidden className="min-w-[7rem]" />
        )}
        <motion.p
          key={`${item.id}-${selectedPortion}`}
          className="text-foreground/80"
          style={{ ...typography.body2xl, fontWeight: 600 }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {currency}{formatPrice(currentPrice)}
        </motion.p>
      </div>
    </motion.div>
  );
}

export function MenuScreen() {
  const { categories, menuItems, branding, currency, loading, error, menuUpdatedAt } = useMenu();
  const [activeCategory, setActiveCategory] = useState(
    () => categories[0]?.id ?? ""
  );
  const tabsRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [showMenuUpdated, setShowMenuUpdated] = useState(false);
  const lastMenuUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (categories.length && !categories.find((c) => c.id === activeCategory)) {
      setActiveCategory(categories[0]!.id);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    if (!menuUpdatedAt) return;
    if (lastMenuUpdatedAtRef.current === menuUpdatedAt) return;
    lastMenuUpdatedAtRef.current = menuUpdatedAt;
    setShowMenuUpdated(true);
    const t = setTimeout(() => setShowMenuUpdated(false), 2500);
    return () => clearTimeout(t);
  }, [menuUpdatedAt]);

  const filteredItems = menuItems.filter(
    (item) => item.category === activeCategory
  );
  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  useEffect(() => {
    // Small delay so the entrance animation plays after mount
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.querySelector(
        `[data-cat="${activeCategory}"]`
      );
      if (activeTab) {
        (activeTab as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeCategory]);

  if (loading) {
    return <MenuScreenSkeleton />;
  }
  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-background relative">
        <ArchHeader className="pt-10 sm:pt-12 pb-4" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
          <motion.div
            className="text-center relative"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <BotanicalDecor className="absolute -top-2 -right-2 w-20 h-20" />
            <BotanicalDecor className="absolute -top-2 -left-2 w-16 h-16 scale-x-[-1]" />
            <h1
              className="text-foreground/90 tracking-[0.25em]"
              style={typography.titleLg}
            >
              {branding.restaurantName}
            </h1>
          </motion.div>
        </ArchHeader>
        {error ? (
          <div className="px-4 sm:px-6 pt-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
              {error}
            </div>
          </div>
        ) : null}
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-muted-foreground/70" style={typography.bodyBase}>
            No categories available
          </p>
          <p className="text-muted-foreground/50 mt-2" style={typography.bodyMd}>
            There are no menu items to display at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Entrance overlay — fades out as menu appears */}
      <motion.div
        className="fixed inset-0 bg-background z-50 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />

      {/* Header */}
      <ArchHeader className="pt-10 sm:pt-12 pb-4" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
        <motion.div
          className="text-center relative"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <BotanicalDecor className="absolute -top-2 -right-2 w-20 h-20" />
          <BotanicalDecor className="absolute -top-2 -left-2 w-16 h-16 scale-x-[-1]" />
          <div className="flex items-center justify-center gap-2 mb-1">
            <Leaf className="w-4 h-4 text-primary/50" />
            <span
              className="text-muted-foreground/60 tracking-[0.2em] uppercase"
              style={{
                ...typography.bodyXs,
              }}
            >
              {branding.tagline}
            </span>
            <Leaf className="w-4 h-4 text-primary/50 scale-x-[-1]" />
          </div>
          <h1
            className="text-foreground/90 tracking-[0.25em]"
            style={typography.titleLg}
          >
            {branding.restaurantName}
          </h1>
          <TableLabel />
        </motion.div>
      </ArchHeader>

      <AnimatePresence>
        {showMenuUpdated && (
          <motion.div
            className="px-4 sm:px-6 -mt-2 pb-2"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <div className="w-full rounded-xl border border-primary/15 bg-primary/10 text-primary px-3 py-2 text-sm text-center">
              Menu updated
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <div className="px-4 sm:px-6 pt-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
            {error}
          </div>
        </div>
      ) : null}

      {/* Category tabs - sticky */}
      <motion.div
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-primary/10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
      >
        <div
          ref={tabsRef}
          className="flex gap-2 px-4 sm:px-6 py-3 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-cat={cat.id}
              onClick={() => {
                haptics.gestureLight();
                setActiveCategory(cat.id);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all duration-300 active:scale-95 ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-foreground/60 border border-primary/10"
              }`}
              style={typography.bodyBaseMid}
            >
              <FoodCategoryIcon className="w-5 h-5 shrink-0" />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Category title with arch */}
      <motion.div
        className="px-4 sm:px-6 pt-6 pb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <div className="text-center mb-4">
          <svg
            viewBox="0 0 200 30"
            className="w-32 h-auto mx-auto mb-2"
            fill="none"
          >
            <path
              d="M10 30 L10 12 Q10 2 30 2 L170 2 Q190 2 190 12 L190 30"
              stroke="var(--primary)"
              strokeWidth="0.8"
              strokeOpacity="0.25"
              fill="none"
            />
          </svg>
          <h2
            className="text-foreground/80 tracking-[0.15em]"
            style={typography.titleMd}
          >
            {activeCategoryData?.name}
          </h2>
          <div className="w-8 h-[1px] bg-primary/30 mx-auto mt-2" />
        </div>
      </motion.div>

      {/* Menu items */}
      <div className="px-4 sm:px-6 pb-32 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            className="space-y-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {filteredItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <MenuItemCard item={item} currency={currency} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomCartBar />
    </div>
  );
}