// src/utils/deviceDetection.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real device-restriction check for the Intraop Queue mobile/OR workflow.
//
// Deliberately combines two signals, not just viewport width alone — a
// direct response to a real gap Pete caught: a narrow *window* isn't the
// same thing as a narrow *device*. A desktop user who shrinks their
// browser still has a mouse or trackpad (a "fine" pointer); an actual
// phone or tablet has a "coarse" (touch) pointer. Checking both together
// means a resized desktop window does NOT trigger the restriction, while
// a real phone at the same width correctly does.
//
// Known, honest limitation: hybrid devices (a touchscreen laptop, a
// tablet with a mouse/trackpad attached) can report pointer type
// ambiguously depending on the OS/browser — no client-side heuristic is
// perfect here. This is a UX decision (which UI fits the screen), not a
// security boundary, so an imperfect edge case is an acceptable
// trade-off — see the sessionStorage override below for the escape
// hatch when the heuristic gets it wrong.
// ─────────────────────────────────────────────────────────────────────────────

const MOBILE_WIDTH_BREAKPOINT = 768;

/** True only for a real, narrow, touch-primary device — not a resized
 *  desktop browser window. */
export function isConstrainedMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const narrow = window.innerWidth < MOBILE_WIDTH_BREAKPOINT;
  const coarsePointer = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  return narrow && coarsePointer;
}

const DESKTOP_VIEW_OVERRIDE_KEY = 'pathscribe:desktopViewOverride';

/** User-initiated escape hatch ("Switch to Full Desktop View") — real,
 *  deliberate override for the rare case the heuristic above gets it
 *  wrong. sessionStorage, not localStorage: clears when the tab/browser
 *  closes, so it can't silently become a permanent bypass on a shared
 *  or kiosk-style device — each new session re-evaluates the real
 *  device signal fresh. */
export function hasDesktopViewOverride(): boolean {
  try {
    return sessionStorage.getItem(DESKTOP_VIEW_OVERRIDE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDesktopViewOverride(): void {
  try {
    sessionStorage.setItem(DESKTOP_VIEW_OVERRIDE_KEY, '1');
  } catch { /* sessionStorage unavailable (e.g. private browsing edge cases) — degrade to no override, not a crash */ }
}

/** Real fix for a genuine, reported gap: setDesktopViewOverride() existed
 *  with no way to reverse it - once a user switched to the full desktop
 *  view, there was no way back to the focused, Intraop-only experience
 *  for the rest of that session. This is the missing other half. */
export function clearDesktopViewOverride(): void {
  try {
    sessionStorage.removeItem(DESKTOP_VIEW_OVERRIDE_KEY);
  } catch { /* sessionStorage unavailable — degrade to no-op, not a crash */ }
}

/** The real, combined check a route guard should use: restrict only when
 *  this is genuinely a constrained device AND the user hasn't explicitly
 *  opted into the full desktop view for this session. */
export function shouldRestrictToMobileWorkflow(): boolean {
  return isConstrainedMobileDevice() && !hasDesktopViewOverride();
}
