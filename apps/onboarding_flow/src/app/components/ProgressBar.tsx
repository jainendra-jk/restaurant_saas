import { motion } from "motion/react";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  subStep: number;
  totalSubSteps: number;
}

export function ProgressBar({ currentStep, totalSteps, subStep, totalSubSteps }: ProgressBarProps) {
  const overallProgress = ((currentStep - 1) / totalSteps) + ((subStep) / (totalSubSteps * totalSteps));

  return (
    <div className="w-full px-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 tracking-wide">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs text-gray-400">
          {Math.round(overallProgress * 100)}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: "#f97316" }}
          initial={{ width: 0 }}
          animate={{ width: `${overallProgress * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
