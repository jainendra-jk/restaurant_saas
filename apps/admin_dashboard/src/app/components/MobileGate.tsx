import { useState, useEffect } from 'react';
import { Monitor, Tablet } from 'lucide-react';

const MIN_WIDTH = 768;

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MIN_WIDTH);
    check();
    setChecked(true);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Don't flash anything until we've measured
  if (!checked) return null;

  if (isMobile) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-sm w-full text-center">
          {/* Icon cluster */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Tablet className="w-7 h-7 text-primary" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Monitor className="w-7 h-7 text-primary" />
            </div>
          </div>

          <h1 className="text-gray-900 mb-2">Open on a Larger Screen</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            This dashboard is designed for tablets and desktops. Please open it on an iPad, Samsung Tab, or a desktop browser for the best experience.
          </p>

          {/* Device hints */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Tablet className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-900">Tablet</p>
                <p className="text-xs text-gray-400">iPad, Samsung Tab, or similar</p>
              </div>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Monitor className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-900">Desktop</p>
                <p className="text-xs text-gray-400">Any screen 768px or wider</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
