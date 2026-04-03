import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";
import { useCart, getPortionPrice } from "../shared/CartContext";
import { useNavigate, useParams } from "react-router";
import { BotanicalDecor } from "../shared/ArchFrame";
import { ScreenHeader } from "../shared/ScreenHeader";
import { useMenu } from "../../context/MenuContext";
import { useCustomerSession } from "../../context/CustomerSessionContext";
import { getOrderFlowBasePath } from "../../utils/orderRoutePaths";
import type { OrderSummary } from "../../utils/receiptPdf";
import { getPortionShort } from "../../constants/portions";
import { computeTaxes } from "../../utils/tax";
import * as typography from "../../theme/typography";
import { formatPrice } from "../../utils/formatPrice";
import { haptics } from "../../utils/haptics";
import { CheckoutScreenSkeleton } from "../shared/CustomerSkeletons";
export function CheckoutScreen() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const { branding, currency, restaurantId, taxRules, loading } = useMenu();
  const { tableNum, tableId } = useCustomerSession();
  const params = useParams<{ slug?: string; tableNum?: string; restaurantSlug?: string; tableNumber?: string; qrToken?: string }>();
  const basePath = getOrderFlowBasePath(params);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loading) {
    return <CheckoutScreenSkeleton />;
  }

  const tableNo = tableNum ?? 7;
  const taxLines = computeTaxes(totalPrice, taxRules);
  const taxes = taxLines.reduce((sum, t) => sum + t.amount, 0);
  const grandTotal = totalPrice + taxes;

  useEffect(() => {
    if (items.length === 0 && !isPlacing) {
      navigate(basePath ? `${basePath}/menu` : "/menu", { replace: true } as { replace?: boolean });
    }
  }, [items.length, isPlacing, navigate, basePath]);

  const handlePlaceOrder = async () => {
    haptics.gestureMedium();
    setSubmitError(null);
    setIsPlacing(true);
    const orderNumber = `${branding.orderNumberPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
    const placedAt = new Date();
    const orderSummary: OrderSummary = {
      orderNumber,
      placedAt,
      lines: items.map((ci) => {
        const unitPrice = getPortionPrice(ci.item, ci.portion);
        const lineTotal = unitPrice * ci.quantity;
        const displayName = ci.selectedOption
          ? `${ci.item.name} (${ci.selectedOption})`
          : ci.item.name;
        return {
          displayName,
          portion: getPortionShort(ci.portion),
          quantity: ci.quantity,
          unitPrice,
          lineTotal,
        };
      }),
      subTotal: totalPrice,
      tax: taxes,
      taxLines,
      total: grandTotal,
      tableNo: String(tableNo),
    };

    const orderForConsole = {
      orderNumber: orderSummary.orderNumber,
      placedAt: orderSummary.placedAt.toISOString(),
      tableNo: orderSummary.tableNo,
      restaurantName: branding.restaurantName,
      customerName: name.trim() || undefined,
      specialInstructions: instructions.trim() || undefined,
      lines: items.map((ci) => {
        const unitPrice = getPortionPrice(ci.item, ci.portion);
        const lineTotal = unitPrice * ci.quantity;
        const displayName = ci.selectedOption
          ? `${ci.item.name} (${ci.selectedOption})`
          : ci.item.name;
        return {
          displayName,
          portion: getPortionShort(ci.portion),
          quantity: ci.quantity,
          unitPrice,
          lineTotal,
          ...(ci.selectedOption != null && { selectedOption: ci.selectedOption }),
        };
      }),
      subTotal: orderSummary.subTotal,
      tax: orderSummary.tax,
      total: orderSummary.total,
    };
    const finishSuccess = () => {
      haptics.orderPlaced();
      setTimeout(() => {
        clearCart();
        navigate(basePath ? `${basePath}/confirmation` : "/confirmation", {
          state: { orderSummary },
          replace: true,
        });
      }, 1200);
    };

    if (supabase && restaurantId && tableId) {
      try {
        const { data: orderRow, error: orderErr } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            order_number: orderNumber,
            table_id: tableId,
            status: "new",
            customer_name: name.trim() || null,
            special_instructions: instructions.trim() || null,
            subtotal: totalPrice,
            tax: taxes,
            total: grandTotal,
            placed_at: placedAt.toISOString(),
          })
          .select("id")
          .single();
        if (orderErr) throw orderErr;
        if (!orderRow?.id) throw new Error("Order was not created");
        const { error: itemsErr } = await supabase.from("order_items").insert(
          items.map((ci) => {
            const unitPrice = getPortionPrice(ci.item, ci.portion);
            const lineTotal = unitPrice * ci.quantity;
            const displayName = ci.selectedOption
              ? `${ci.item.name} (${ci.selectedOption})`
              : ci.item.name;
            return {
              order_id: orderRow.id,
              display_name: displayName,
              portion: getPortionShort(ci.portion),
              quantity: ci.quantity,
              unit_price: unitPrice,
              line_total: lineTotal,
              selected_option: ci.selectedOption ?? null,
            };
          })
        );
        if (itemsErr) throw itemsErr;
        finishSuccess();
      } catch (err) {
        console.error("Failed to submit order:", err);
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" &&
                err !== null &&
                "message" in err &&
                typeof (err as { message: unknown }).message === "string"
              ? (err as { message: string }).message
              : "Could not place order. Please try again.";
        setSubmitError(message);
        setIsPlacing(false);
      }
    } else {
      console.log("Order placed (JSON):", JSON.stringify(orderForConsole, null, 2));
      finishSuccess();
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background botanical */}
      <BotanicalDecor className="absolute top-20 right-[-10px] w-28 h-28" />

      <ScreenHeader
        onBack={() => navigate(basePath ? `${basePath}/cart` : "/cart")}
        title="Checkout"
      />

      <div className="px-4 sm:px-6 relative z-10 space-y-5" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
        {/* Order summary mini */}
        <motion.div
          className="bg-card rounded-xl p-4 border border-primary/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3
            className="text-foreground/60 tracking-[0.1em] uppercase mb-3"
            style={typography.bodyLabel}
          >
            Order Summary
          </h3>
          {items.map((ci) => (
            <div
              key={`${ci.item.id}__${ci.portion}__${ci.selectedOption ?? ""}`}
              className="flex justify-between items-start gap-2 py-2 border-b border-primary/5 last:border-0"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span
                  className="text-foreground/50 shrink-0"
                  style={typography.bodyMd2}
                >
                  {ci.quantity}x
                </span>
                <span
                  className="text-foreground/75 line-clamp-2 break-words leading-tight"
                  style={typography.bodyBase}
                >
                  {ci.item.name}
                  {ci.selectedOption ? ` (${ci.selectedOption})` : ""}
                </span>
                <span
                  className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0"
                  style={typography.bodyXsSemi}
                >
                  {getPortionShort(ci.portion)}
                </span>
              </div>
              <span
                className="text-foreground/70 shrink-0"
                style={typography.bodyBaseMid}
              >
                {currency}{formatPrice(getPortionPrice(ci.item, ci.portion) * ci.quantity)}
              </span>
            </div>
          ))}
          <div className="flex justify-between mt-3 pt-2 border-t border-primary/10">
            <span
              className="text-foreground/80"
              style={typography.bodyLgSemi}
            >
              Total
            </span>
            <span
              className="text-foreground/90"
              style={typography.titleSmBold}
            >
              {currency}{formatPrice(grandTotal)}
            </span>
          </div>
        </motion.div>

        {/* Table Number */}
        <motion.div
          className="bg-card rounded-xl p-4 border border-primary/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label
            className="text-foreground/60 tracking-[0.1em] uppercase block mb-2"
            style={typography.bodyLabel}
          >
            Table Number
          </label>
          <div
            className="bg-primary/5 rounded-xl px-4 py-3 text-foreground/80"
            style={typography.bodyXl}
          >
            Table #{tableNo}
            <span
              className="text-primary/60 ml-2"
              style={typography.bodyMd}
            >
              (auto-detected)
            </span>
          </div>
        </motion.div>

        {/* Name */}
        <motion.div
          className="bg-card rounded-xl p-4 border border-primary/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label
            className="text-foreground/60 tracking-[0.1em] uppercase block mb-2"
            style={typography.bodyLabel}
          >
            Your Name <span className="normal-case tracking-normal text-muted-foreground/40">(optional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-background rounded-xl px-4 py-3 text-foreground/80 placeholder:text-muted-foreground/30 border border-primary/10 focus:border-primary/30 focus:outline-none transition-colors"
            style={typography.bodyLg}
          />
        </motion.div>

        {/* Special instructions */}
        <motion.div
          className="bg-card rounded-xl p-4 border border-primary/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <label className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-primary/50" />
            <span
              className="text-foreground/60 tracking-[0.1em] uppercase"
              style={typography.bodyLabel}
            >
              Special Instructions
            </span>
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any allergies, preferences or special requests..."
            rows={3}
            className="w-full bg-background rounded-xl px-4 py-3 text-foreground/80 placeholder:text-muted-foreground/30 border border-primary/10 focus:border-primary/30 focus:outline-none transition-colors resize-none"
            style={typography.bodyLg}
          />
        </motion.div>

        {/* Place Order Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {submitError ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800"
              style={typography.bodyMd}
              role="alert"
            >
              {submitError}
            </p>
          ) : null}
          <button
            onClick={handlePlaceOrder}
            disabled={isPlacing}
            className={`w-full rounded-2xl py-4 shadow-md active:scale-[0.98] transition-all ${
              isPlacing
                ? "bg-primary/60 text-primary-foreground/60"
                : "bg-primary text-primary-foreground"
            }`}
            style={typography.bodyXlMid}
          >
            {isPlacing ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Placing Order...
              </span>
            ) : (
              `Place Order • ${currency}${formatPrice(grandTotal)}`
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}