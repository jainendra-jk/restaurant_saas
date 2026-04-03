import { ArrowLeft } from "lucide-react";
import * as typography from "../../theme/typography";
import { haptics } from "../../utils/haptics";

interface ScreenHeaderProps {
  onBack: () => void;
  title: string;
  subtitle?: React.ReactNode;
}

/**
 * Reusable screen header: back button, centered title, optional subtitle.
 * Used on Cart and Checkout screens for consistent layout.
 */
export function ScreenHeader({ onBack, title, subtitle }: ScreenHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-4 sm:px-6 pb-4 relative z-10"
      style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}
    >
      <button
        onClick={() => {
          haptics.gestureMedium();
          onBack();
        }}
        className="w-10 h-10 rounded-xl bg-card border border-primary/10 flex items-center justify-center active:scale-95 transition-transform"
      >
        <ArrowLeft className="w-5 h-5 text-foreground/60" />
      </button>
      <div className="text-center">
        <h2
          className="text-foreground/80 tracking-[0.1em]"
          style={typography.titleSm}
        >
          {title}
        </h2>
        {subtitle != null && (
          <p className="text-muted-foreground/50" style={typography.bodyMd}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="w-10" />
    </div>
  );
}
