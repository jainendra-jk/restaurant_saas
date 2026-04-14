import { cn } from "./ui/utils";

type StripePoweredByBadgeProps = {
  className?: string;
};

/** Text-only “Powered by Stripe” with subdued transparency; links to stripe.com per Stripe guidance. */
export function StripePoweredByBadge({ className }: StripePoweredByBadgeProps) {
  return (
    <a
      href="https://stripe.com"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-[11px] font-medium tracking-tight text-gray-500/55 hover:text-gray-600/75 outline-none transition-colors focus-visible:underline",
        className,
      )}
    >
      Powered by Stripe
    </a>
  );
}
