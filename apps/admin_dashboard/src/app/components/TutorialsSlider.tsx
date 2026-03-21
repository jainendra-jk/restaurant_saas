import { useState } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  ShoppingBag,
  Grid3X3,
  UtensilsCrossed,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  steps: {
    title: string;
    description: string;
    tip?: string;
  }[];
}

const tutorials: Tutorial[] = [
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    icon: LayoutDashboard,
    color: 'bg-primary/10 text-primary',
    steps: [
      { title: 'View key metrics', description: 'The dashboard home shows real-time stats — total revenue, orders today, active tables, and average order value at a glance.', tip: 'Click any stat card to jump to its detailed page.' },
      { title: 'Check recent orders', description: 'Scroll down to see the latest orders with their status, table number, and total amount. Use this for a quick pulse check.' },
      { title: 'Monitor peak hours', description: 'The revenue chart highlights peak ordering times. Hover over bars to see exact values for any time slot.', tip: 'Use this data to optimize staffing during rush hours.' },
    ],
  },
  {
    id: 'live-orders',
    title: 'Managing Live Orders',
    icon: ShoppingBag,
    color: 'bg-[var(--notif-order-bg)] text-[var(--notif-order-text)]',
    steps: [
      { title: 'View incoming orders', description: 'New orders appear in the "New" column automatically. Each card shows the table number, items ordered, and time since placement.' },
      { title: 'Update order status', description: 'Drag orders between columns (New > Preparing > Ready > Served) or use the status buttons on each card to progress them.', tip: 'Orders in "Preparing" for over 15 minutes get a warning indicator.' },
      { title: 'Handle special requests', description: 'Orders with special notes show an amber highlighted banner with a pulsing dot indicator. Click the banner to expand the full note, then tap "Acknowledge Note" to confirm the kitchen has read it.', tip: 'Always acknowledge allergy notes before starting preparation to avoid health risks.' },
      { title: 'Filter & search orders', description: 'Use the search bar and status filters at the top to quickly find specific orders by table number, order ID, or item name.' },
    ],
  },
  {
    id: 'tables',
    title: 'Table Management',
    icon: Grid3X3,
    color: 'bg-status-preparing-light text-status-preparing',
    steps: [
      { title: 'View table layout', description: 'See all your tables in a grid view with color-coded status indicators — green for available, orange for occupied, red for reserved.' },
      { title: 'QR for your tables', description: 'Click any table card and open the QR Code tab to view the QR for that table. Download the QR image or copy the order link to share with customers.', tip: 'Print QR codes on table tents or stickers for easy customer scanning.' },
      { title: 'View table orders', description: 'In the table slider, switch to the Orders tab to see the current active order and past orders for that specific table.' },
      { title: 'Manage table status', description: 'Toggle tables between Active and Inactive states. Active tables accept QR orders while inactive tables are hidden from customers.' },
    ],
  },
  {
    id: 'menu',
    title: 'Menu Management',
    icon: UtensilsCrossed,
    color: 'bg-[var(--stat-peak-light)] text-[var(--stat-peak)]',
    steps: [
      { title: 'Browse menu categories', description: 'Use the category tabs at the top to filter items. The "All Items" tab shows everything, while specific categories show filtered views.' },
      { title: 'Add new menu items', description: 'Click the "Add Item" button to open the creation form. Fill in name, price, description, portions, and assign one or more categories.', tip: 'Items can belong to multiple categories simultaneously — great for combos!' },
      { title: 'Edit existing items', description: 'Click any menu item card to open its edit slider. Update details, toggle availability, or modify portion sizes and beverage variants.' },
      { title: 'Manage availability', description: 'Use the toggle switch on each item card to quickly mark items as available or out of stock without opening the full editor.' },
      { title: 'Remove from categories', description: 'When viewing a specific category, use the amber "Remove" button to unlink an item from that category without deleting it entirely.' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    icon: BarChart3,
    color: 'bg-primary/10 text-primary',
    steps: [
      { title: 'Review revenue trends', description: 'The analytics page shows daily, weekly, and monthly revenue charts. Toggle between time ranges to spot trends and growth patterns.' },
      { title: 'Track popular items', description: 'See which menu items are ordered most frequently. Use this to make data-driven decisions about promotions and menu updates.', tip: 'Items trending upward might be good candidates for featured placement.' },
      { title: 'Monitor table performance', description: 'Check average order values and turnover rates per table to optimize your seating layout and table assignments.' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    icon: Settings,
    color: 'bg-gray-100 text-gray-600',
    steps: [
      { title: 'Update restaurant profile', description: 'Set your restaurant name, address, contact info, and operating hours. This information appears on customer-facing QR menus.' },
      { title: 'Configure notifications', description: 'Choose how you want to be alerted about new orders — sound alerts, push notifications, or email. Set quiet hours for off-peak times.' },
      { title: 'Payment settings', description: 'Add your merchant ID, UPI details, and configure accepted payment methods. Set up auto-settlement preferences.' },
      { title: 'Customize appearance', description: 'Change the dashboard theme, accent color, layout density, and font size to match your brand and workflow preferences.' },
    ],
  },
];

interface TutorialsSliderProps {
  onClose: () => void;
}

export function TutorialsSlider({ onClose }: TutorialsSliderProps) {
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});

  const activeTut = tutorials.find((t) => t.id === activeTutorial);

  const markStepComplete = (tutorialId: string, stepIndex: number) => {
    setCompletedSteps((prev) => {
      const existing = new Set(prev[tutorialId] || []);
      if (existing.has(stepIndex)) {
        existing.delete(stepIndex);
      } else {
        existing.add(stepIndex);
      }
      return { ...prev, [tutorialId]: existing };
    });
  };

  const getTutorialProgress = (tutorialId: string, totalSteps: number) => {
    const completed = completedSteps[tutorialId]?.size || 0;
    return Math.round((completed / totalSteps) * 100);
  };

  const resetTutorial = (tutorialId: string) => {
    setCompletedSteps((prev) => {
      const next = { ...prev };
      delete next[tutorialId];
      return next;
    });
    setCurrentStep(0);
  };

  const totalSteps = tutorials.reduce((sum, t) => sum + t.steps.length, 0);
  const totalCompleted = Object.values(completedSteps).reduce((sum, s) => sum + s.size, 0);
  const overallProgress = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-gray-900">Tutorials</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeTut ? activeTut.title : 'Learn to use your dashboard'}
            </p>
          </div>
        </div>
        <button
          onClick={activeTut ? () => { setActiveTutorial(null); setCurrentStep(0); } : onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          {activeTut ? (
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          ) : (
            <X className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {!activeTut ? (
          <>
            {/* Overall Progress */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 mb-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs text-primary">Overall Progress</span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl text-gray-900">{overallProgress}%</span>
                <span className="text-[11px] text-gray-400">
                  {totalCompleted}/{totalSteps} steps
                </span>
              </div>
              <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {/* Tutorial List */}
            <div className="space-y-2">
              {tutorials.map((tutorial) => {
                const progress = getTutorialProgress(tutorial.id, tutorial.steps.length);
                const isComplete = progress === 100;
                return (
                  <button
                    key={tutorial.id}
                    onClick={() => {
                      setActiveTutorial(tutorial.id);
                      setCurrentStep(0);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer text-left group"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isComplete ? 'bg-green-50 text-green-600' : tutorial.color
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      ) : (
                        <tutorial.icon className="w-4.5 h-4.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-700 group-hover:text-primary transition-colors">
                          {tutorial.title}
                        </p>
                        <span className={`text-[10px] ${isComplete ? 'text-green-600' : 'text-gray-400'}`}>
                          {progress}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isComplete ? 'bg-green-500' : 'bg-primary'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {tutorial.steps.length} steps
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary flex-shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Tutorial Progress */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                {activeTut.steps.map((_, i) => {
                  const done = completedSteps[activeTut.id]?.has(i);
                  const isCurrent = i === currentStep;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentStep(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        isCurrent
                          ? 'w-6 bg-primary'
                          : done
                          ? 'w-3 bg-green-400'
                          : 'w-3 bg-gray-200 hover:bg-gray-300'
                      }`}
                    />
                  );
                })}
              </div>
              <button
                onClick={() => resetTutorial(activeTut.id)}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-primary transition-colors cursor-pointer"
                title="Reset tutorial"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Step Content */}
            <div className="space-y-3">
              {activeTut.steps.map((step, i) => {
                const done = completedSteps[activeTut.id]?.has(i);
                const isCurrent = i === currentStep;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                      isCurrent
                        ? 'border-primary/30 bg-primary/[0.02] shadow-sm'
                        : done
                        ? 'border-green-100 bg-green-50/30'
                        : 'border-gray-100'
                    }`}
                  >
                    {/* Step header row — clickable area with checkbox */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setCurrentStep(i)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentStep(i); } }}
                      className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markStepComplete(activeTut.id, i);
                        }}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle
                            className={`w-5 h-5 ${
                              isCurrent ? 'text-primary' : 'text-gray-300'
                            }`}
                          />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-xs ${
                            done
                              ? 'text-green-700 line-through'
                              : isCurrent
                              ? 'text-gray-900'
                              : 'text-gray-600'
                          }`}
                        >
                          Step {i + 1}: {step.title}
                        </span>
                      </div>
                    </div>

                    {isCurrent && (
                      <div className="px-3 pb-3 pt-0 ml-8">
                        <p className="text-xs text-gray-500 leading-relaxed mb-2">
                          {step.description}
                        </p>
                        {step.tip && (
                          <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                            <Sparkles className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-primary/80 leading-relaxed">
                              <span className="text-primary">Tip:</span> {step.tip}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => markStepComplete(activeTut.id, i)}
                            className={`flex-1 text-xs py-2 px-3 rounded-lg transition-all cursor-pointer ${
                              done
                                ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                                : 'bg-primary text-white hover:bg-primary/90'
                            }`}
                          >
                            {done ? 'Completed — Undo?' : 'Mark as Complete'}
                          </button>
                          {i < activeTut.steps.length - 1 && (
                            <button
                              onClick={() => setCurrentStep(i + 1)}
                              className="text-xs py-2 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                            >
                              Next
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Completion Banner */}
            {getTutorialProgress(activeTut.id, activeTut.steps.length) === 100 && (
              <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-800">Tutorial Complete!</p>
                <p className="text-[11px] text-green-600 mt-1">
                  You've mastered {activeTut.title.toLowerCase()}
                </p>
              </div>
            )}
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}