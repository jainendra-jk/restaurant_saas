import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Rocket } from "lucide-react";

interface SetupLoadingScreenProps {
  activeStep: number;
  completed: boolean;
  statusMessage?: string | null;
  progressPct: number;
}

const steps = [
  { label: "Upload Menu" },
  { label: "Extracting Items" },
  { label: "Organizing Categories" },
  { label: "Building Dashboard" },
];

const activityByStep: string[][] = [
  ["Reading your menu...", "Parsing file contents..."],
  ["Found 42 items", "Detecting item prices...", "Matching descriptions..."],
  ["Creating Starters, Mains, Desserts...", "Assigning items to categories..."],
  ["Generating dashboard layout...", "Setting up analytics...", "Finalizing everything..."],
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function stepProgressFromOverall(progressPct: number, stepIndex: number): number {
  const bounds = [0, 25, 50, 75, 100] as const;
  const start = bounds[Math.max(0, Math.min(stepIndex, bounds.length - 2))]!;
  const end = bounds[Math.max(1, Math.min(stepIndex + 1, bounds.length - 1))]!;
  const overall = Math.max(0, Math.min(100, progressPct));
  return clamp01((overall - start) / Math.max(1, end - start));
}

/* Shimmer bar used inside skeleton */
function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-orange-100/60 ${className ?? ""}`}>
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.08) 40%, rgba(249,115,22,0.13) 50%, rgba(249,115,22,0.08) 60%, transparent 100%)",
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ── Horizontal Step Tracker ── */
function StepTracker({ activeStep, completed }: { activeStep: number; completed: boolean }) {
  return (
    <div className="flex items-start justify-between w-full max-w-md mx-auto px-4">
      {steps.map((step, i) => {
        const isDone = completed || activeStep > i;
        const isActive = activeStep === i && !completed;

        return (
          <div key={step.label} className="flex flex-col items-center relative" style={{ flex: 1 }}>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="absolute top-3.5 h-0.5 z-0"
                style={{ left: "50%", right: "-50%", width: "100%" }}
              >
                <div className="w-full h-full bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: "#f97316" }}
                    initial={{ width: "0%" }}
                    animate={{ width: isDone ? "100%" : "0%" }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
              </div>
            )}

            {/* Circle */}
            <div className="relative z-10">
              {isDone ? (
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#f97316" }}
                >
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </motion.div>
              ) : isActive ? (
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: "#f97316" }}
                  />
                  <div
                    className="relative w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white"
                    style={{ borderColor: "#f97316" }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f97316" }} />
                  </div>
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full border-2 border-gray-200 bg-white" />
              )}
            </div>

            {/* Label */}
            <p
              className="text-[10px] sm:text-xs mt-2 text-center leading-tight px-1"
              style={{ color: isDone || isActive ? "#f97316" : "#9ca3af" }}
            >
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Full-screen Skeleton Dashboard UI ── */
function SkeletonDashboard() {
  return (
    <div className="w-full h-full rounded-2xl border border-orange-100 bg-white shadow-lg shadow-orange-900/5 overflow-hidden flex flex-col">
      {/* Top nav bar */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-orange-100">
        <Shimmer className="w-7 h-7 rounded-lg !bg-orange-200/40" />
        <Shimmer className="h-4 w-24 sm:w-32" />
        <div className="flex-1" />
        <Shimmer className="h-4 w-12" />
        <Shimmer className="w-7 h-7 rounded-full" />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-14 sm:w-48 border-r border-orange-100 p-3 sm:p-4 space-y-3 flex-shrink-0">
          <Shimmer className="w-full h-5 rounded-lg" />
          <div className="space-y-2.5 pt-3">
            <Shimmer className="w-full h-4" />
            <Shimmer className="w-full h-4" />
            <Shimmer className="w-3/4 h-4" />
            <Shimmer className="w-full h-4" />
            <Shimmer className="w-2/3 h-4" />
            <div className="pt-3 border-t border-orange-50 mt-3 space-y-2.5 hidden sm:block">
              <Shimmer className="w-full h-4" />
              <Shimmer className="w-5/6 h-4" />
              <Shimmer className="w-full h-4" />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-hidden flex flex-col">
          {/* Page title + actions */}
          <div className="flex items-center gap-3">
            <Shimmer className="h-6 w-32 sm:w-44" />
            <div className="flex-1" />
            <Shimmer className="h-7 w-16 sm:w-20 rounded-lg" />
            <Shimmer className="h-7 w-16 sm:w-20 rounded-lg" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={`stat-${i}`} className="rounded-xl border border-orange-50 p-3 space-y-2 bg-orange-50/20">
                <Shimmer className="w-2/3 h-3" />
                <Shimmer className="w-1/2 h-5" />
              </div>
            ))}
          </div>

          {/* Category tabs */}
          <div className="flex gap-2">
            <Shimmer className="h-7 w-18 rounded-full" />
            <Shimmer className="h-7 w-22 rounded-full" />
            <Shimmer className="h-7 w-16 rounded-full" />
            <Shimmer className="h-7 w-20 rounded-full hidden sm:block" />
          </div>

          {/* Menu cards grid — fills remaining space */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 flex-1 auto-rows-min">
            {[...Array(8)].map((_, i) => (
              <div key={`card-${i}`} className="rounded-xl border border-orange-50 p-2.5 space-y-2 bg-orange-50/30">
                <Shimmer className="w-full h-16 sm:h-20 rounded-lg" />
                <Shimmer className="w-3/4 h-3" />
                <div className="flex items-center justify-between">
                  <Shimmer className="w-1/3 h-3" />
                  <Shimmer className="w-8 h-5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Activity Feed — anchored to bottom-left of skeleton ── */
function ActivityFeed({
  activeStep,
  completed,
  progressPct,
}: {
  activeStep: number;
  completed: boolean;
  progressPct: number;
}) {
  const clampedStep = Math.max(0, Math.min(activeStep, steps.length - 1));
  const progress = completed ? 100 : Math.max(0, Math.min(100, progressPct));
  const visibleMessages = useMemo(() => {
    const msgs: string[] = [];
    for (let i = 0; i < clampedStep; i += 1) {
      const doneMsg = activityByStep[i]?.at(-1);
      if (doneMsg) msgs.push(doneMsg);
    }

    const currentStepMsgs = activityByStep[clampedStep] ?? [];
    if (currentStepMsgs.length > 0) {
      const localProgress = stepProgressFromOverall(progress, clampedStep);
      const idx = Math.min(
        currentStepMsgs.length - 1,
        Math.floor(localProgress * currentStepMsgs.length)
      );
      msgs.push(currentStepMsgs[idx]!);
    }

    if (completed) {
      msgs.push("Setup complete. Preparing final redirect...");
    }
    return msgs.slice(-3);
  }, [clampedStep, completed, progress]);

  return (
    <div className="space-y-1">
      <AnimatePresence mode="popLayout">
        {visibleMessages.map((msg, i) => (
          <motion.div
            key={`${msg}-${i}`}
            initial={{ opacity: 0, y: 6, x: -4 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-1 h-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: "#f97316" }}
            />
            <p className="text-[11px] text-gray-400 truncate">{msg}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Component ── */
export function SetupLoadingScreen({
  activeStep,
  completed,
  statusMessage,
  progressPct,
}: SetupLoadingScreenProps) {
  const clampedStep = Math.max(0, Math.min(activeStep, steps.length - 1));
  const progress = completed ? 100 : Math.max(0, Math.min(100, progressPct));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fff1e6 100%)" }}
    >
      {/* Soft glow */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, #fdba74 0%, transparent 70%)", filter: "blur(100px)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-4 sm:p-6 lg:p-8">
        {/* Step Tracker — top */}
        <div className="flex-shrink-0 pt-2 pb-5 sm:pb-6">
          <StepTracker activeStep={clampedStep} completed={completed} />
        </div>

        {/* Skeleton — takes all remaining space */}
        <div className="flex-1 min-h-0 relative">
          <SkeletonDashboard />

          {/* Floating overlay card — center */}
          <AnimatePresence mode="wait">
            {!completed ? (
              <motion.div
                key="loading-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div
                  className="bg-white/90 rounded-2xl px-8 py-7 shadow-2xl shadow-orange-900/10 border border-orange-100 text-center pointer-events-auto"
                  style={{ backdropFilter: "blur(16px)" }}
                >
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(249,115,22,0.1)" }}
                  >
                    <Rocket className="w-6 h-6" style={{ color: "#f97316" }} />
                  </motion.div>
                  <p className="text-gray-800">Setting up your restaurant</p>
                  <p className="text-gray-400 text-xs mt-1.5 flex items-center justify-center gap-0.5">
                    We're building everything for you
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      ...
                    </motion.span>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="done-card"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div
                  className="bg-white/90 rounded-2xl px-8 py-7 shadow-2xl shadow-orange-900/10 border border-orange-100 text-center pointer-events-auto"
                  style={{ backdropFilter: "blur(16px)" }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-green-50"
                  >
                    <Check className="w-6 h-6 text-green-500" strokeWidth={3} />
                  </motion.div>
                  <p className="text-gray-800">Your restaurant is ready 🚀</p>
                  <p className="text-gray-400 text-xs mt-1.5">Redirecting you now...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom bar — activity feed + hint */}
        <div className="flex-shrink-0 pt-4 pb-1 flex items-end justify-between gap-4">
          {/* Activity feed — bottom left */}
          <div className="flex-1 max-w-xs">
            {!completed && (
              <ActivityFeed
                activeStep={clampedStep}
                completed={completed}
                progressPct={progress}
              />
            )}
          </div>

          {/* Hint — bottom right */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-[11px] text-gray-300 flex-shrink-0"
          >
            {statusMessage ?? "This usually takes a few seconds"}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
