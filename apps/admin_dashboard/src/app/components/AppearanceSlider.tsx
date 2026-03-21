import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { SliderShell } from './ui/SliderShell';

interface AppearanceSliderProps {
  onClose: () => void;
}

export function AppearanceSlider({ onClose }: AppearanceSliderProps) {
  const [applied, setApplied] = useState(true);

  return (
    <SliderShell
      icon={<Palette className="w-5 h-5 text-[var(--stat-peak)]" />}
      iconBg="bg-[var(--stat-peak-light)]"
      title="Appearance"
      subtitle="Digital menu theme"
      onClose={onClose}
      footer={
        <button
          onClick={() => {
            setApplied(true);
            onClose();
          }}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
            applied
              ? 'bg-gray-100 text-gray-400 cursor-default'
              : 'bg-primary text-white hover:brightness-90'
          }`}
          disabled={applied}
        >
          {applied ? (
            <>
              <Check className="w-4 h-4" />
              Theme Applied
            </>
          ) : (
            'Apply Theme'
          )}
        </button>
      }
    >
      <p className="text-xs text-gray-400 mb-4">
        Themes apply to your customer-facing digital menu, not the dashboard.
      </p>

      {/* Theme Card */}
      <div
        className={`relative rounded-xl border-2 overflow-hidden transition-all ${
          applied ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
        }`}
      >
        {applied && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" />
            Active
          </div>
        )}

        {/* Theme Preview */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4">
          <div className="bg-white rounded-lg shadow-sm p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-primary" />
              </div>
              <div>
                <div className="h-2.5 w-20 bg-gray-800 rounded-full" />
                <div className="h-1.5 w-14 bg-gray-300 rounded-full mt-1" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="h-5 w-12 bg-primary rounded-full" />
              <div className="h-5 w-14 bg-gray-100 rounded-full" />
              <div className="h-5 w-10 bg-gray-100 rounded-full" />
            </div>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-2 w-16 bg-gray-700 rounded-full" />
                    <div className="h-1.5 w-24 bg-gray-200 rounded-full mt-1" />
                    <div className="h-2 w-8 bg-primary/70 rounded-full mt-1.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm text-gray-900">Classic Orange</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">Default theme &middot; Warm & inviting</p>
            </div>
            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              Default
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl border border-dashed border-gray-200 text-center">
        <p className="text-xs text-gray-400">More themes coming soon</p>
        <p className="text-[11px] text-gray-300 mt-0.5">Purchase and apply new themes in one click</p>
      </div>

      <div className="h-4" />
    </SliderShell>
  );
}
