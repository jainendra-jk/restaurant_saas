import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, SkipForward, AlertCircle, CheckCircle2 } from "lucide-react";
import { validate } from "./validation";

interface InputCardProps {
  label: string;
  placeholder: string;
  fieldKey: string;
  type?: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onSkip?: () => void;
  direction: number;
}

export function InputCard({
  label,
  placeholder,
  fieldKey,
  type = "text",
  optional = false,
  value,
  onChange,
  onNext,
  onSkip,
  direction,
}: InputCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState("");
  const [hasAttempted, setHasAttempted] = useState(false);
  const [showValid, setShowValid] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Live validation after first attempt
  useEffect(() => {
    if (!hasAttempted) return;
    const result = validate(fieldKey, value);
    if (result.valid) {
      setError("");
      setShowValid(value.trim().length > 0);
    } else {
      setError(result.message);
      setShowValid(false);
    }
  }, [value, hasAttempted, fieldKey]);

  const handleNext = () => {
    if (optional && !value.trim()) {
      onNext();
      return;
    }
    const result = validate(fieldKey, value);
    setHasAttempted(true);
    if (!result.valid) {
      setError(result.message);
      inputRef.current?.focus();
      return;
    }
    setError("");
    onNext();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNext();
    }
  };

  const hasError = !!error;
  const borderColor = hasError ? "#ef4444" : isFocused ? "#f97316" : undefined;
  const glowColor = hasError
    ? "0 0 0 3px rgba(239, 68, 68, 0.12), 0 1px 3px rgba(0,0,0,0.08)"
    : isFocused
    ? "0 0 0 3px rgba(249, 115, 22, 0.15), 0 1px 3px rgba(0,0,0,0.08)"
    : "0 1px 3px rgba(0,0,0,0.08)";

  return (
    <motion.div
      initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full"
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-gray-800">{label}</label>
            {optional && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                Optional
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {optional ? "You can skip this and add it later" : "This helps us set up your account"}
          </p>
        </div>

        <div>
          <div
            className="relative rounded-xl transition-all duration-300"
            style={{ boxShadow: glowColor }}
          >
            <input
              ref={inputRef}
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="w-full px-5 py-4 rounded-xl bg-gray-50/80 border border-gray-200 outline-none transition-all duration-300 pr-12"
              style={{ borderColor }}
            />
            <AnimatePresence mode="wait">
              {showValid && !hasError && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
              {hasError && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {hasError && (
              <motion.p
                initial={{ opacity: 0, y: -5, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -5, height: 0 }}
                className="text-xs text-red-500 mt-2 ml-1"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleNext}
            disabled={!value.trim() && !optional}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{
              backgroundColor: !value.trim() && !optional ? "#fdba74" : "#f97316",
            }}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
          {optional && onSkip && (
            <button
              onClick={onSkip}
              className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl text-gray-400 bg-gray-50 hover:bg-gray-100 transition-all duration-200 cursor-pointer"
            >
              Skip
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
