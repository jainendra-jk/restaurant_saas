import React from 'react';
import { Users, IndianRupee, UtensilsCrossed } from 'lucide-react';
import { motion } from 'motion/react';

interface GuestEstimatorProps {
  guests: number;
  onGuestsChange: (guests: number) => void;
  plateTotal: number;
  itemCount: number;
}

export function GuestEstimator({ guests, onGuestsChange, plateTotal, itemCount }: GuestEstimatorProps) {
  const perPlate = Math.round(plateTotal * 1.1);
  const totalEstimate = perPlate * guests;

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="mt-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Guest Slider Card */}
      <div
        className="rounded-2xl p-6 border border-[#e5e7eb] bg-white"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            <Users size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-[#111827]">Guest Count</h3>
            <p className="text-xs text-[#6b7280]">Slide to set number of guests</p>
          </div>
          <div className="ml-auto">
            <span className="text-3xl text-[#f97316]">{guests}</span>
            <span className="text-sm text-[#6b7280] ml-1">guests</span>
          </div>
        </div>

        <div className="relative px-1">
          <input
            type="range"
            min={10}
            max={2000}
            step={10}
            value={guests}
            onChange={e => onGuestsChange(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f97316 0%, #f97316 ${((guests - 10) / 1990) * 100}%, #e5e7eb ${((guests - 10) / 1990) * 100}%, #e5e7eb 100%)`,
            }}
          />
          <div className="flex justify-between mt-2 text-xs text-[#9ca3af]">
            <span>10</span>
            <span>500</span>
            <span>1000</span>
            <span>1500</span>
            <span>2000</span>
          </div>
        </div>
      </div>

      {/* Estimate Cards */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div
          className="rounded-2xl p-5 border border-[#e5e7eb] bg-white"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed size={16} className="text-[#f97316]" />
            <span className="text-xs text-[#6b7280]">Items Per Plate</span>
          </div>
          <p className="text-2xl text-[#111827]">{itemCount}</p>
        </div>

        <div
          className="rounded-2xl p-5 border border-[#e5e7eb] bg-white"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <IndianRupee size={16} className="text-[#f97316]" />
            <span className="text-xs text-[#6b7280]">Cost Per Plate</span>
          </div>
          <p className="text-2xl text-[#111827]">₹{perPlate}</p>
        </div>

        {/* Big estimate card */}
        <motion.div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c, #f97316)',
            boxShadow: '0 8px 32px rgba(249, 115, 22, 0.35)',
          }}
          key={totalEstimate}
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, #ffffff 0%, transparent 50%), radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 50%)',
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-white/80">Total Catering Estimate</span>
            </div>
            <p className="text-2xl text-white">{formatCurrency(totalEstimate)}</p>
            <p className="text-xs text-white/70 mt-1">
              {guests} guests × ₹{perPlate}/plate
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
