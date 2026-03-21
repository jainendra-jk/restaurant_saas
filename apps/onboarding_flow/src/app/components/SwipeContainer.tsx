import { useRef, useCallback } from "react";

interface SwipeContainerProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
}

export function SwipeContainer({ children, onSwipeLeft, onSwipeRight, enabled = true }: SwipeContainerProps) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !enabled) return;
    touchEndX.current = e.touches[0].clientX;
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current || !enabled) return;
    isDragging.current = false;

    const diffX = touchStartX.current - touchEndX.current;
    const threshold = 60;

    if (touchEndX.current === 0) return;

    if (diffX > threshold) {
      onSwipeLeft(); // swipe left = next
    } else if (diffX < -threshold) {
      onSwipeRight(); // swipe right = back
    }

    touchEndX.current = 0;
  }, [enabled, onSwipeLeft, onSwipeRight]);

  // Mouse drag support for desktop
  const mouseStartX = useRef(0);
  const mouseEndX = useRef(0);
  const isMouseDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;
    // Don't start drag on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("input, button, select, textarea, [role='button'], a")) return;

    mouseStartX.current = e.clientX;
    isMouseDragging.current = true;
  }, [enabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMouseDragging.current || !enabled) return;
    mouseEndX.current = e.clientX;
  }, [enabled]);

  const handleMouseUp = useCallback(() => {
    if (!isMouseDragging.current || !enabled) return;
    isMouseDragging.current = false;

    const diffX = mouseStartX.current - mouseEndX.current;
    const threshold = 60;

    if (mouseEndX.current === 0) return;

    if (diffX > threshold) {
      onSwipeLeft();
    } else if (diffX < -threshold) {
      onSwipeRight();
    }

    mouseEndX.current = 0;
  }, [enabled, onSwipeLeft, onSwipeRight]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="w-full select-none"
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </div>
  );
}
