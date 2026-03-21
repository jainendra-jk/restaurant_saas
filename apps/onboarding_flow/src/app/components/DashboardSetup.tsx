import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { validate } from "./validation";

interface DashboardSetupProps {
  field: "tables" | "username" | "password" | "domain";
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  direction: number;
}

function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["#ef4444", "#f59e0b", "#22c55e", "#16a34a"];

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2 mt-2"
    >
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: i < strength ? "100%" : "0%",
                backgroundColor: colors[Math.max(0, strength - 1)],
              }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: colors[Math.max(0, strength - 1)] }}>
          {labels[Math.max(0, strength - 1)]}
        </p>
        <p className="text-xs text-gray-400">
          {password.length >= 8 ? "" : `${8 - password.length} more chars needed`}
        </p>
      </div>
    </motion.div>
  );
}

function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex flex-wrap gap-2 mt-1"
    >
      {checks.map((check) => (
        <span
          key={check.label}
          className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors duration-200"
          style={{
            backgroundColor: check.met ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.06)",
            color: check.met ? "#16a34a" : "#9ca3af",
          }}
        >
          {check.met ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <div className="w-3 h-3 rounded-full border border-gray-300" />
          )}
          {check.label}
        </span>
      ))}
    </motion.div>
  );
}

export function DashboardSetup({ field, value, onChange, onNext, direction }: DashboardSetupProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState("");
  const [hasAttempted, setHasAttempted] = useState(false);
  const [showValid, setShowValid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, [field]);

  // Live validation after first attempt
  useEffect(() => {
    if (!hasAttempted) return;
    const result = validate(field, value);
    if (result.valid) {
      setError("");
      setShowValid(value.trim().length > 0);
    } else {
      setError(result.message);
      setShowValid(false);
    }
  }, [value, hasAttempted, field]);

  const handleNext = () => {
    const result = validate(field, value);
    setHasAttempted(true);
    if (!result.valid) {
      setError(result.message);
      if (field !== "tables") inputRef.current?.focus();
      return;
    }
    setError("");
    onNext();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) handleNext();
  };

  const configs = {
    tables: {
      label: "Number of Tables",
      description: "How many dine-in tables does your restaurant have?",
      placeholder: "e.g. 12",
    },
    username: {
      label: "Admin Username",
      description: "This will be your login to the dashboard",
      placeholder: "e.g. admin_tastybites",
    },
    password: {
      label: "Set a Password",
      description: "Make it strong to keep your account secure",
      placeholder: "Enter a secure password",
    },
    domain: {
      label: "Choose Your Domain",
      description: "Your customers will find you here",
      placeholder: "your-restaurant",
    },
  };

  const config = configs[field];
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
          <label className="text-gray-800">{config.label}</label>
          <p className="text-sm text-gray-400 mt-1">{config.description}</p>
        </div>

        <div>
          {field === "tables" ? (
            <div
              className="relative rounded-xl transition-all duration-300"
              style={{ boxShadow: glowColor }}
            >
              <input
                ref={inputRef}
                type="number"
                min="1"
                max="999"
                value={value}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 999)) {
                    onChange(val);
                  }
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={config.placeholder}
                className="w-full px-5 py-4 rounded-xl bg-gray-50/80 border border-gray-200 outline-none transition-all duration-300 pr-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ borderColor }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {showValid && !hasError && value.trim() && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </motion.div>
                )}
                {hasError && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </motion.div>
                )}
              </div>
            </div>
          ) : field === "domain" ? (
            <div
              className="flex items-center rounded-xl bg-gray-50/80 border border-gray-200 overflow-hidden transition-all duration-300"
              style={{ borderColor, boxShadow: glowColor }}
            >
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={config.placeholder}
                className="flex-1 px-5 py-4 bg-transparent outline-none border-none"
              />
              {showValid && !hasError && value.trim() && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="pr-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </div>
          ) : (
            <div
              className="relative rounded-xl transition-all duration-300"
              style={{ boxShadow: glowColor }}
            >
              <input
                ref={inputRef}
                type={field === "password" && !showPassword ? "password" : "text"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={config.placeholder}
                className="w-full px-5 py-4 rounded-xl bg-gray-50/80 border border-gray-200 outline-none transition-all duration-300 pr-12"
                style={{ borderColor }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {field === "password" && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
                {field !== "password" && showValid && !hasError && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </motion.div>
                )}
                {hasError && field !== "password" && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </motion.div>
                )}
              </div>
            </div>
          )}

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

        {field === "password" && (
          <>
            <PasswordStrength password={value} />
            <PasswordRequirements password={value} />
          </>
        )}

        <button
          onClick={handleNext}
          disabled={!value.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ backgroundColor: !value.trim() ? "#fdba74" : "#f97316" }}
        >
          {field === "domain" ? "Finish Setup" : "Continue"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}