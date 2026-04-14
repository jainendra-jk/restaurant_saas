import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { useWebsiteAuth } from "../../context/WebsiteAuthContext";
import { getOnboardingHref } from "../../utils/routeTargets";
import {
  loadWebsiteNotificationPrefs,
  saveWebsiteNotificationPrefs,
  type WebsiteNotificationPrefs,
} from "../../utils/websiteNotificationPrefs";
import { Eye, EyeOff } from "lucide-react";

/** Same toggle as admin NotificationsSlider: w-11 h-6 pill, orange when on, gray track when off. */
function NotificationToggle({
  checked,
  onCheckedChange,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
        checked ? "bg-[#f97316]" : "bg-switch-background"
      }`}
      aria-label={ariaLabel}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return parts[0]?.slice(0, 1).toUpperCase() ?? "?";
}

const MIN_PASSWORD_LEN = 8;

function accountIdentityFlags(user: User | null) {
  const identities = user?.identities ?? [];
  return {
    hasGoogle: identities.some((i) => i.provider === "google"),
    hasEmail: identities.some((i) => i.provider === "email"),
  };
}

type AuthClientWithLinkIdentity = {
  linkIdentity: (credentials: {
    provider: "google";
    options?: { redirectTo?: string };
  }) => Promise<{ error: { message: string } | null }>;
};

export function DashboardSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { primaryRestaurant, profileLoading, refreshProfile, entitlement, user } = useWebsiteAuth();
  const onboardingBase = getOnboardingHref().replace(/\/+$/, "");
  const onboardingHref = entitlement?.plan_tier
    ? `${onboardingBase}/?plan=${encodeURIComponent(entitlement.plan_tier)}`
    : onboardingBase;
  const completeOnboardingHref = `${onboardingHref}${onboardingHref.includes("?") ? "&" : "/?"}menu=1`;
  const menuImportCompleted = Boolean(primaryRestaurant?.menu_import_completed_at);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [fssaiNumber, setFssaiNumber] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<WebsiteNotificationPrefs>(() => loadWebsiteNotificationPrefs());
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { hasGoogle, hasEmail } = useMemo(() => accountIdentityFlags(user), [user]);

  const patchNotifPrefs = (patch: Partial<WebsiteNotificationPrefs>) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveWebsiteNotificationPrefs(next);
      return next;
    });
  };

  useEffect(() => {
    if (!primaryRestaurant) return;
    setName(primaryRestaurant.name ?? "");
    setEmail(primaryRestaurant.email ?? "");
    setPhone(primaryRestaurant.phone ?? "");
    setOwnerName(primaryRestaurant.owner_name ?? "");
    setAddressLine1(primaryRestaurant.address_line1 ?? "");
    setCity(primaryRestaurant.city ?? "");
    setStateName(primaryRestaurant.state ?? "");
    setPincode(primaryRestaurant.pincode ?? "");
    setGstNumber(primaryRestaurant.gst_number ?? "");
    setFssaiNumber(primaryRestaurant.fssai_number ?? "");
  }, [primaryRestaurant]);

  useEffect(() => {
    if (typeof window === "undefined" || !supabase) return;
    const hash = window.location.hash.replace(/^#/, "");
    const search = new URLSearchParams(window.location.search);
    const hashParams = hash ? new URLSearchParams(hash) : null;
    const errFromQuery = search.get("error");
    const errDescFromQuery = search.get("error_description");
    const errFromHash = hashParams?.get("error");
    const errDescFromHash = hashParams?.get("error_description");
    const accessFromHash = hashParams?.get("access_token");
    const refreshFromHash = hashParams?.get("refresh_token");

    if (errFromQuery || errFromHash) {
      const raw = errDescFromQuery || errDescFromHash || errFromQuery || errFromHash || "Could not connect Google.";
      toast.error(decodeURIComponent(raw.replace(/\+/g, " ")));
      navigate(`${location.pathname}${location.search}`, { replace: true });
      return;
    }
    if (accessFromHash || refreshFromHash) {
      toast.success("Google account connected.");
      navigate(`${location.pathname}${location.search}`, { replace: true });
      void refreshProfile();
    }
  }, [location.pathname, location.search, location.hash, refreshProfile, navigate]);

  const handleConnectGoogle = async () => {
    if (!supabase) return;
    setLinkError(null);
    setLinkBusy(true);
    try {
      const redirectTo = `${window.location.origin}/dashboard/settings`;
      const auth = supabase.auth as unknown as AuthClientWithLinkIdentity;
      const { error } = await auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw new Error(error.message);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "Could not start Google linking");
      setLinkBusy(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!supabase || !user?.email) {
      setPasswordError("Supabase is not configured or account email is missing.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LEN) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (hasEmail) {
      if (!currentPassword) {
        setPasswordError("Enter your current password.");
        return;
      }
    }
    setPasswordBusy(true);
    try {
      if (hasEmail) {
        const verify = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (verify.error) throw new Error("Current password is incorrect");
      }
      const updated = await supabase.auth.updateUser({ password: newPassword });
      if (updated.error) throw new Error(updated.error.message || "Failed to update password");
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleSave = async () => {
    if (!supabase || !primaryRestaurant) return;
    setSaveError(null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          owner_name: ownerName.trim() || null,
          address_line1: addressLine1.trim() || null,
          city: city.trim() || null,
          state: stateName.trim() || null,
          pincode: pincode.trim() || null,
          gst_number: gstNumber.trim() || null,
          fssai_number: fssaiNumber.trim() || null,
        })
        .eq("id", primaryRestaurant.id);
      if (error) throw error;
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const accountSecurityCards =
    user && supabase ? (
      <>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-gray-900 mb-1" style={{ fontSize: 14, fontWeight: 700 }}>
            Connected accounts
          </h2>
          <p className="text-gray-400 mb-5" style={{ fontSize: 12 }}>
            Link Google to the same account so sign-in methods share one profile and subscription.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>
                Account email
              </label>
              <input
                type="email"
                value={user.email ?? ""}
                readOnly
                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 cursor-default"
                style={{ fontSize: 13 }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-700" style={{ fontSize: 13, fontWeight: 600 }}>
                Google
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                  hasGoogle ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                {hasGoogle ? "Connected" : "Not connected"}
              </span>
            </div>
            {hasGoogle && hasEmail && (
              <p className="text-gray-500" style={{ fontSize: 12 }}>
                You can sign in with Google or email on apps that support both.
              </p>
            )}
            {hasGoogle && !hasEmail && (
              <p className="text-gray-500" style={{ fontSize: 12 }}>
                Google is linked. Adding a password below is optional and lets you use email sign-in where supported.
              </p>
            )}
            {hasEmail && !hasGoogle && (
              <div className="pt-1">
                {linkError && <p className="text-sm text-red-600 mb-2">{linkError}</p>}
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={linkBusy}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {linkBusy ? "Redirecting…" : "Connect Google"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-gray-900 mb-1" style={{ fontSize: 14, fontWeight: 700 }}>
            Change password
          </h2>
          {!hasEmail && hasGoogle && (
            <p className="text-gray-500 mb-4" style={{ fontSize: 12 }}>
              Optional: set a password to sign in with email on the admin dashboard and other apps that use email login.
            </p>
          )}
          {hasEmail && (
            <p className="text-gray-400 mb-4" style={{ fontSize: 12 }}>
              Enter your current password, then choose a new one.
            </p>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {hasEmail && (
              <div>
                <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  style={{ fontSize: 13 }}
                />
              </div>
            )}
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>
                New password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  style={{ fontSize: 13 }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                  style={{ fontSize: 13 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <button
              type="submit"
              disabled={passwordBusy}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-50"
            >
              {passwordBusy ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </>
    ) : null;

  if (profileLoading) {
    return <div className="max-w-3xl mx-auto text-gray-400 text-sm py-12">Loading…</div>;
  }

  if (!primaryRestaurant) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2" style={{ fontSize: 22, fontWeight: 800 }}>Settings</h1>
          <p className="text-gray-500 mb-6" style={{ fontSize: 14 }}>
            Link a restaurant via onboarding to edit profile details.
          </p>
        </div>
        {accountSecurityCards && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {accountSecurityCards}
          </motion.div>
        )}
        <a
          href={onboardingHref}
          className="inline-flex bg-[#f97316] hover:bg-[#ea580c] text-white px-6 py-3 rounded-xl font-semibold text-sm"
        >
          Go to onboarding
        </a>
      </div>
    );
  }

  const avatar = initialsFromName(name || primaryRestaurant.name);

  return (
    <div className="max-w-3xl mx-auto">
      {!menuImportCompleted && primaryRestaurant && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-amber-900 text-sm mb-2">
            Complete onboarding to finish menu setup.
          </p>
          <a
            href={completeOnboardingHref}
            className="inline-flex bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-2 rounded-lg font-semibold text-xs"
          >
            Complete onboarding
          </a>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1" style={{ fontSize: 22, fontWeight: 800 }}>Settings</h1>
        <p className="text-gray-400" style={{ fontSize: 13 }}>Manage your restaurant profile.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {accountSecurityCards}

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-gray-900 mb-5" style={{ fontSize: 14, fontWeight: 700 }}>Restaurant profile</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
              <span className="text-[#f97316]" style={{ fontSize: 24, fontWeight: 800 }}>{avatar}</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>Restaurant name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>Owner name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                style={{ fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-gray-900 mb-5" style={{ fontSize: 14, fontWeight: 700 }}>Address</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>Address line 1</label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>State</label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                style={{ fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-gray-900 mb-5" style={{ fontSize: 14, fontWeight: 700 }}>Business details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>GST number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: 12, fontWeight: 500 }}>FSSAI number</label>
              <input
                type="text"
                value={fssaiNumber}
                onChange={(e) => setFssaiNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316]"
                style={{ fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-gray-900 mb-4" style={{ fontSize: 14, fontWeight: 700 }}>Notifications</h2>
          <div className="space-y-0 divide-y divide-gray-100">
            <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-gray-900" style={{ fontSize: 13, fontWeight: 600 }}>
                  Weekly reports
                </p>
                <p className="text-gray-400 mt-0.5" style={{ fontSize: 11 }}>
                  Coming soon — summaries of performance.
                </p>
              </div>
              <NotificationToggle
                checked={notifPrefs.weeklyReports}
                onCheckedChange={(v) => patchNotifPrefs({ weeklyReports: v })}
                ariaLabel={notifPrefs.weeklyReports ? "Disable weekly reports" : "Enable weekly reports"}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-gray-900" style={{ fontSize: 13, fontWeight: 600 }}>
                  Marketing emails
                </p>
                <p className="text-gray-400 mt-0.5" style={{ fontSize: 11 }}>
                  Tips and updates from QResto (manage via email preferences).
                </p>
              </div>
              <NotificationToggle
                checked={notifPrefs.marketingEmails}
                onCheckedChange={(v) => patchNotifPrefs({ marketingEmails: v })}
                ariaLabel={notifPrefs.marketingEmails ? "Disable marketing emails" : "Enable marketing emails"}
              />
            </div>
          </div>
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 ${
              saved
                ? "bg-green-500 text-white"
                : "bg-[#f97316] hover:bg-[#ea580c] text-white hover:shadow-lg hover:shadow-orange-200 disabled:opacity-50"
            }`}
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
