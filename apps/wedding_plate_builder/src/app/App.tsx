import React, { useState, useCallback, useMemo } from 'react';
import { Crown } from 'lucide-react';
import { FoodMenuPanel } from './components/food-menu-panel';
import { PlateVisualization } from './components/plate-visualization';
import { PricingPanel } from './components/pricing-panel';
import { GuestEstimator } from './components/guest-estimator';
import type { FoodItem } from './components/food-data';

export default function App() {
  const [selectedItems, setSelectedItems] = useState<Map<string, { item: FoodItem; qty: number }>>(
    new Map()
  );
  const [guests, setGuests] = useState(200);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const handleAddItem = useCallback((item: FoodItem) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        next.set(item.id, { item, qty: existing.qty + 1 });
      } else {
        next.set(item.id, { item, qty: 1 });
      }
      return next;
    });
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing && existing.qty > 1) {
        next.set(itemId, { item: existing.item, qty: existing.qty - 1 });
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }, []);

  const handleRemoveItemFull = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const plateTotal = useMemo(() => {
    let total = 0;
    selectedItems.forEach(({ item, qty }) => {
      total += item.price * qty;
    });
    return total;
  }, [selectedItems]);

  const getQuoteHref = useMemo(() => {
    const subject = encodeURIComponent('Quotation for the price and demand');
    const lines: string[] = [
      'Hello,',
      '',
      'I would like a quotation for my wedding plate configuration.',
      '',
      `Guests: ${guests}`,
      `Items on plate: ${selectedItems.size}`,
      `Base plate total (before tax): ₹${plateTotal.toFixed(2)}`,
      `Per plate (with ~10% service estimate): ₹${Math.round(plateTotal * 1.1)}`,
      '',
      'Selected items:',
    ];
    selectedItems.forEach(({ item, qty }) => {
      lines.push(`- ${item.name} x${qty} @ ₹${item.price} = ₹${(item.price * qty).toFixed(2)}`);
    });
    lines.push('', 'Thank you.');
    const body = encodeURIComponent(lines.join('\n'));
    return `mailto:support@ratolabs.com?subject=${subject}&body=${body}`;
  }, [guests, selectedItems, plateTotal]);

  const handleSendQuote = useCallback(() => {
    window.location.href = getQuoteHref;
    setIsQuoteModalOpen(false);
  }, [getQuoteHref]);

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #fff7ed 50%, #ffffff 100%)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)',
              }}
            >
              <Crown size={22} className="text-white" />
            </div>
            <div>
              <h1
                className="text-[#111827] tracking-tight"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Wedding Plate Builder
              </h1>
              <p className="hidden sm:block text-xs text-[#6b7280] -mt-1">
                Craft the perfect wedding thali for your guests
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="px-3 sm:px-4 py-2 rounded-xl bg-white border border-[#e5e7eb] text-xs sm:text-sm text-[#6b7280] whitespace-nowrap">
              {selectedItems.size} items · ₹{Math.round(plateTotal * 1.1)}/plate
            </div>
            <button
              type="button"
              onClick={() => setIsQuoteModalOpen(true)}
              className="px-4 sm:px-5 py-2 rounded-xl text-sm text-white transition-all hover:opacity-90 inline-flex items-center justify-center whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
              }}
            >
              Get Quote
            </button>
          </div>
        </header>

        {/* Main Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[300px_1fr_280px] lg:h-[540px]">
          {/* Left Panel - Food Menu */}
          <div
            className="rounded-2xl border border-[#e5e7eb] bg-white overflow-hidden md:order-1 lg:order-none"
            style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' }}
          >
            <FoodMenuPanel
              selectedItems={selectedItems}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
            />
          </div>

          {/* Center Panel - Plate */}
          <div
            className="rounded-2xl border border-[#e5e7eb] bg-white overflow-hidden md:order-3 md:col-span-2 lg:order-none lg:col-span-1"
            style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' }}
          >
            <PlateVisualization selectedItems={selectedItems} />
          </div>

          {/* Right Panel - Pricing */}
          <div
            className="rounded-2xl border border-[#e5e7eb] bg-white overflow-hidden md:order-2 lg:order-none"
            style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' }}
          >
            <PricingPanel
              selectedItems={selectedItems}
              onRemoveItem={handleRemoveItemFull}
              plateTotal={plateTotal}
            />
          </div>
        </div>

        {/* Bottom - Guest Estimator */}
        <GuestEstimator
          guests={guests}
          onGuestsChange={setGuests}
          plateTotal={plateTotal}
          itemCount={selectedItems.size}
        />
      </div>

      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIsQuoteModalOpen(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Close quote modal"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-[#e5e7eb] p-6">
            <h3 className="text-lg text-[#111827]">Before we send your request</h3>
            <p className="mt-2 text-sm text-[#6b7280]">
              Please confirm the details below are included in your email.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-[#374151] list-disc pl-5">
              <li>Include your finalized wedding menu selection for accurate pricing.</li>
              <li>Add your restaurant name and primary point of contact.</li>
              <li>This service is billed at a one-time fee of $39.</li>
            </ul>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsQuoteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#d1d5db] text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendQuote}
                className="px-4 py-2 rounded-xl text-sm text-white transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom scrollbar & slider styles */}
      <style>{`
        * {
          scrollbar-width: thin;
          scrollbar-color: #f97316 #f3f4f6;
        }
        *::-webkit-scrollbar {
          width: 6px;
          height: 0;
        }
        *::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
        *::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #f97316, #ea580c);
          border-radius: 3px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #ea580c, #c2410c);
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #ea580c);
          border: 3px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #ea580c);
          border: 3px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
        }
      `}</style>
    </div>
  );
}
