// src/hooks/useLoadingPhase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 548 (PS-539 phase 2d): how long the calling component has been
// waiting, as a phase (services/connectivity/latencyStates.ts): hidden under
// 300 ms, a placeholder from 300 ms, "still working" from 3 s. Counted from
// when the component mounts, or (Batch 563) from `startedAt` when the caller
// knows the wait began earlier (the page loader, services/connectivity/pageWaitClock.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { LATENCY_LIMITS, loadingPhase, type LoadingPhase } from '@/services/connectivity/latencyStates';

export function useLoadingPhase(startedAt?: number): LoadingPhase {
  const [phase, setPhase] = useState<LoadingPhase>(() => loadingPhase(startedAt === undefined ? 0 : Date.now() - startedAt));
  useEffect(() => {
    const started = startedAt ?? Date.now();
    const update = () => setPhase(loadingPhase(Date.now() - started));
    update();
    const elapsed = Date.now() - started;
    const timers = [LATENCY_LIMITS.skeletonAfterMs, LATENCY_LIMITS.slowAfterMs].filter(ms => ms > elapsed).map(ms => setTimeout(update, ms - elapsed));
    return () => timers.forEach(clearTimeout);
  }, [startedAt]);
  return phase;
}
