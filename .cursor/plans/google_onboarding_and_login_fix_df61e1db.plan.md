---
name: Google onboarding and login fix
overview: Adjust onboarding to always show password for Google users even on paid plan URLs, and harden admin Google login to show a clear failure message when OAuth returns to login without a session.
todos:
  - id: onboarding-google-password-rule
    content: Change onboarding field/review logic so Google users see password even when ?plan is present
    status: completed
  - id: onboarding-persist-alignment
    content: Verify persistOnboarding still updates password in session path with new UI behavior
    status: completed
  - id: admin-oauth-return-error
    content: Add generic inline error when Google OAuth returns to login without session
    status: completed
  - id: admin-oauth-sanity
    content: Keep/adjust signInWithGoogle redirect behavior for deterministic login return
    status: completed
  - id: oauth-config-verify
    content: Verify Supabase/Google redirect and provider configuration plus manual smoke tests
    status: completed
isProject: false
---

# Google Onboarding Password + Admin OAuth Reliability

## Decisions confirmed

- Google users should see the **password field even in paid `?plan=` onboarding flow**.
- If admin Google OAuth returns to `/login` without session, show a **generic inline error** (not silent).

## Root causes observed

- In [`apps/onboarding_flow/src/app/components/OnboardingFlow.tsx`](apps/onboarding_flow/src/app/components/OnboardingFlow.tsx), password visibility is controlled by `urlBillingPlan`; when `?plan` exists, step-2 fields are emptied and review hides password.
- In admin OAuth flow, redirect currently returns to login; when session is missing (common redirect/provider config issue), UI has no dedicated post-OAuth failure handling.

## Implementation plan

1. **Onboarding password rule update (Google + paid flow)**
   - File: [`apps/onboarding_flow/src/app/components/OnboardingFlow.tsx`](apps/onboarding_flow/src/app/components/OnboardingFlow.tsx)
   - Add provider/session-derived boolean (e.g. `isGoogleSession`) from `supabase.auth.getSession()` user metadata/identities.
   - Change step field logic so Google users get `['tables','password']` even when `urlBillingPlan` exists.
   - Keep table count fixed by plan where needed, but do not suppress password for Google.
   - Update `ReviewScreen` prop (`hidePasswordRow`) to align with new condition.

2. **Keep persistence aligned with new UI**
   - File: [`apps/onboarding_flow/src/app/utils/persistOnboarding.ts`](apps/onboarding_flow/src/app/utils/persistOnboarding.ts)
   - Preserve current session-first branch and `updateUser({ password })` behavior.
   - Ensure password update still runs in Google/session path when password provided from onboarding.

3. **Admin Google OAuth return handling**
   - File: [`apps/admin_dashboard/src/app/pages/Login.tsx`](apps/admin_dashboard/src/app/pages/Login.tsx)
   - Add small post-return check on mount:
     - if URL indicates OAuth return (query/hash markers) and `requiresAuth()` true but no session/user after a short wait, show generic inline error (e.g. “Google login failed. Please try again.”).
   - Clear transient marker after showing message to avoid repeated alerts.

4. **Admin OAuth wiring sanity check**
   - File: [`apps/admin_dashboard/src/app/context/AuthContext.tsx`](apps/admin_dashboard/src/app/context/AuthContext.tsx)
   - Keep current `signInWithGoogle` safe redirect logic.
   - Optionally tighten `redirectTo` fallback to `/login` for deterministic return handling.

5. **Config verification checklist (non-code)**
   - Confirm Supabase Google provider enabled.
   - Confirm allowed redirect URLs include exact admin origin(s): `http://localhost:5174` (and any `127.0.0.1`/LAN/prod variants in use).
   - Confirm Google Cloud callback URL matches Supabase callback URL.

## Validation checklist

- Google user via paid `?plan=` onboarding sees password step + password row in review.
- Confirm onboarding persists password (`updateUser`) and later email/password login works.
- Admin “Continue with Google”:
  - success path logs in and exits `/login`.
  - failure path returns to `/login` and shows generic inline error.
- Existing email/password login remains unchanged.