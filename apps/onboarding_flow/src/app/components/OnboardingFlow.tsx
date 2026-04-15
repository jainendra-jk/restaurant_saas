import { useState, useCallback, useEffect, useRef, useMemo, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import ratolabsLogo from "../../assets/ratolabs_logo.svg";
import ratolabsLogo40 from "../../assets/ratolabs_logo_40.svg";
import ratolabsWordmark from "../../assets/ratolabs_wordmark.svg";
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
import { verifySignupOtp, resendSignupOtp } from "../utils/verifySignupOtp";
import {
  parseBillingPlanFromSearch,
  getMarketingOriginForRedirect,
  planToTableCount,
  type UrlBillingPlan,
} from "../utils/billingPlan";
import {
  extractMenuFromPdf,
  generateTableQr,
  replaceMenuFromExtract,
  type QrTableEntry,
} from "@restaurant-saas/api-client";
import { downloadOnboardingWelcomePdf } from "../utils/onboardingWelcomePdf";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Save } from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "./ui/input-otp";

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
/** Bumped when step order changes (review before menu upload). */
const FLOW_VERSION = 3;

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
  onboardingPhase?: "details_pending" | "menu_required" | "completed";
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
    onboardingPhase: "details_pending" as const,
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
          step = parsed.persistCompleted ? 3 : 2;
        }
      }
      return {
        formData: { ...defaultFormData, ...parsed.formData },
        step,
        subStep,
        tenantRestaurantId: parsed.tenantRestaurantId ?? null,
        persistCompleted: parsed.persistCompleted ?? false,
        tenantNeedsEmailConfirmation: parsed.tenantNeedsEmailConfirmation ?? false,
        onboardingPhase:
          parsed.onboardingPhase ??
          (parsed.persistCompleted ? "menu_required" : "details_pending"),
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

const step3FieldsAll = ["tables", "password"] as const;

function isGoogleAuthSession(session: { user?: { app_metadata?: unknown; identities?: unknown } } | null): boolean {
  const rawAppMeta = session?.user?.app_metadata as { provider?: unknown; providers?: unknown } | undefined;
  const provider = typeof rawAppMeta?.provider === "string" ? rawAppMeta.provider : "";
  if (provider === "google") return true;
  const providers = Array.isArray(rawAppMeta?.providers) ? rawAppMeta.providers : [];
  if (providers.some((p) => p === "google")) return true;
  const identities = Array.isArray(session?.user?.identities) ? session?.user?.identities : [];
  return identities.some((id) => {
    const providerId =
      typeof (id as { provider?: unknown })?.provider === "string"
        ? (id as { provider?: string }).provider
        : "";
    return providerId === "google";
  });
}

export function OnboardingFlow() {
  const [urlBillingPlan, setUrlBillingPlan] = useState<UrlBillingPlan | null>(() =>
    typeof window !== "undefined" ? parseBillingPlanFromSearch(window.location.search) : null
  );
  const [isGoogleSession, setIsGoogleSession] = useState(false);
  const [billingGatePassed, setBillingGatePassed] = useState(() => {
    if (typeof window === "undefined") return true;
    return !parseBillingPlanFromSearch(window.location.search);
  });

  const resolvedStep3Fields = useMemo(() => {
    if (urlBillingPlan && !isGoogleSession) return [] as readonly string[];
    return [...step3FieldsAll];
  }, [urlBillingPlan, isGoogleSession]);

  const tablesFixedCount = urlBillingPlan != null ? planToTableCount(urlBillingPlan) : null;

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
  const [onboardingPhase, setOnboardingPhase] = useState<
    "details_pending" | "menu_required" | "completed"
  >(saved.current.onboardingPhase);
  const [menuImportState, setMenuImportState] = useState<MenuImportStatus>("idle");
  const [menuImportError, setMenuImportError] = useState<string | null>(null);
  const menuImportedFileKeyRef = useRef<string | null>(null);
  const menuFileKeyCacheRef = useRef<WeakMap<File, string>>(new WeakMap());
  const menuReplacePromiseRef = useRef<Promise<void> | null>(null);

  // OTP verification step state (email confirmation after signUp)
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const otpCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const forceMenu = q.get("menu") === "1";
    if (!forceMenu) return;
    setCurrentStep(3);
    setSubStep(0);
    setShowReview(false);
  }, []);

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
            onboardingPhase,
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
    onboardingPhase,
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

  // Billing funnel: require active entitlement + session when ?plan=starter|professional
  useEffect(() => {
    let cancelled = false;
    async function gate() {
      const plan = parseBillingPlanFromSearch(window.location.search);
      if (!plan) {
        setBillingGatePassed(true);
        return;
      }
      if (!supabase) {
        setBillingGatePassed(true);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setIsGoogleSession(false);
        const m = getMarketingOriginForRedirect();
        window.location.href = `${m}/checkout?plan=${plan}`;
        return;
      }
      if (!cancelled) {
        setIsGoogleSession(isGoogleAuthSession(session));
      }

      const q = new URLSearchParams(
        window.location.search.startsWith("?")
          ? window.location.search.slice(1)
          : window.location.search,
      );
      const billingSuccess = q.get("billing") === "success";
      const deadline = Date.now() + (billingSuccess ? 45_000 : 0);
      const intervalMs = 1000;

      let ent: { plan_tier: string; status: string } | null = null;
      let active = false;

      do {
        if (cancelled) return;
        const { data } = await supabase
          .from("saas_entitlements")
          .select("plan_tier,status")
          .eq("user_id", session.user.id)
          .maybeSingle();
        ent = data ?? null;
        active = Boolean(
          ent &&
            (ent.status === "active" || ent.status === "trialing") &&
            ent.plan_tier === plan,
        );
        if (active) break;
        if (!billingSuccess || Date.now() >= deadline) break;
        await new Promise((r) => setTimeout(r, intervalMs));
      } while (billingSuccess);

      if (!active) {
        const m = getMarketingOriginForRedirect();
        window.location.href = `${m}/checkout?plan=${plan}`;
        return;
      }
      if (!cancelled) {
        setBillingGatePassed(true);
        setFormData((f) => ({
          ...f,
          email: session.user.email ?? f.email,
          tables: String(planToTableCount(plan)),
        }));
      }
    }
    void gate();
    return () => {
      cancelled = true;
    };
  }, []);

  const getTotalSubSteps = () => {
    if (currentStep === 1) return step1Fields.length;
    if (currentStep === 2) return Math.max(1, resolvedStep3Fields.length);
    if (currentStep === 3) return 1;
    return 1;
  };

  // Cleanup OTP cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (otpCooldownRef.current) clearInterval(otpCooldownRef.current);
    };
  }, []);

  const startOtpResendCooldown = useCallback(() => {
    setOtpResendCooldown(60);
    otpCooldownRef.current = setInterval(() => {
      setOtpResendCooldown((prev) => {
        if (prev <= 1) {
          if (otpCooldownRef.current) clearInterval(otpCooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

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
      const fieldKey = resolvedStep3Fields[subStep];
      if (!fieldKey) return false;
      return validate(fieldKey, formData[fieldKey as keyof FormData]).valid;
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
    resolvedStep3Fields,
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
        if (resolvedStep3Fields.length === 0) {
          setCurrentStep(3);
          setSubStep(0);
        } else {
          setCurrentStep(2);
          setSubStep(0);
        }
      }
    } else if (currentStep === 2) {
      if (subStep < resolvedStep3Fields.length - 1) {
        setSubStep((s) => s + 1);
      } else {
        if (persistCompleted) {
          setCurrentStep(3);
          setSubStep(0);
        } else {
          setShowReview(true);
        }
      }
    } else if (currentStep === 3) {
      setShowReview(true);
    }
  }, [currentStep, subStep, returnToReview, resolvedStep3Fields.length, persistCompleted]);

  const goBack = useCallback(() => {
    if (persistCompleted && currentStep === 3 && !showReview) {
      return;
    }
    setDirection(-1);
    if (isComplete) {
      setIsComplete(false);
      setShowReview(true);
      return;
    }
    if (showReview) {
      setShowReview(false);
      if (persistCompleted) {
        setCurrentStep(3);
        setSubStep(0);
      } else {
        setCurrentStep(2);
        setSubStep(Math.max(0, resolvedStep3Fields.length - 1));
      }
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
      if (resolvedStep3Fields.length === 0) {
        setCurrentStep(1);
        setSubStep(step1Fields.length - 1);
      } else {
        setCurrentStep(2);
        setSubStep(resolvedStep3Fields.length - 1);
      }
    }
  }, [currentStep, subStep, isComplete, showReview, resolvedStep3Fields.length, persistCompleted]);

  const handleSwipeNext = useCallback(() => {
    if (canSwipeNext()) {
      goNext();
    }
  }, [canSwipeNext, goNext]);

  const handleSwipeBack = useCallback(() => {
    if (persistCompleted && currentStep === 3 && !showReview) return;
    if (currentStep > 1 || subStep > 0 || showReview) {
      goBack();
    }
  }, [currentStep, subStep, goBack, showReview, persistCompleted]);

  const canGoBack =
    (currentStep > 1 || subStep > 0 || isComplete || showReview) &&
    !(persistCompleted && currentStep === 3 && !showReview);

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
      const result = await persistOnboardingToSupabase(formData, {
        skipAuthSignup: urlBillingPlan != null,
        tableCountOverride:
          urlBillingPlan != null ? planToTableCount(urlBillingPlan) : undefined,
      });
      if (result.error && result.error !== "Supabase not configured") {
        toast.error(result.error);
        setShowSetupLoading(false);
        setIsSubmitting(false);
        return;
      }
      if (result.needsEmailConfirmation && !result.restaurantId) {
        // Email confirmation required — show in-app OTP step
        setShowSetupLoading(false);
        setShowReview(false);
        setIsSubmitting(false);
        setOtpValue("");
        setOtpError(null);
        setShowOtpStep(true);
        startOtpResendCooldown();
        return;
      }
      restaurantId = result.restaurantId;
      needsEmailConfirmation = result.needsEmailConfirmation;
      setTenantRestaurantId(restaurantId);
      setTenantNeedsEmailConfirmation(needsEmailConfirmation);
      setPersistCompleted(true);
      setOnboardingPhase("menu_required");
      setShowSetupLoading(false);
      setShowReview(false);
      setCurrentStep(3);
      setSubStep(0);
      setIsSubmitting(false);
      toast.success("Details saved. Upload your menu to finish onboarding.");
      return;
    }

    if (!menuPdfFile) {
      setShowSetupLoading(false);
      setShowReview(false);
      setCurrentStep(3);
      setSubStep(0);
      setIsSubmitting(false);
      toast.error("Upload your menu PDF to complete onboarding.");
      return;
    }

    const apiBaseOk = Boolean(import.meta.env.VITE_API_BASE_URL?.trim());
    const origin = getCustomerAppOriginFromEnv();
    const tableCount =
      urlBillingPlan != null
        ? planToTableCount(urlBillingPlan)
        : Math.min(50, Math.max(1, parseInt(formData.tables, 10) || 5));
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
      const sessionToken = accessToken!;
      const rid = restaurantId!;
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
            sessionToken,
            rid,
            formData.restaurantName
          );
          setSetupActiveStep(1);
          setSetupStatusMessage("Extracting menu items...");
          setSetupProgressPct(50);
          await runReplaceMenu(rid, extracted, sessionToken);
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
      const sessionToken = accessToken!;
      const rid = restaurantId!;
      try {
        setSetupActiveStep(3);
        setSetupStatusMessage("Finalizing dashboard...");
        setSetupProgressPct(80);
        const qrRes = await generateTableQr(
          { restaurantId: rid, tableCount, origin },
          sessionToken
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
            .eq("restaurant_id", rid)
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
    setOnboardingPhase("completed");

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
    urlBillingPlan,
    onboardingPhase,
  ]);

  const handleOtpVerify = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setOtpError(null);
      if (!supabase) {
        setOtpError("Supabase is not configured.");
        return;
      }
      if (otpValue.length !== 6) {
        setOtpError("Enter the 6-digit code from your email.");
        return;
      }
      setOtpBusy(true);
      try {
        const errMsg = await verifySignupOtp(supabase, formData.email.trim(), otpValue);
        if (errMsg) throw new Error(errMsg);

        // Email verified — run the full persist now that a session exists
        setShowOtpStep(false);
        setShowSetupLoading(true);
        setSetupCompleted(false);
        setSetupActiveStep(0);
        setSetupStatusMessage("Creating your restaurant...");
        setSetupProgressPct(5);

        const result = await persistOnboardingToSupabase(formData, {
          skipAuthSignup: urlBillingPlan != null,
          tableCountOverride:
            urlBillingPlan != null ? planToTableCount(urlBillingPlan) : undefined,
        });

        if (result.error) {
          toast.error(result.error);
          setShowSetupLoading(false);
          setOtpBusy(false);
          return;
        }

        setTenantRestaurantId(result.restaurantId);
        setTenantNeedsEmailConfirmation(false);
        setPersistCompleted(true);
        setOnboardingPhase("menu_required");
        setShowSetupLoading(false);
        setCurrentStep(3);
        setSubStep(0);
        toast.success("Email verified! Details saved. Upload your menu to finish onboarding.");
      } catch (err) {
        setOtpError(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setOtpBusy(false);
      }
    },
    [otpValue, formData, urlBillingPlan]
  );

  const handleOtpResend = useCallback(async () => {
    setOtpError(null);
    if (!supabase) return;
    setOtpBusy(true);
    try {
      const errMsg = await resendSignupOtp(supabase, formData.email.trim());
      if (errMsg) throw new Error(errMsg);
      startOtpResendCooldown();
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setOtpBusy(false);
    }
  }, [formData.email, startOtpResendCooldown]);

  const renderContent = () => {
    const key = `${currentStep}-${subStep}`;

    if (showOtpStep) {
      return (
        <motion.div
          key="otp-step"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.22 }}
          className="space-y-6"
        >
          <div>
            <p className="text-base font-semibold text-gray-900 mb-1">Verify your email</p>
            <p className="text-sm text-gray-500">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-gray-700">{formData.email}</span>. Enter it below
              to confirm your account.
            </p>
          </div>
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={setOtpValue}
                disabled={otpBusy}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {otpError && <p className="text-sm text-red-600 text-center">{otpError}</p>}
            <button
              type="submit"
              disabled={otpBusy || otpValue.length !== 6}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#f97316" }}
            >
              {otpBusy ? "Verifying…" : "Verify email"}
            </button>
          </form>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleOtpResend}
              disabled={otpBusy || otpResendCooldown > 0}
              className="font-medium disabled:cursor-not-allowed"
              style={{ color: otpResendCooldown > 0 ? "#9ca3af" : "#f97316" }}
            >
              {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOtpStep(false);
                setOtpValue("");
                setOtpError(null);
                setShowReview(true);
              }}
              className="text-gray-500 hover:text-gray-800"
            >
              ← Back
            </button>
          </div>
        </motion.div>
      );
    }

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
          hidePasswordRow={urlBillingPlan != null && !isGoogleSession}
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
          readOnly={field.key === "email" && urlBillingPlan != null}
        />
      );
    }

    if (currentStep === 2) {
      const fieldKey = resolvedStep3Fields[subStep] as "tables" | "password" | undefined;
      if (!fieldKey) return null;
      return (
        <DashboardSetup
          key={key}
          field={fieldKey}
          value={formData[fieldKey]}
          onChange={(v) => updateField(fieldKey, v)}
          onNext={goNext}
          direction={direction}
          tablesFixedCount={fieldKey === "tables" ? tablesFixedCount : null}
        />
      );
    }

    if (currentStep === 3) {
      const apiBaseOk = Boolean(import.meta.env.VITE_API_BASE_URL?.trim());
      return (
        <MenuUpload
          key={key}
          onNext={persistCompleted ? () => void handleConfirmReview() : goNext}
          direction={direction}
          menuPdfFile={menuPdfFile}
          onMenuPdfChange={setMenuPdfFile}
          importStatus={menuImportState}
          importError={menuImportError}
          needsSessionForImport={
            Boolean(tenantNeedsEmailConfirmation && menuPdfFile && tenantRestaurantId)
          }
          apiNotConfigured={Boolean(menuPdfFile && tenantRestaurantId && !apiBaseOk)}
          submitLabel={persistCompleted ? "Upload menu and finish" : "Continue"}
        />
      );
    }

    return null;
  };

  if (urlBillingPlan && !billingGatePassed) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fff1e6 100%)" }}
      >
        <Toaster position="top-center" />
        <img src={ratolabsLogo40} alt="Ratolabs" width={40} height={40} className="mb-4 animate-pulse" />
        <p className="text-sm text-gray-500">Verifying your subscription…</p>
      </div>
    );
  }

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
          <img src={ratolabsLogo} alt="Ratolabs" width={36} height={36} />
          <img src={ratolabsWordmark} alt="" aria-hidden={true} height={16} />
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl shadow-orange-900/5 p-6 sm:p-8 relative"
        >
          {/* Header */}
          {!isComplete && !showReview && !showOtpStep && (
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
            enabled={!isComplete && !showReview && !showOtpStep}
          >
            <div className={`overflow-hidden relative ${showReview ? "" : "min-h-[280px]"}`}>
              <AnimatePresence mode="wait" initial={false}>
                {renderContent()}
              </AnimatePresence>
            </div>
          </SwipeContainer>

          {/* Swipe hint */}
          {!isComplete && !showReview && !showOtpStep && (
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
        {!isComplete && !showReview && !showOtpStep && (
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