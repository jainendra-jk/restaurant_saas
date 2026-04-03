import { useMemo, type ReactNode } from "react";
import { useLocation } from "react-router";
import { ArchHeader } from "./ArchFrame";
import { useCustomerSession } from "../../context/CustomerSessionContext";
import { useMenu } from "../../context/MenuContext";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-primary/10 ${className}`} />;
}

function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <ArchHeader className="pt-10 sm:pt-12 pb-4" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
        <div className="mx-auto w-full max-w-sm space-y-3">
          <SkeletonBlock className="h-3 w-24 mx-auto rounded-full" />
          <SkeletonBlock className="h-8 w-52 mx-auto" />
          <SkeletonBlock className="h-3 w-20 mx-auto rounded-full" />
        </div>
      </ArchHeader>

      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-primary/10">
        <div className="flex gap-2 px-4 sm:px-6 py-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonBlock key={`chip-${idx}`} className="h-10 w-24 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-6 pb-32 space-y-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={`item-${idx}`} className="rounded-xl border border-primary/10 bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="h-3 w-56" />
              </div>
              <SkeletonBlock className="h-10 w-10 rounded-lg" />
            </div>
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-8 w-28 rounded-full" />
              <SkeletonBlock className="h-5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-6 space-y-4">
      <SkeletonBlock className="h-10 w-40" />
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={`cart-item-${idx}`} className="rounded-xl border border-primary/10 bg-card p-4 space-y-3">
          <SkeletonBlock className="h-5 w-44" />
          <SkeletonBlock className="h-3 w-28" />
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-primary/10 bg-card p-5 space-y-3">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-5 w-32" />
      </div>
      <SkeletonBlock className="h-14 w-full rounded-2xl" />
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-6 space-y-4">
      <SkeletonBlock className="h-10 w-36" />
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={`checkout-block-${idx}`} className="rounded-xl border border-primary/10 bg-card p-4 space-y-3">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-10 w-full" />
          {idx === 0 ? (
            <SkeletonBlock className="h-4 w-20" />
          ) : null}
        </div>
      ))}
      <SkeletonBlock className="h-14 w-full rounded-2xl" />
    </div>
  );
}

function ConfirmationSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-5">
        <SkeletonBlock className="h-16 w-16 rounded-full mx-auto" />
        <SkeletonBlock className="h-8 w-40 mx-auto" />
        <SkeletonBlock className="h-4 w-52 mx-auto" />
        <div className="rounded-xl border border-primary/10 bg-card p-4 space-y-3">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
        </div>
        <SkeletonBlock className="h-12 w-full rounded-xl" />
        <SkeletonBlock className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function getCustomerRouteSkeleton(pathname: string): ReactNode {
  if (pathname.endsWith("/cart")) return <CartSkeleton />;
  if (pathname.endsWith("/checkout")) return <CheckoutSkeleton />;
  if (pathname.endsWith("/confirmation")) return <ConfirmationSkeleton />;
  return <MenuSkeleton />;
}

export function CustomerGlobalLoadingGate({ children }: { children: ReactNode }) {
  const session = useCustomerSession();
  const menu = useMenu();
  const location = useLocation();

  const shouldShowSkeleton = !session.ready || menu.loading;
  const skeleton = useMemo(() => getCustomerRouteSkeleton(location.pathname), [location.pathname]);

  if (shouldShowSkeleton) {
    return <>{skeleton}</>;
  }

  return <>{children}</>;
}

export function MenuScreenSkeleton() {
  return <MenuSkeleton />;
}

export function CartScreenSkeleton() {
  return <CartSkeleton />;
}

export function CheckoutScreenSkeleton() {
  return <CheckoutSkeleton />;
}

export function ConfirmationScreenSkeleton() {
  return <ConfirmationSkeleton />;
}
