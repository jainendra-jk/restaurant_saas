import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ProgressBar } from "./ProgressBar";
import { InputCard } from "./InputCard";
import { MenuUpload } from "./MenuUpload";
import { DashboardSetup } from "./DashboardSetup";
import { SuccessScreen } from "./SuccessScreen";
import { ReviewScreen } from "./ReviewScreen";
import { SwipeContainer } from "./SwipeContainer";
import { validate } from "./validation";
import { persistOnboardingToSupabase } from "../utils/persistOnboarding";
import { ArrowLeft, UtensilsCrossed, Save } from "lucide-react";
import { toast, Toaster } from "sonner";

interface FormData {
  restaurantName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  fssaiNumber: string;
  tables: string;
  username: string;
  password: string;
  domain: string;
}

const STORAGE_KEY = "orderly_onboarding";

const defaultFormData: FormData = {
  restaurantName: "", ownerName: "", phone: "", email: "",
  address: "", city: "", state: "", pincode: "",
  gstNumber: "", fssaiNumber: "",
  tables: "", username: "", password: "", domain: "",
};

function loadSavedData(): { formData: FormData; step: number; subStep: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        formData: { ...defaultFormData, ...parsed.formData },
        step: parsed.step || 1,
        subStep: parsed.subStep || 0,
      };
    }
  } catch {
    // ignore
  }
  return { formData: defaultFormData, step: 1, subStep: 0 };
}

const step1Fields = [
  { key: "restaurantName", label: "What's your restaurant called?", placeholder: "e.g. Tasty Bites Cafe", type: "text", optional: false },
  { key: "ownerName", label: "What's your name?", placeholder: "e.g. Rajesh Kumar", type: "text", optional: false },
  { key: "phone", label: "Your phone number", placeholder: "+91 98765 43210", type: "tel", optional: false },
  { key: "email", label: "Your email address", placeholder: "you@restaurant.com", type: "email", optional: false },
  { key: "address", label: "Restaurant address", placeholder: "123, Main Street", type: "text", optional: false },
  { key: "city", label: "Which city?", placeholder: "e.g. Mumbai", type: "text", optional: false },
  { key: "state", label: "Which state?", placeholder: "e.g. Maharashtra", type: "text", optional: false },
  { key: "pincode", label: "Area pincode", placeholder: "e.g. 400001", type: "text", optional: false },
  { key: "gstNumber", label: "GST Number", placeholder: "e.g. 22AAAAA0000A1Z5", type: "text", optional: true },
  { key: "fssaiNumber", label: "FSSAI License Number", placeholder: "e.g. 10020043000123", type: "text", optional: true },
] as const;

const step3Fields = ["tables", "username", "password", "domain"] as const;

