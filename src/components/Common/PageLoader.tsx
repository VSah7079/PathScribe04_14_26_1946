// src/components/Common/PageLoader.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 548 (PS-539 phase 2d): shown while a page's code loads (the Suspense
// fallback in App.tsx and SignedInApp.tsx, which each had their own copy).
// The spinner waits 300 ms, so a quick page never flashes it, and from 3 s it
// says the page is still loading (services/connectivity/latencyStates.ts).
// Batch 563: one loader that replaces another (a cold start loads the code in
// two steps) keeps counting from the first, so "still loading" doesn't vanish
// and come back (services/connectivity/pageWaitClock.ts).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLoadingPhase } from '@/hooks/useLoadingPhase';
import { pageWaitClock } from '@/services/connectivity/pageWaitClock';

export const PageLoader: React.FC = () => {
  const { t } = useTranslation();
  // Started and ended in one effect, so a mount that React runs twice (development) stays balanced.
  // The first render already counts from where the wait stands (peek), so a replacing loader shows "still
  // loading" at once instead of rendering an empty live region first.
  const [startedAt, setStartedAt] = useState<number>(() => pageWaitClock.peek(Date.now()));
  useEffect(() => {
    setStartedAt(pageWaitClock.start(Date.now()));
    return () => pageWaitClock.end(Date.now());
  }, []);
  const phase = useLoadingPhase(startedAt);
  if (phase === 'hidden') return null;
  return (
    <div className="ps-app-loader-overlay" role="status" aria-live="polite">
      <div className="ps-app-loader-spinner" aria-hidden="true" />
      {phase === 'skeleton' && <span className="ps-sr-only">{t('loadingState.page')}</span>}
      {phase === 'slow' && <div className="ps-app-loader-slow">{t('loadingState.slowPage')}</div>}
    </div>
  );
};
