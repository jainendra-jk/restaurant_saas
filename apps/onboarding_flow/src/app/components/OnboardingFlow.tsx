import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ProgressBar } from "./ProgressBar";
import { InputCard } from "./InputCard";
import { MenuUpload, type MenuImportStatus } from "./MenuUpload";
import { DashboardSetup } from "./DashboardSetup";
import { SuccessScreen } from "./SuccessScreen";
import { ReviewScreen } from "./ReviewScreen";
import { SetupLoadingScreen } from "./SetupLoadingScreen2";
import { SwipeContainer } from "./SwipeContainer";
import { validate } from "./validation";
import { persistOnboardingToSupabase, getCustomerAppOriginFromEnv } from "../utils/persistOnboarding";
import {
  extractMenuFromPdf,
  generateTableQr,
  replaceMenuFromExtract,
  type QrTableEntry,
} from "@restaurant-saas/api-client";
import { downloadOnboardingWelcomePdf } from "../utils/onboardingWelcomePdf";
import { supabase } from "../../lib/supabase";
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
  password: string;
}

const STORAGE_KEY = "orderly_onboarding";
/** Bumped when step order changes (e.g. dashboard before menu). */
const FLOW_VERSION = 2;

const defaultFormData: FormData = {
  restaurantName: "", ownerName: "", phone: "", email: "",
  address: "", city: "", state: "", pincode: "",
  gstNumber: "", fssaiNumber: "",
  tables: "", password: "",
};

interface SavedOnboardingPayload {
  formData?: Partial<FormData>;
  step?: number;
  subStep?: number;
  tenantRestaurantId?: string | null;
  persistCompleted?: boolean;
  tenantNeedsEmailConfirmation?: boolean;
  flowVersion?: number;
}

function loadSavedData() {
  const empty = {
    formData: defaultFormData,
    step: 1,
    subStep: 0,
    tenantRestaurantId: null as string | null,
    persistCompleted: false,
    tenantNeedsEmailConfirmation: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedOnboardingPayload;
      let step = parsed.step || 1;
      let subStep = parsed.subStep || 0;
      if (parsed.flowVersion !== FLOW_VERSION) {
        if (step === 2) {
          step = 3;
          subStep = 0;
        } else if (step === 3) {
          step = 2;
        }
      }
      return {
        formData: { ...defaultFormData, ...parsed.formData },
        step,
        subStep,
        tenantRestaurantId: parsed.tenantRestaurantId ?? null,
        persistCompleted: parsed.persistCompleted ?? false,
        tenantNeedsEmailConfirmation: parsed.tenantNeedsEmailConfirmation ?? false,
      };
    }
  } catch {
    // ignore
  }
  return empty;
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

