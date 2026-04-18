import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { FoodItem } from './food-data';
import { UtensilsCrossed } from 'lucide-react';

interface PlateVisualizationProps {
  selectedItems: Map<string, { item: FoodItem; qty: number }>;
}

const sectionPositions: Record<string, { cx: number; cy: number; r: number }> = {
  center: { cx: 50, cy: 50, r: 18 },
  'top-left': { cx: 25, cy: 25, r: 12 },
  'top-right': { cx: 75, cy: 25, r: 12 },
  'bottom-left': { cx: 25, cy: 75, r: 12 },
  'bottom-right': { cx: 75, cy: 75, r: 12 },
  left: { cx: 20, cy: 50, r: 12 },
  right: { cx: 80, cy: 50, r: 12 },
};

export function PlateVisualization({ selectedItems }: PlateVisualizationProps) {
  const itemsBySection = new Map<string, { item: FoodItem; qty: number }[]>();

  selectedItems.forEach(({ item, qty }) => {
    const section = item.plateSection;
    if (!itemsBySection.has(section)) {
      itemsBySection.set(section, []);
    }
    itemsBySection.get(section)!.push({ item, qty });
  });

  const hasItems = selectedItems.size > 0;

  return (
    <div
      className="flex flex-col items-center justify-center h-full py-6 md:py-8 lg:py-0"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <h2 className="text-[#111827] mb-2">Your Wedding Thali</h2>
      <p className="text-[#6b7280] text-sm mb-4">
        {hasItems ? `${selectedItems.size} items selected` : 'Add items to build your plate'}
      </p>

      <div className="relative w-[min(320px,calc(100vw-3rem))] h-[min(320px,calc(100vw-3rem))] md:w-[340px] md:h-[340px] lg:w-[380px] lg:h-[380px]">
        {/* Outer plate ring — orange-gold gradient */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #f97316, #ea580c, #fb923c)',
            boxShadow: '0 8px 32px rgba(249, 115, 22, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
          }}
        />
        {/* Inner plate */}
        <div
          className="absolute rounded-full"
          style={{
            top: '8px',
            left: '8px',
            right: '8px',
            bottom: '8px',
            background: 'linear-gradient(145deg, #ffffff, #f9fafb)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
          }}
        />
        {/* Decorative inner ring */}
        <div
          className="absolute rounded-full border-2 border-dashed"
          style={{
            top: '20px',
            left: '20px',
            right: '20px',
            bottom: '20px',
            borderColor: 'rgba(249, 115, 22, 0.2)',
          }}
        />

        {/* Center bowl area */}
        <div
          className="absolute rounded-full"
          style={{
            top: '32%',
            left: '32%',
            width: '36%',
            height: '36%',
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.08), transparent)',
            border: '1.5px solid rgba(249, 115, 22, 0.18)',
          }}
        />

        {/* Compartment bowls */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right', 'left', 'right'].map(section => {
          const pos = sectionPositions[section];
          const sectionItems = itemsBySection.get(section);
          const hasItem = sectionItems && sectionItems.length > 0;
          return (
            <div
              key={section}
              className="absolute rounded-full"
              style={{
                left: `${pos.cx - pos.r}%`,
                top: `${pos.cy - pos.r}%`,
                width: `${pos.r * 2}%`,
                height: `${pos.r * 2}%`,
                background: hasItem
                  ? 'none'
                  : 'radial-gradient(circle, rgba(249, 115, 22, 0.05), transparent)',
                border: `1px solid rgba(249, 115, 22, ${hasItem ? 0.35 : 0.12})`,
              }}
            />
          );
        })}

        {/* Food items in sections */}
        <AnimatePresence>
          {Array.from(itemsBySection.entries()).map(([section, items]) => {
            const pos = sectionPositions[section];
            const isCenter = section === 'center';
            const displayItem = items[0];
            return (
              <PlateItem
                key={section}
                section={section}
                items={items}
                pos={pos}
                isCenter={isCenter}
                displayItem={displayItem}
              />
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {!hasItems && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <UtensilsCrossed size={24} strokeWidth={1.5} className="text-[#f97316] mx-auto" />
              <p className="text-[#9ca3af] text-xs mt-2">Empty Plate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlateItem({
  section,
  items,
  pos,
  isCenter,
  displayItem,
}: {
  section: string;
  items: { item: FoodItem; qty: number }[];
  pos: { cx: number; cy: number; r: number };
  isCenter: boolean;
  displayItem: { item: FoodItem; qty: number };
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      key={section}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute rounded-full overflow-hidden cursor-pointer"
      style={{
        left: `${pos.cx - pos.r + 1}%`,
        top: `${pos.cy - pos.r + 1}%`,
        width: `${(pos.r - 1) * 2}%`,
        height: `${(pos.r - 1) * 2}%`,
        boxShadow: hovered
          ? '0 4px 16px rgba(249, 115, 22, 0.35)'
          : '0 2px 8px rgba(0,0,0,0.12)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={displayItem.item.image}
        alt={displayItem.item.name}
        className="w-full h-full object-cover transition-transform duration-300"
        style={{ transform: hovered ? 'scale(1.1)' : 'scale(1)' }}
      />
      {/* Name tooltip — only visible on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle, rgba(17, 24, 39, 0.82) 0%, rgba(17, 24, 39, 0.65) 100%)',
            }}
          >
            <span
              className="text-white text-center px-2 drop-shadow-md"
              style={{
                fontSize: isCenter ? '12px' : '10px',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              {displayItem.item.name}
              {items.length > 1 && (
                <>
                  <br />
                  <span className="text-[#fb923c]" style={{ fontSize: isCenter ? '10px' : '8px' }}>
                    +{items.length - 1} more
                  </span>
                </>
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {displayItem.qty > 1 && (
        <div
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#f97316] text-white flex items-center justify-center"
          style={{ fontSize: '8px' }}
        >
          {displayItem.qty}
        </div>
      )}
    </motion.div>
  );
}