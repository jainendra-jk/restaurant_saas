---
name: Tablet Slider Motion+Keyboard
overview: Add right-slide entry/exit animation for tablet overlay sliders and make overlay height keyboard-aware using visual viewport + internal scrolling, scoped to Tables and Settings overlays.
todos:
  - id: add-tablet-overlay-animation
    content: Add tablet overlay enter/exit animation (backdrop fade + panel slide-from-right) in `SliderLayout.tsx` without affecting desktop panel behavior.
    status: completed
  - id: add-keyboard-aware-height
    content: Implement visual-viewport-aware overlay height in `SliderLayout.tsx` with `innerHeight` fallback and resize listeners.
    status: completed
  - id: verify-tablet-ux
    content: Validate tablet animation and keyboard usability for Tables/Settings overlays; confirm desktop behavior unchanged and no lint errors.
    status: completed
isProject: false
---

# Tablet Slider Animation + Keyboard Responsiveness

## What is needed

For tablet overlay sliders (currently enabled in Tables/Settings), add:

- right-to-left slide-in/slide-out animation
- keyboard-safe sizing so form fields remain usable when tablet on-screen keyboard opens

## Target files

- `[apps/admin_dashboard/src/app/components/ui/SliderLayout.tsx](apps/admin_dashboard/src/app/components/ui/SliderLayout.tsx)`
- (No API/data changes required)

## Implementation plan

1. **Add overlay transition state in `SliderLayout`**
  - Keep the desktop side panel (`lg+`) untouched.
  - For overlay mode (`tabletOverlay` + `<lg`), render the overlay wrapper persistently during exit transitions (not only when `isOpen` is true).
  - Use transition classes for:
    - backdrop fade (`opacity-0 -> opacity-100`)
    - panel slide from right (`translate-x-full -> translate-x-0`) with smooth easing.
2. **Make overlay keyboard-aware on tablets**
  - In `SliderLayout`, track effective viewport height using `window.visualViewport?.height` when available, with `window.innerHeight` fallback.
  - Update on `visualViewport` `resize`/`scroll` and window resize events.
  - Apply this computed height to the overlay container (`style={{ height: ... }}`), so when keyboard opens, panel shrinks instead of being hidden behind keyboard.
3. **Keep internal scroll behavior (selected: both strategies)**
  - Preserve current `SliderShell` internal scroll (`overflow-y-auto`) so long forms remain reachable.
  - Ensure overlay panel wrapper uses `min-h-0` / `h-full` so body scrolling works correctly with reduced viewport height.
4. **Behavior checks**
  - Tablet (`md` to `<lg`): slider animates from right and dismisses with reverse animation.
  - Keyboard open on tablet: footer/inputs remain reachable via viewport-aware height + internal scrolling.
  - Desktop (`lg+`): existing sticky side-panel behavior remains unchanged.

## Verification checklist

- Open any slider in `Tables` and `Settings` on tablet width: confirm right-slide entry/exit.
- Focus a lower input (e.g., in profile/payments) with on-screen keyboard open: confirm slider remains usable and scrollable.
- Run lint diagnostics for edited file(s).

