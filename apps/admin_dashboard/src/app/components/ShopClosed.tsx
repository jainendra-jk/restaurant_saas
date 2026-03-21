import { Moon, Clock, Bell, CalendarClock } from 'lucide-react';

/** Inline SVG illustration — a closed storefront with a moon */
function ClosedShopIllustration() {
  return (
    <svg
      width="240"
      height="200"
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto"
    >
      {/* Ground / shadow */}
      <ellipse cx="120" cy="180" rx="90" ry="8" fill="#f3f4f6" />

      {/* Building body */}
      <rect x="50" y="60" width="140" height="120" rx="8" fill="#fff7ed" stroke="#fed7aa" strokeWidth="1.5" />

      {/* Awning */}
      <path
        d="M42 60 C42 60 60 44 120 44 C180 44 198 60 198 60"
        fill="none"
        stroke="#fb923c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M42 60 Q60 74 78 60 Q96 74 114 60 Q132 74 150 60 Q168 74 186 60 L198 60"
        fill="#fff7ed"
        stroke="#fb923c"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Door */}
      <rect x="95" y="110" width="50" height="70" rx="4" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="137" cy="148" r="3" fill="#f59e0b" />

      {/* "CLOSED" sign hanging on door */}
      <rect x="101" y="120" width="38" height="16" rx="3" fill="#ef4444" />
      <text x="120" y="131.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">
        CLOSED
      </text>

      {/* Left window */}
      <rect x="60" y="72" width="28" height="28" rx="3" fill="#e0f2fe" stroke="#93c5fd" strokeWidth="1" />
      <line x1="74" y1="72" x2="74" y2="100" stroke="#93c5fd" strokeWidth="0.8" />
      <line x1="60" y1="86" x2="88" y2="86" stroke="#93c5fd" strokeWidth="0.8" />

      {/* Right window */}
      <rect x="152" y="72" width="28" height="28" rx="3" fill="#e0f2fe" stroke="#93c5fd" strokeWidth="1" />
      <line x1="166" y1="72" x2="166" y2="100" stroke="#93c5fd" strokeWidth="0.8" />
      <line x1="152" y1="86" x2="180" y2="86" stroke="#93c5fd" strokeWidth="0.8" />

      {/* Moon */}
      <circle cx="195" cy="28" r="14" fill="#fde68a" />
      <circle cx="202" cy="23" r="11" fill="#fff7ed" />

      {/* Stars */}
      <circle cx="40" cy="20" r="1.5" fill="#fbbf24" opacity="0.7" />
      <circle cx="60" cy="12" r="1" fill="#fbbf24" opacity="0.5" />
      <circle cx="170" cy="15" r="1.2" fill="#fbbf24" opacity="0.6" />
      <circle cx="155" cy="8" r="1" fill="#fbbf24" opacity="0.4" />
      <circle cx="80" cy="30" r="1" fill="#fbbf24" opacity="0.5" />

      {/* Zzz sleep indicator */}
      <text x="205" y="55" fill="#f59e0b" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif" opacity="0.5">
        z
      </text>
      <text x="215" y="45" fill="#f59e0b" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif" opacity="0.4">
        z
      </text>
      <text x="222" y="37" fill="#f59e0b" fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif" opacity="0.3">
        z
      </text>
    </svg>
  );
}

interface QuickInfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
}

function QuickInfoCard({ icon: Icon, label, value, color, bg }: QuickInfoCardProps) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3.5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg} ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm text-gray-700 truncate">{value}</p>
      </div>
    </div>
  );
}

interface ShopClosedStateProps {
  restaurantName?: string;
  onOpenShop?: () => void;
  /** e.g. "Today, 11:00 PM" from profile closingTime */
  lastClosedText?: string;
  /** e.g. "Tomorrow, 11:00 AM" from profile openingTime */
  nextOpeningText?: string;
}

export function ShopClosedState({
  restaurantName = 'Spice Garden',
  onOpenShop,
  lastClosedText,
  nextOpeningText,
}: ShopClosedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] px-4 relative">
      <div className="w-full max-w-md text-center">
        {/* Illustration */}
        <ClosedShopIllustration />

        {/* Heading */}
        <div className="mt-6 mb-2 flex items-center justify-center gap-2">
          <Moon className="w-5 h-5 text-amber-400" />
          <h1 className="text-gray-900">Shop is Closed</h1>
        </div>
        <p className="text-sm text-gray-400 max-w-xs mx-auto">
          {restaurantName} is currently not accepting orders. Open the shop to start receiving QR orders from customers.
        </p>

        {/* Open Shop button */}
        {onOpenShop && (
          <button
            onClick={onOpenShop}
            className="mt-6 inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors cursor-pointer shadow-sm shadow-primary/20"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Open Shop Now
          </button>
        )}

        {/* Quick info cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <QuickInfoCard
            icon={Clock}
            label="Last Closed"
            value={lastClosedText ?? 'Today, 11:30 PM'}
            color="text-primary"
            bg="bg-primary/10"
          />
          <QuickInfoCard
            icon={CalendarClock}
            label="Next Opening"
            value={nextOpeningText ?? 'Tomorrow, 11:00 AM'}
            color="text-[var(--stat-peak)]"
            bg="bg-[var(--stat-peak-light)]"
          />
          <QuickInfoCard
            icon={Bell}
            label="Pending Alerts"
            value="No new notifications"
            color="text-[var(--stat-popular)]"
            bg="bg-[var(--stat-popular-light)]"
          />
          <QuickInfoCard
            icon={Moon}
            label="Today's Summary"
            value="47 orders · ₹12,450"
            color="text-amber-600"
            bg="bg-amber-50"
          />
        </div>

        {/* Subtle footer tip */}
        <p className="mt-6 text-[11px] text-gray-300">
          Tip: You can schedule auto open/close times in Settings → Operating Hours
        </p>
      </div>

      <span className="fixed bottom-4 right-4 text-[11px] text-gray-400/60">
        powered by Smart Menu
      </span>
    </div>
  );
}
