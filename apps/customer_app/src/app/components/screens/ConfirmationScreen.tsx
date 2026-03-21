import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Clock, Leaf, Download } from "lucide-react";
import { BotanicalDecor } from "../shared/ArchFrame";
import { useNavigate, useLocation, useParams } from "react-router";
import { useMenu } from "../../context/MenuContext";
import { billConfig } from "../../utils/billConfig";
import { generateReceiptPdf, type OrderSummary } from "../../utils/receiptPdf";
import * as typography from "../../theme/typography";

export function ConfirmationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ slug?: string; tableNum?: string; restaurantSlug?: string; tableNumber?: string }>();
  const basePath =
    params.slug && params.tableNum
      ? `/r/${params.slug}/t/${params.tableNum}`
      : params.restaurantSlug && params.tableNumber
        ? `/order/${params.restaurantSlug}/table/${params.tableNumber}`
        : "";
  const { branding, currency } = useMenu();
  const orderSummary = (location.state as { orderSummary?: OrderSummary } | null)?.orderSummary;
  const orderNumber = orderSummary?.orderNumber ?? `${branding.orderNumberPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
  const tableNo = orderSummary?.tableNo ?? "7";
  const [phase, setPhase] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleDownloadReceipt = async () => {
    if (!orderSummary || downloading) return;
    setDownloading(true);
    try {
      await generateReceiptPdf(orderSummary, billConfig, branding.restaurantName, currency);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 sm:px-8 relative overflow-hidden">
      {/* Background botanicals */}
      <BotanicalDecor className="absolute top-10 right-[-10px] w-32 h-32" />
      <BotanicalDecor className="absolute bottom-20 left-[-10px] w-28 h-28 scale-x-[-1]" />
      <BotanicalDecor className="absolute top-1/3 left-[-20px] w-24 h-24 rotate-45" />

      {/* Arch frame */}
      <div className="relative w-72 max-w-full flex flex-col items-center">
        <motion.svg
          viewBox="0 0 280 350"
          className="absolute inset-0 w-full h-full"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.path
            d="M20 350 L20 60 Q20 15 60 15 L220 15 Q260 15 260 60 L260 350"
            stroke="var(--primary)"
            strokeWidth="1"
            strokeOpacity="0.2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </motion.svg>

        {/* Check icon */}
        <motion.div
          className="mt-16 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 15 }}
        >
          <motion.div
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
          >
            <Check className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
          </motion.div>
        </motion.div>

        {/* Text content */}
        {phase >= 1 && (
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1
              className="text-foreground/85"
              style={typography.titleXl}
            >
              Order Placed
            </h1>
            <div className="w-10 h-[1px] bg-primary/30 mx-auto mt-3 mb-3" />
            <p
              className="text-muted-foreground/60"
              style={typography.bodyBase}
            >
              Your order has been received
            </p>
          </motion.div>
        )}

        {phase >= 2 && (
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p
              className="text-muted-foreground/50 mb-4"
              style={typography.bodyMd2}
            >
              Our team is preparing your meal
            </p>

            <div className="bg-card rounded-xl border border-primary/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className="text-muted-foreground/50"
                  style={typography.bodyMd}
                >
                  Order No.
                </span>
                <span
                  className="text-foreground/70 tracking-wider"
                  style={typography.bodyBaseSemi}
                >
                  {orderNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-muted-foreground/50"
                  style={typography.bodyMd}
                >
                  Table
                </span>
                <span
                  className="text-foreground/70"
                  style={typography.bodyBaseMid}
                >
                  #{tableNo}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {phase >= 3 && (
          <motion.div
            className="mt-6 flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Clock className="w-4 h-4 text-primary" />
            <span
              className="text-foreground/70"
              style={typography.bodyBase}
            >
              Estimated time:
            </span>
            <span
              className="text-foreground/80"
              style={typography.bodyLgSemi}
            >
              20-25 min
            </span>
          </motion.div>
        )}

        {/* Bottom decoration */}
        <motion.div
          className="mt-10 flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <Leaf className="w-3 h-3 text-primary/30" />
          <span
            className="text-muted-foreground/30"
            style={typography.bodyStyle("0.6rem", { letterSpacing: "0.15em" })}
          >
            {branding.restaurantName}
          </span>
          <Leaf className="w-3 h-3 text-primary/30 scale-x-[-1]" />
        </motion.div>
      </div>

      {/* Buttons: same width and aligned */}
      <div className="mt-12 w-72 max-w-full flex flex-col items-stretch gap-3">
        <motion.button
          onClick={() => navigate(basePath ? `${basePath}/menu` : "/menu")}
          className="w-full px-6 py-3 bg-card border border-primary/15 rounded-xl text-foreground/60 active:scale-95 transition-transform"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 500 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
        >
          Browse Menu Again
        </motion.button>

        {orderSummary && (
          <motion.button
            type="button"
            onClick={handleDownloadReceipt}
            disabled={downloading}
            className="w-full px-6 py-3 bg-transparent border border-primary/20 rounded-xl text-foreground/70 hover:bg-primary/5 active:scale-95 transition-transform disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 500 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
          >
            <Download className="w-4 h-4 shrink-0" />
            {downloading ? "Preparing…" : "Download receipt"}
          </motion.button>
        )}
      </div>
    </div>
  );
}