export function OnboardingFlow() {
  const saved = useRef(loadSavedData());
  const [formData, setFormData] = useState<FormData>(saved.current.formData);
  const [currentStep, setCurrentStep] = useState(saved.current.step);
  const [subStep, setSubStep] = useState(saved.current.subStep);
  const [direction, setDirection] = useState(1);
  const [showReview, setShowReview] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save to localStorage
  useEffect(() => {
    if (isComplete) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const timer = setTimeout(() => {
      if (!showReview) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          formData,
          step: currentStep,
          subStep,
        }));
        setSaveIndicator(true);
        setTimeout(() => setSaveIndicator(false), 1500);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData, currentStep, subStep, isComplete, showReview]);

  // Show resume toast if data was saved
  useEffect(() => {
    if (saved.current.step > 1 || saved.current.subStep > 0) {
      toast("Welcome back! We've restored your progress.", {
        duration: 3000,
        style: { background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" },
      });
    }
  }, []);

  const getTotalSubSteps = () => {
    if (currentStep === 1) return step1Fields.length;
    if (currentStep === 2) return 1;
    if (currentStep === 3) return step3Fields.length;
    return 1;
  };

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canSwipeNext = useCallback(() => {
    if (isComplete || showReview) return false;
    if (currentStep === 1) {
      const field = step1Fields[subStep];
      const val = formData[field.key as keyof FormData];
      if (field.optional && !val.trim()) return true;
      return validate(field.key, val).valid;
    }
    if (currentStep === 2) return true; // can always proceed from menu upload
    if (currentStep === 3) {
      const fieldKey = step3Fields[subStep];
      return validate(fieldKey, formData[fieldKey]).valid;
    }
    return false;
  }, [currentStep, subStep, formData, isComplete, showReview]);

  const goNext = useCallback(() => {
    setDirection(1);
    if (returnToReview) {
      setReturnToReview(false);
      setShowReview(true);
      return;
    }
    if (currentStep === 1) {
      if (subStep < step1Fields.length - 1) {
        setSubStep((s) => s + 1);
      } else {
        setCurrentStep(2);
        setSubStep(0);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
      setSubStep(0);
    } else if (currentStep === 3) {
      if (subStep < step3Fields.length - 1) {
        setSubStep((s) => s + 1);
      } else {
        setShowReview(true);
      }
    }
  }, [currentStep, subStep, returnToReview]);

  const goBack = useCallback(() => {
    setDirection(-1);
    if (isComplete) {
      setIsComplete(false);
      setShowReview(true);
      return;
    }
    if (showReview) {
      setShowReview(false);
      setCurrentStep(3);
      setSubStep(step3Fields.length - 1);
      return;
    }
    if (currentStep === 1) {
      if (subStep > 0) setSubStep((s) => s - 1);
    } else if (currentStep === 2) {
      setCurrentStep(1);
      setSubStep(step1Fields.length - 1);
    } else if (currentStep === 3) {
      if (subStep > 0) {
        setSubStep((s) => s - 1);
      } else {
        setCurrentStep(2);
        setSubStep(0);
      }
    }
  }, [currentStep, subStep, isComplete, showReview]);

  const handleSwipeNext = useCallback(() => {
    if (canSwipeNext()) {
      goNext();
    }
  }, [canSwipeNext, goNext]);

  const handleSwipeBack = useCallback(() => {
    if (currentStep > 1 || subStep > 0 || showReview) {
      goBack();
    }
  }, [currentStep, subStep, goBack, showReview]);

  const canGoBack = currentStep > 1 || subStep > 0 || isComplete || showReview;

  const stepLabels = ["Restaurant Details", "Menu Upload", "Dashboard Setup"];

  const handleEditFromReview = useCallback((step: number, editSubStep: number) => {
    setShowReview(false);
    setReturnToReview(true);
    setDirection(-1);
    setCurrentStep(step);
    setSubStep(editSubStep);
  }, []);

  const handleConfirmReview = useCallback(async () => {
    setIsSubmitting(true);
    const { error } = await persistOnboardingToSupabase(formData);
    setIsSubmitting(false);
    if (error && error !== "Supabase not configured") {
      toast.error(error);
      return;
    }
    setIsComplete(true);
    setShowReview(false);
  }, [formData]);

  const renderContent = () => {
    const key = `${currentStep}-${subStep}`;

    if (isComplete) {
      return <SuccessScreen key="success" adminDashboardUrl={import.meta.env.VITE_ADMIN_DASHBOARD_ORIGIN} />;
    }

    if (showReview) {
      return (
        <ReviewScreen
          key="review"
          formData={formData}
          onConfirm={handleConfirmReview}
          onEdit={handleEditFromReview}
          isSubmitting={isSubmitting}
        />
      );
    }

    if (currentStep === 1) {
      const field = step1Fields[subStep];
      return (
        <InputCard
          key={key}
          label={field.label}
          placeholder={field.placeholder}
          fieldKey={field.key}
          type={field.type}
          optional={field.optional}
          value={formData[field.key as keyof FormData]}
          onChange={(v) => updateField(field.key, v)}
          onNext={goNext}
          onSkip={field.optional ? goNext : undefined}
          direction={direction}
        />
      );
    }

    if (currentStep === 2) {
      return <MenuUpload key={key} onNext={goNext} direction={direction} />;
    }

    if (currentStep === 3) {
      const fieldKey = step3Fields[subStep];
      return (
        <DashboardSetup
          key={key}
          field={fieldKey}
          value={formData[fieldKey]}
          onChange={(v) => updateField(fieldKey, v)}
          onNext={goNext}
          direction={direction}
        />
      );
    }

    return null;
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fff1e6 100%)" }}
    >
      <Toaster position="top-center" />
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#f97316" }}
          >
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <span className="text-gray-800 tracking-tight" style={{ fontSize: "1.125rem" }}>
            Orderly
          </span>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl shadow-orange-900/5 p-6 sm:p-8"
        >
          {/* Header */}
          {!isComplete && !showReview && (
            <div className="mb-6 space-y-4">
              <ProgressBar
                currentStep={currentStep}
                totalSteps={3}
                subStep={subStep}
                totalSubSteps={getTotalSubSteps()}
              />

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  {canGoBack && (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={goBack}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </motion.button>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-wider" style={{ color: "#f97316" }}>
                      {stepLabels[currentStep - 1]}
                    </p>
                  </div>
                </div>

                {/* Save indicator */}
                <AnimatePresence>
                  {saveIndicator && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 text-xs text-green-500"
                    >
                      <Save className="w-3 h-3" />
                      Saved
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Content with swipe */}
          <SwipeContainer
            onSwipeLeft={handleSwipeNext}
            onSwipeRight={handleSwipeBack}
            enabled={!isComplete && !showReview}
          >
            <div className={`overflow-hidden relative ${showReview ? "" : "min-h-[280px]"}`}>
              <AnimatePresence mode="wait" initial={false}>
                {renderContent()}
              </AnimatePresence>
            </div>
          </SwipeContainer>

          {/* Swipe hint */}
          {!isComplete && !showReview && (
            <AnimatePresence>
              {currentStep === 1 && subStep === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 1.5 }}
                  className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-300"
                >
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    ←
                  </motion.span>
                  Swipe to navigate
                  <motion.span
                    animate={{ x: [0, -5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    →
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Footer */}
        {!isComplete && !showReview && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-gray-400 mt-4"
          >
            Your progress is auto-saved
          </motion.p>
        )}
      </div>
    </div>
  );
}