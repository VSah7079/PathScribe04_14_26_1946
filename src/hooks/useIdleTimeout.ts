// src/hooks/useIdleTimeout.ts
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 of the Inactivity Timeout & Draft Recovery spec (see PRIORITY_FIXES.md).
// Tracks real user activity (mouse, keyboard, scroll, touch) and exposes when
// a warning should show and when the session should actually expire.
//
// Deliberately does NOT itself call logout() or navigate anywhere -- this
// hook only reports state; the caller (ProtectedRoute) decides what to do
// with it. Keeps this hook reusable/testable independent of auth wiring.
//
// Timeout DURATION is resolved via services/session/mockSessionTimeoutService.ts
// -- org default, overridden per the currently-open case's performing lab
// if one has a stricter/looser value set. Starts with a hardcoded fallback
// (15 min) immediately (no flash of an undefined duration while the async
// resolution runs), then refines once that resolves. Re-resolves whenever
// the case in the URL changes, not on every path change (e.g. switching
// tabs within the same case shouldn't re-trigger a lookup).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { caseRouter } from '@/services/cases/CaseRouter';
import { extractCaseIdFromPath } from '@/services/session/ISessionTimeoutService';
import { mockSessionTimeoutService } from '@/services/session/mockSessionTimeoutService';

const WARNING_WINDOW_SECONDS = 60;
const FALLBACK_MINUTES = 15; // used only until the real org default resolves async

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click',
];

interface UseIdleTimeoutResult {
  /** True once the warning window has begun -- show the warning modal. */
  showWarning: boolean;
  /** Counts down from WARNING_WINDOW_SECONDS while showWarning is true. */
  secondsRemaining: number;
  /** True the instant the full idle timeout elapses -- caller should log out. */
  expired: boolean;
  /** Call when the user clicks "Stay Logged In" -- resets everything. */
  stayLoggedIn: () => void;
}

export function useIdleTimeout(enabled: boolean): UseIdleTimeoutResult {
  const location = useLocation();
  const caseId = extractCaseIdFromPath(location.pathname);

  const [effectiveMinutes, setEffectiveMinutes] = useState<number>(FALLBACK_MINUTES);
  const [showWarning, setShowWarning]           = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_WINDOW_SECONDS);
  const [expired, setExpired]                   = useState(false);

  const warningTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Resolve the effective timeout for the currently-open case ──────────────
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    if (!caseId) {
      mockSessionTimeoutService.getOrgDefault().then(res => {
        if (!cancelled && res.ok) setEffectiveMinutes(res.data);
      });
      return () => { cancelled = true; };
    }

    caseRouter.getCase(caseId).then(async (caseData) => {
      if (cancelled) return;
      const orderingClientId = (caseData as any)?.order?.clientId as string | undefined;
      const res = await mockSessionTimeoutService.resolveEffectiveMinutes(orderingClientId);
      if (!cancelled && res.ok) setEffectiveMinutes(res.data);
    }).catch(async () => {
      if (cancelled) return;
      const res = await mockSessionTimeoutService.getOrgDefault();
      if (!cancelled && res.ok) setEffectiveMinutes(res.data);
    });

    return () => { cancelled = true; };
  }, [enabled, caseId]);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current)    clearInterval(countdownRef.current);
    warningTimerRef.current = null;
    countdownRef.current    = null;
  }, []);

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true);
    setSecondsRemaining(WARNING_WINDOW_SECONDS);
    countdownRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    setSecondsRemaining(WARNING_WINDOW_SECONDS);
    const msUntilWarning = Math.max(0, effectiveMinutes * 60 - WARNING_WINDOW_SECONDS) * 1000;
    warningTimerRef.current = setTimeout(startWarningCountdown, msUntilWarning);
  }, [clearTimers, startWarningCountdown, effectiveMinutes]);

  const stayLoggedIn = useCallback(() => {
    setExpired(false);
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!enabled) { clearTimers(); return; }

    // Activity only resets the timer BEFORE the warning has shown -- once
    // the warning is up, only an explicit "Stay Logged In" click should
    // reset it. Otherwise moving the mouse while genuinely away from the
    // desk (a monitor saver nudging the mouse, a cat walking across the
    // keyboard) would silently defeat the whole point of the warning.
    const handleActivity = () => {
      if (!showWarning) resetIdleTimer();
    };

    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, handleActivity));
    resetIdleTimer();

    return () => {
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, handleActivity));
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, effectiveMinutes]);

  return { showWarning, secondsRemaining, expired, stayLoggedIn };
}
