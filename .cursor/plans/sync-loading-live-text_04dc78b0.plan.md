---
name: sync-loading-live-text
overview: Update `SetupLoadingScreen2` activity feed to include real-time workflow `statusMessage` updates so extraction text visibly progresses during menu import.
todos: []
isProject: false
---

# Sync SetupLoadingScreen2 live extraction text

## Goal

Ensure `SetupLoadingScreen2` shows continuously updating, workflow-synced text (e.g., uploading/extracting/organizing/finalizing) while menu extraction runs.

## Current gap

`OnboardingFlow` emits accurate real-time `setupStatusMessage`, but `SetupLoadingScreen2` activity lines are mostly inferred from step/progress and can appear static when progress updates are sparse.

## Implementation approach

- Keep existing controlled props (`activeStep`, `completed`, `progressPct`, `statusMessage`) and visual layout.
- Refactor `ActivityFeed` logic to merge:
  - context lines derived from `activeStep`/`progressPct`, and
  - the latest live `statusMessage` as the most recent activity line.
- De-duplicate messages when inferred line and `statusMessage` are similar.
- Preserve max visible lines (e.g., last 3) and existing animation behavior.
- For completion, append a final completion line only after `completed=true`.

## Files to update

- [D:/Downloads/restaurant_saas/apps/onboarding_flow/src/app/components/SetupLoadingScreen2.tsx](D:/Downloads/restaurant_saas/apps/onboarding_flow/src/app/components/SetupLoadingScreen2.tsx)

## Validation

- Trigger onboarding flow with menu PDF and confirm setup.
- Verify bottom activity feed updates when `statusMessage` changes in real workflow:
  - Uploading your menu...
  - Extracting menu items...
  - Organizing categories...
  - Finalizing dashboard...
- Confirm no duplicate/repetitive lines when step inference matches live status.
- Confirm completion text appears only after setup is complete.
- Run lint/build for onboarding flow after change.

## Notes

Use workflow messages as source of truth for user-facing “running text,” and keep inferred messages as fallback/context for smoother perceived activity.