import { getOnboardingUrl } from '../utils/accessRouting';

export function Setup() {
  const onboardingUrl = getOnboardingUrl();

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl text-gray-900 mb-2">Complete your onboarding</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your subscription is active, but your restaurant setup is not finished yet.
          Complete onboarding to unlock your dashboard.
        </p>

        {onboardingUrl ? (
          <a
            href={onboardingUrl}
            className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-primary text-white hover:brightness-95 transition-all"
          >
            Continue onboarding
          </a>
        ) : (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Onboarding URL is not configured. Set <code>VITE_ONBOARDING_FLOW_ORIGIN</code> to continue.
          </div>
        )}
      </div>
    </div>
  );
}
