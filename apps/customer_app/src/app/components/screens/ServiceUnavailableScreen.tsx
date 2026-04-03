import { motion } from "motion/react";
import { Leaf } from "lucide-react";
import { BotanicalDecor } from "../shared/ArchFrame";
import { useMenu } from "../../context/MenuContext";
import * as typography from "../../theme/typography";
import { haptics } from "../../utils/haptics";

const GOOGLE_LENS_URL = "https://lens.google.com";

/**
 * Service Unavailable screen. Uses theme (palette) and branding from menu-config
 * so when a different menu/theme is loaded, this page updates accordingly.
 */
export function ServiceUnavailableScreen() {
  const { branding } = useMenu();
  const handleTryAgain = () => {
    haptics.gestureMedium();
    window.location.href = GOOGLE_LENS_URL;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 sm:px-8 relative overflow-hidden">
      {/* Subtle botanical corners — use theme primary */}
      <BotanicalDecor className="absolute top-10 right-[-10px] w-32 h-32 opacity-[0.06]" />
      <BotanicalDecor className="absolute bottom-24 left-[-10px] w-28 h-28 scale-x-[-1] opacity-[0.06]" />

      {/* Central card: pill-shaped, theme card bg and border */}
      <motion.div
        className="w-full max-w-md rounded-[2rem] border border-border bg-card/95 shadow-sm px-8 py-10 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Brand name — serif, prominent (from branding; theme updates with menu) */}
        <h2
          className="text-foreground tracking-[0.2em] uppercase"
          style={typography.titleLg}
        >
          {branding.restaurantName}
        </h2>
        <div className="w-12 h-[1px] bg-foreground/20 my-4" />

        {/* Heading */}
        <h1
          className="text-foreground/90 mt-1"
          style={{ ...typography.titleMd }}
        >
          Service Unavailable
        </h1>

        {/* Explanatory message */}
        <p
          className="text-muted-foreground mt-4 max-w-[280px] leading-relaxed"
          style={typography.bodyBase}
        >
          We're momentarily away. Please check back shortly or ask your server for assistance.
        </p>

        {/* Small decorative leaf */}
        <div className="mt-6 text-muted-foreground/30">
          <Leaf className="w-5 h-5 mx-auto" strokeWidth={1.2} />
        </div>
      </motion.div>

      {/* Try Again — opens Google Lens so user can scan the QR code again */}
      <motion.button
        onClick={handleTryAgain}
        className="mt-8 px-10 py-3.5 rounded-full bg-primary text-primary-foreground font-medium active:scale-[0.98] transition-transform shadow-sm"
        style={typography.bodyBase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Try again
      </motion.button>

      {/* Footer: Brand - Tagline (theme text color) */}
      <motion.p
        className="mt-8 text-muted-foreground/70 text-center"
        style={{ ...typography.bodySm }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {branding.restaurantName} — {branding.tagline}
      </motion.p>
    </div>
  );
}
