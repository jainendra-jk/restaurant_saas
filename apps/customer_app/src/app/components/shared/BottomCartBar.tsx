import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";
import { useNavigate, useParams } from "react-router";
import { useMenu } from "../../context/MenuContext";
import { getOrderFlowBasePath } from "../../utils/orderRoutePaths";
import * as typography from "../../theme/typography";
import { formatPrice } from "../../utils/formatPrice";
import { haptics } from "../../utils/haptics";

export function BottomCartBar() {
  const { totalItems, totalPrice } = useCart();
  const { currency } = useMenu();
  const navigate = useNavigate();
  const params = useParams<{ slug?: string; tableNum?: string; restaurantSlug?: string; tableNumber?: string; qrToken?: string }>();
  const basePath = getOrderFlowBasePath(params);

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div
            className="w-full max-w-[480px] px-4 pt-2 pointer-events-auto"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={() => {
                haptics.gestureMedium();
                navigate(basePath ? `${basePath}/cart` : "/cart");
              }}
              className="w-full bg-primary text-primary-foreground rounded-2xl px-5 py-4 flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform"
              style={typography.fontBody}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="w-5 h-5" />
                  <span
                    className="absolute -top-2 -right-2 bg-white text-primary rounded-full w-4 h-4 flex items-center justify-center"
                    style={typography.bodySmSemi}
                  >
                    {totalItems}
                  </span>
                </div>
                <span style={typography.bodyLg}>
                  {totalItems} {totalItems === 1 ? "item" : "items"} in cart
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ ...typography.body2xl, fontWeight: 600 }}>
                  {currency}{formatPrice(totalPrice)}
                </span>
                <span
                  className="bg-white/20 rounded-lg px-3 py-1"
                  style={typography.bodyMd2}
                >
                  View Order
                </span>
              </div>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
