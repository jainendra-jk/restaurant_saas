import { useState, useEffect, useRef, useCallback } from 'react';

/** Returns a ref and its measured width/height, updated via ResizeObserver. */
export function useContainerSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const updateSize = useCallback(() => {
    if (ref.current) {
      const { width, height } = ref.current.getBoundingClientRect();
      setSize((prev) =>
        prev.width === Math.floor(width) && prev.height === Math.floor(height)
          ? prev
          : { width: Math.floor(width), height: Math.floor(height) }
      );
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateSize]);

  return { ref, width: size.width, height: size.height };
}
