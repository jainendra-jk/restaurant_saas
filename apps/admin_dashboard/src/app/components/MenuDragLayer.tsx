import { useEffect, useRef, useCallback } from 'react';
import { useDragLayer } from 'react-dnd';
import { GripVertical } from 'lucide-react';

export function MenuDragLayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);

  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem() as { id: string; name: string } | null,
    currentOffset: monitor.getClientOffset(),
  }));

  // Use rAF to batch DOM position updates — avoids React re-render per frame
  const updatePosition = useCallback(() => {
    rafRef.current = null;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!isDragging || !currentOffset) {
      containerRef.current.style.display = 'none';
      return;
    }
    containerRef.current.style.display = 'block';
    containerRef.current.style.transform = `translate(${currentOffset.x - 90}px, ${currentOffset.y - 20}px)`;

    if (labelRef.current && item) {
      labelRef.current.textContent = item.name;
    }

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(updatePosition);
    }
  });

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none" style={{ left: 0, top: 0 }}>
      <div ref={containerRef} style={{ display: 'none', willChange: 'transform' }}>
        <div className="w-[180px] bg-white rounded-xl border border-primary/30 shadow-xl p-3 flex items-center gap-2.5 ring-2 ring-primary/20">
          <GripVertical className="w-4 h-4 text-primary/50 flex-shrink-0" />
          <span ref={labelRef} className="text-xs text-gray-900 truncate" />
        </div>
      </div>
    </div>
  );
}