const step3Fields = ["tables", "password"] as const;

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
  const [showSetupLoading, setShowSetupLoading] = useState(false);
  const [setupActiveStep, setSetupActiveStep] = useState(0);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [setupStatusMessage, setSetupStatusMessage] = useState<string | null>(null);
  const [setupProgressPct, setSetupProgressPct] = useState(0);
  const [menuPdfFile, setMenuPdfFile] = useState<File | null>(null);
  const [postSignupNote, setPostSignupNote] = useState<string | null>(null);
  const [tenantRestaurantId, setTenantRestaurantId] = useState<string | null>(
    saved.current.tenantRestaurantId
  );
  const [persistCompleted, setPersistCompleted] = useState(saved.current.persistCompleted);
  const [tenantNeedsEmailConfirmation, setTenantNeedsEmailConfirmation] = useState(
    saved.current.tenantNeedsEmailConfirmation
  );
  const [menuImportState, setMenuImportState] = useState<MenuImportStatus>("idle");
  const [menuImportError, setMenuImportError] = useState<string | null>(null);
  const menuImportedFileKeyRef = useRef<string | null>(null);
  const menuFileKeyCacheRef = useRef<WeakMap<File, string>>(new WeakMap());
  const menuReplacePromiseRef = useRef<Promise<void> | null>(null);

  // Auto-save to localStorage
  useEffect(() => {
    if (isComplete) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const timer = setTimeout(() => {
      if (!showReview) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            formData,
            step: currentStep,
            subStep,
            tenantRestaurantId,
            persistCompleted,
            tenantNeedsEmailConfirmation,
            flowVersion: FLOW_VERSION,
          })
        );
        setSaveIndicator(true);
        setTimeout(() => setSaveIndicator(false), 1500);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    formData,
    currentStep,
    subStep,
    tenantRestaurantId,
    persistCompleted,
    tenantNeedsEmailConfirmation,
    isComplete,
    showReview,
  ]);

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
    if (currentStep === 2) return step3Fields.length;
    if (currentStep === 3) return 1;
    return 1;
  };

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const runReplaceMenu = useCallback(
    async (
      restaurantId: string,
      extracted: Parameters<typeof replaceMenuFromExtract>[1],
      token: string
    ) => {
      if (!menuReplacePromiseRef.current) {
        menuReplacePromiseRef.current = replaceMenuFromExtract(restaurantId, extracted, token)
          .finally(() => {
            menuReplacePromiseRef.current = null;
          });
      }
      await menuReplacePromiseRef.current;
    },
    []
  );

  const getMenuFileKey = useCallback(async (file: File): Promise<string> => {
    const cached = menuFileKeyCacheRef.current.get(file);
    if (cached) return cached;

    const base = `${file.name}-${file.size}-${file.lastModified}`;
    try {
      if (typeof crypto !== "undefined" && crypto.subtle) {
        const bytes = await file.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hash = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const key = `${base}-${hash}`;
        menuFileKeyCacheRef.current.set(file, key);
        return key;
      }
    } catch {
      // Fall back to base key when digest is not available.
    }

    menuFileKeyCacheRef.current.set(file, base);
    return base;
  }, []);

  useEffect(() => {
    if (!menuPdfFile) {
      menuImportedFileKeyRef.current = null;
      setMenuImportState("idle");
      setMenuImportError(null);
      return;
    }
    // Consolidate import trigger to review confirmation flow.
    // Keep uploader status reset when a new file is selected.
    menuImportedFileKeyRef.current = null;
    setMenuImportState("idle");
    setMenuImportError(null);
  }, [menuPdfFile]);

  const canSwipeNext = useCallback(() => {
    if (isComplete || showReview) return false;
    if (currentStep === 1) {
      const field = step1Fields[subStep];
      const val = formData[field.key as keyof FormData];
      if (field.optional && !val.trim()) return true;
      return validate(field.key, val).valid;
    }
    if (currentStep === 2) {
      const fieldKey = step3Fields[subStep];
      return validate(fieldKey, formData[fieldKey]).valid;
    }
    if (currentStep === 3) return menuPdfFile !== null;
    return false;
  }, [
    currentStep,
    subStep,
    formData,
    menuPdfFile,
    isComplete,
    showReview,
  ]);

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
      if (subStep < step3Fields.length - 1) {
        setSubStep((s) => s + 1);
      } else {
        setCurrentStep(3);
        setSubStep(0);
      }
    } else if (currentStep === 3) {
      setShowReview(true);
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
      setSubStep(0);
      return;
    }
    if (currentStep === 1) {
      if (subStep > 0) setSubStep((s) => s - 1);
    } else if (currentStep === 2) {
      if (subStep > 0) {
        setSubStep((s) => s - 1);
      } else {
        setCurrentStep(1);
        setSubStep(step1Fields.length - 1);
      }
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setSubStep(step3Fields.length - 1);
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

  const stepLabels = ["Restaurant Details", "Dashboard Setup", "Menu Upload"];

  const handleEditFromReview = useCallback((step: number, editSubStep: number) => {
    setShowReview(false);
    setReturnToReview(true);
    setDirection(-1);
    setCurrentStep(step);
    setSubStep(editSubStep);
  }, []);

  const handleConfirmReview = useCallback(async () => {
    setIsSubmitting(true);
    setPostSignupNote(null);
    setShowSetupLoading(true);
    setSetupCompleted(false);
    setSetupActiveStep(0);
    setSetupStatusMessage("Starting setup...");
    setSetupProgressPct(0);

    let restaurantId = tenantRestaurantId;
    let needsEmailConfirmation = tenantNeedsEmailConfirmation;
    if (!persistCompleted || !restaurantId) {
      setSetupActiveStep(0);
      setSetupStatusMessage("Creating your account...");
      setSetupProgressPct(5);
      const result = await persistOnboardingToSupabase(formData);
      if (result.error && result.error !== "Supabase not configured") {
        toast.error(result.error);
        setShowSetupLoading(false);
        setIsSubmitting(false);
        return;
      }
      restaurantId = result.restaurantId;
      needsEmailConfirmation = result.needsEmailConfirmation;
      setTenantRestaurantId(restaurantId);
      setTenantNeedsEmailConfirmation(needsEmailConfirmation);
      setPersistCompleted(true);
    }

    const apiBaseOk = Boolean(import.meta.env.VITE_API_BASE_URL?.trim());
    const origin = getCustomerAppOriginFromEnv();
    const tableCount = Math.min(50, Math.max(1, parseInt(formData.tables, 10) || 5));
    let qrTablesForPdf: QrTableEntry[] = [];
    let restaurantSlugForPdf: string | undefined;

    let accessToken: string | null = null;
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      accessToken = session?.access_token ?? null;
    }

    const canUseApi =
      !needsEmailConfirmation &&
      accessToken &&
      restaurantId &&
      apiBaseOk &&
      supabase;

    let menuImportFailed = false;

    if (canUseApi && menuPdfFile) {
      try {
        const fileKey = await getMenuFileKey(menuPdfFile);
        if (menuImportedFileKeyRef.current === fileKey) {
          setMenuImportState("done");
          setSetupStatusMessage("Menu already imported from your PDF.");
          setSetupProgressPct(75);
        } else {
          setSetupActiveStep(0);
          setSetupStatusMessage("Uploading your menu...");
          setMenuImportState("importing");
          setMenuImportError(null);
          setSetupProgressPct(10);
          const extracted = await extractMenuFromPdf(
            menuPdfFile,
            accessToken,
            restaurantId,
            formData.restaurantName
          );
          setSetupActiveStep(1);
          setSetupStatusMessage("Extracting menu items...");
          setSetupProgressPct(50);
          await runReplaceMenu(restaurantId, extracted, accessToken);
          setSetupActiveStep(2);
          setSetupStatusMessage("Organizing categories...");
          setSetupProgressPct(75);
          menuImportedFileKeyRef.current = fileKey;
          setMenuImportState("done");
          setSetupStatusMessage("Menu imported from your PDF.");
        }
      } catch (e) {
        menuImportFailed = true;
        const msg = e instanceof Error ? e.message : "Menu import failed";
        setMenuImportState("error");
        setMenuImportError(msg);
        setSetupStatusMessage(msg);
        toast.error(msg);
        setShowSetupLoading(false);
        setShowReview(false);
        setDirection(-1);
        setCurrentStep(3);
        setSubStep(0);
      }
    }

    if (menuImportFailed) {
      setIsSubmitting(false);
      return;
    }

    if (canUseApi && origin) {
      try {
        setSetupActiveStep(3);
        setSetupStatusMessage("Finalizing dashboard...");
        setSetupProgressPct(80);
        const qrRes = await generateTableQr(
          { restaurantId, tableCount, origin },
          accessToken
        );
        qrTablesForPdf = qrRes.tables;
        restaurantSlugForPdf = qrRes.restaurant_slug;
        setSetupStatusMessage("Generating table QR codes...");
        setSetupProgressPct(90);
        for (const row of qrRes.tables) {
          const { error: upErr } = await supabase!
            .from("tables")
            .update({
              order_url: row.url,
              qr_png_base64: row.png_base64,
            })
            .eq("restaurant_id", restaurantId)
            .eq("number", row.table_number);
          if (upErr) {
            throw new Error(upErr.message);
          }
        }
        setSetupStatusMessage("Table QR codes saved.");
        setSetupProgressPct(95);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "QR generation failed";
        setSetupStatusMessage(msg);
        toast.error(msg);
      }
    } else if (
      !needsEmailConfirmation &&
      restaurantId &&
      !apiBaseOk &&
      (menuPdfFile || origin)
    ) {
      setSetupActiveStep(3);
      setSetupStatusMessage(
        "Set VITE_API_BASE_URL and run the API to import your menu and generate QR codes from the admin dashboard."
      );
      setSetupProgressPct(75);
    }

    if (needsEmailConfirmation) {
      setPostSignupNote(
        "Confirm your email, then sign in to the admin dashboard to import your menu and generate QR codes if they did not complete here."
      );
      setSetupActiveStep(3);
      setSetupStatusMessage("Check your email to confirm your account.");
      setSetupProgressPct(75);
    }

    setIsSubmitting(false);

    if (restaurantId) {
      try {
        setSetupStatusMessage("Preparing your welcome pack...");
        setSetupProgressPct(98);
        downloadOnboardingWelcomePdf({
          formData,
          qrTables: qrTablesForPdf,
          restaurantSlug: restaurantSlugForPdf,
          customerAppOrigin: origin,
        });
      } catch (e) {
        console.error(e);
        toast.error(
          e instanceof Error ? e.message : "Could not generate welcome PDF"
        );
      }
    }
    setSetupCompleted(true);
    setSetupStatusMessage("Your restaurant is ready 🚀");
    setSetupProgressPct(100);

    window.setTimeout(() => {
      setIsComplete(true);
      setShowReview(false);
      setShowSetupLoading(false);
    }, 900);
  }, [
    formData,
    menuPdfFile,
    persistCompleted,
    tenantRestaurantId,
    tenantNeedsEmailConfirmation,
    getMenuFileKey,
    runReplaceMenu,
  ]);

  const renderContent = () => {
    const key = `${currentStep}-${subStep}`;

    if (isComplete) {
      return (
        <SuccessScreen
          key="success"
          adminDashboardUrl={import.meta.env.VITE_ADMIN_DASHBOARD_ORIGIN}
          footnote={postSignupNote}
        />
      );
    }

    if (showReview) {
      return (
        <ReviewScreen
          key="review"
          formData={formData}
          menuPdfFileName={menuPdfFile?.name ?? null}
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

    if (currentStep === 3) {
      const apiBaseOk = Boolean(import.meta.env.VITE_API_BASE_URL?.trim());
      return (
        <MenuUpload
          key={key}
          onNext={goNext}
          direction={direction}
          menuPdfFile={menuPdfFile}
          onMenuPdfChange={setMenuPdfFile}
          importStatus={menuImportState}
          importError={menuImportError}
          needsSessionForImport={
            Boolean(tenantNeedsEmailConfirmation && menuPdfFile && tenantRestaurantId)
          }
          apiNotConfigured={Boolean(menuPdfFile && tenantRestaurantId && !apiBaseOk)}
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
      {showSetupLoading && (
        <SetupLoadingScreen
          activeStep={setupActiveStep}
          completed={setupCompleted}
          statusMessage={setupStatusMessage}
          progressPct={setupProgressPct}
        />
      )}
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
          className="bg-white rounded-3xl shadow-xl shadow-orange-900/5 p-6 sm:p-8 relative"
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