import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Plus, Minus, Trash2 } from "lucide-react";
import { useCart, getPortionPrice } from "../shared/CartContext";
import { useNavigate, useParams } from "react-router";
import { BotanicalDecor } from "../shared/ArchFrame";
import { useMenu } from "../../context/MenuContext";
import { DietIndicator } from "../shared/DietIndicator";
import { ScreenHeader } from "../shared/ScreenHeader";
import { PORTION_LABELS } from "../../constants/portions";
import * as typography from "../../theme/typography";
export function CartScreen() {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCart();
  const { currency } = useMenu();
  const navigate = useNavigate();
  const params = useParams<{ slug?: string; tableNum?: string; restaurantSlug?: string; tableNumber?: string }>();
  const basePath =
    params.slug && params.tableNum
      ? `/r/${params.slug}/t/${params.tableNum}`
      : params.restaurantSlug && params.tableNumber
        ? `/order/${params.restaurantSlug}/table/${params.tableNumber}`
        : "";

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center px-4 sm:px-6" style={{ paddingTop: "max(3rem, env(safe-area-inset-top))", paddingBottom: "1rem" }}>
          <button
            onClick={() => navigate(basePath ? `${basePath}/menu` : "/menu")}
            className="w-10 h-10 rounded-xl bg-card border border-primary/10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-foreground/60" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8">
          <BotanicalDecor className="w-24 h-24 mb-6 opacity-20" />
          <p
            className="text-foreground/60 text-center"
            style={typography.titleSm}
          >
            Your cart is empty
          </p>
          <p
            className="text-muted-foreground/50 mt-2 text-center"
            style={typography.bodyBase}
          >
            Explore our menu and add items
          </p>
          <button
            onClick={() => navigate(basePath ? `${basePath}/menu` : "/menu")}
            className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl active:scale-95 transition-transform"
            style={typography.bodyLgMid}
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  const taxes = Math.round(totalPrice * 0.05);
  const grandTotal = totalPrice + taxes;

  return (
    <div className="min-h-screen bg-background">
      <ScreenHeader
        onBack={() => navigate(basePath ? `${basePath}/menu` : "/menu")}
        title="Your Order"
        subtitle={`${totalItems} ${totalItems === 1 ? "item" : "items"}`}
      />

      {/* Arch decoration */}
      <div className="flex justify-center mb-4">
        <svg viewBox="0 0 200 20" className="w-32 h-auto" fill="none">
          <path
            d="M10 20 L10 8 Q10 1 30 1 L170 1 Q190 1 190 8 L190 20"
            stroke="var(--primary)"
            strokeWidth="0.6"
            strokeOpacity="0.2"
          />
        </svg>
      </div>

      {/* Cart Items */}
      <div className="px-4 sm:px-6 space-y-3 pb-4">
        <AnimatePresence>
          {items.map((cartItem, idx) => {
            const unitPrice = getPortionPrice(cartItem.item, cartItem.portion);
            return (
              <motion.div
                key={`${cartItem.item.id}__${cartItem.portion}__${cartItem.selectedOption ?? ""}`}
                className="bg-card rounded-xl p-4 border border-primary/10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, padding: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                layout
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <DietIndicator diet={cartItem.item.diet} />
                      <h3
                        className="text-foreground/85 line-clamp-2 min-h-[2.25em] leading-tight break-words"
                        style={typography.bodyXlMid}
                      >
                        {cartItem.item.name}
                        {cartItem.selectedOption ? ` (${cartItem.selectedOption})` : ""}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                        style={{ ...typography.bodySmSemi, letterSpacing: "0.03em" }}
                      >
                        {PORTION_LABELS[cartItem.portion].short}
                      </span>
                      <span
                        className="text-muted-foreground/50"
                        style={typography.bodyMd}
                      >
                        {currency}{unitPrice} each
                      </span>
                    </div>
                    <p
                      className="text-foreground/70 mt-1.5"
                      style={typography.bodyLgMid}
                    >
                      {currency}{unitPrice * cartItem.quantity}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-primary/10 rounded-xl">
                      <button
                        onClick={() =>
                          updateQuantity(cartItem.item.id, cartItem.portion, cartItem.quantity - 1, cartItem.selectedOption)
                        }
                        className="w-8 h-8 flex items-center justify-center text-primary active:scale-90 transition-transform"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className="w-5 text-center text-foreground/80"
                        style={typography.bodyLgSemi}
                      >
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(cartItem.item.id, cartItem.portion, cartItem.quantity + 1, cartItem.selectedOption)
                        }
                        className="w-8 h-8 flex items-center justify-center text-primary active:scale-90 transition-transform"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(cartItem.item.id, cartItem.portion, cartItem.selectedOption)}
                      className="w-8 h-8 flex items-center justify-center text-destructive/50 active:scale-90 transition-transform"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Price breakdown */}
      <div className="px-4 sm:px-6 pb-8">
        <div className="bg-card rounded-xl p-5 border border-primary/10 space-y-3">
          <h3
            className="text-foreground/60 tracking-[0.1em] uppercase mb-3"
            style={typography.bodyLabel}
          >
            Bill Summary
          </h3>
          <div className="flex justify-between">
            <span
              className="text-foreground/60"
              style={typography.bodyBase}
            >
              Subtotal
            </span>
            <span
              className="text-foreground/80"
              style={typography.bodyBaseMid}
            >
              {currency}{totalPrice}
            </span>
          </div>
          <div className="flex justify-between">
            <span
              className="text-foreground/60"
              style={typography.bodyBase}
            >
              GST (5%)
            </span>
            <span
              className="text-foreground/80"
              style={typography.bodyBaseMid}
            >
              {currency}{taxes}
            </span>
          </div>
          <div className="border-t border-primary/10 pt-3 flex justify-between">
            <span
              className="text-foreground/80"
              style={typography.bodyXlSemi}
            >
              Total
            </span>
            <span
              className="text-foreground/90"
              style={typography.titleSmBoldLarge}
            >
              {currency}{grandTotal}
            </span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="px-4 sm:px-6" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
        <button
          onClick={() => navigate(basePath ? `${basePath}/checkout` : "/checkout")}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-4 active:scale-[0.98] transition-transform shadow-md"
          style={typography.bodyXlMid}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}