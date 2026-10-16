// src/hooks/useConnectionBanner.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 548 (PS-539 phase 2d, readiness review §9 item 2): what the app-wide
// connection banner shows. Follows the browser's network (online / offline
// events) and the live-updates hub's state (liveUpdateService), and applies
// the rules in services/connectivity/latencyStates.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { liveUpdateService } from '@/services/liveUpdates/liveUpdateService';
import {
  LATENCY_LIMITS, connectionBanner, connectionProblem, type ConnectionBanner, type ConnectionProblem,
} from '@/services/connectivity/latencyStates';

export function useConnectionBanner(): ConnectionBanner {
  const [banner, setBanner] = useState<ConnectionBanner>('none');
  const track = useRef({ problem: 'none' as ConnectionProblem, since: null as number | null, shown: false, recoveredAt: null as number | null });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const evaluate = () => {
      const now = Date.now();
      const t = track.current;
      const problem = connectionProblem({
        browserOnline: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
        transport: liveUpdateService.transport,
        hub: liveUpdateService.getState(),
      });
      const hub = liveUpdateService.getState();
      if (problem !== 'none' && t.problem === 'none') {
        // A problem back while "reconnected" still shows (a flapping link): show it at once, no new grace period.
        const flapping = t.recoveredAt !== null && now - t.recoveredAt < LATENCY_LIMITS.reconnectedForMs;
        t.since = now; t.recoveredAt = null; t.shown = flapping;
      }
      if (problem === 'none' && t.problem !== 'none') {
        // "Reconnected" only when it really is: the hub is live again, or (no hub) the browser is back online.
        const reallyBack = liveUpdateService.transport === 'signalr' ? hub === 'live' : true;
        t.recoveredAt = t.shown && reallyBack ? now : null; t.since = null; t.shown = false;
      }
      t.problem = problem;
      const next = connectionBanner({ problem, problemSince: t.since, problemShown: t.shown, recoveredAt: t.recoveredAt, now });
      if (next === 'reconnecting' || next === 'offline') t.shown = true;
      setBanner(next);
      // Look again when the grace period or the "reconnected" notice ends.
      clearTimeout(timer);
      if (problem !== 'none' && !t.shown && t.since !== null) timer = setTimeout(evaluate, LATENCY_LIMITS.bannerGraceMs - (now - t.since) + 10);
      else if (next === 'reconnected' && t.recoveredAt !== null) timer = setTimeout(evaluate, LATENCY_LIMITS.reconnectedForMs - (now - t.recoveredAt) + 10);
    };
    const offState = liveUpdateService.onStateChange(evaluate);
    // Batch 549: the network back means the hub can try at once, not after its back-off.
    const onOnline = () => { liveUpdateService.retryNow(); evaluate(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', evaluate);
    evaluate();
    return () => {
      clearTimeout(timer);
      offState();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', evaluate);
    };
  }, []);

  return banner;
}
