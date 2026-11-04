// src/hooks/useSystemStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669h (footer): the system status the Home footer shows. Checks once when the page loads and again
// when the tab becomes visible after 5 minutes (HEALTH_RECHECK_AFTER_MS); there is no timer. A failed check
// is "statusUnavailable", never "operational". The decision rules are in services/healthStatus.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { healthStatusService, footerStatusKind, shouldRecheck, type FooterPhase, type FooterStatusKind, type HealthStatus, type IHealthStatusService } from '@/services';

export interface SystemStatusView {
  kind: FooterStatusKind;
  /** True when the answer is the demo's stand-in, not a real check. */
  simulated: boolean;
}

export function useSystemStatus(service: IHealthStatusService = healthStatusService, now: () => number = Date.now): SystemStatusView {
  const [phase, setPhase] = useState<FooterPhase>('checking');
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const lastCheckedAt = useRef<number | null>(null);
  const running = useRef(false);
  const alive = useRef(true);
  // The latest service/clock, so a new object each render never restarts the checks.
  const serviceRef = useRef(service);
  serviceRef.current = service;
  const nowRef = useRef(now);
  nowRef.current = now;

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    let next: HealthStatus | null = null;
    try {
      const r = await serviceRef.current.check();
      next = r.ok ? r.data : null;
    } catch {
      next = null;
    }
    running.current = false;
    lastCheckedAt.current = nowRef.current();
    if (!alive.current) return;
    setStatus(next);
    setPhase(next ? 'ready' : 'failed');
  }, []);

  useEffect(() => {
    alive.current = true;
    void run();
    const onVisible = () => {
      if (shouldRecheck(lastCheckedAt.current, nowRef.current(), document.visibilityState === 'visible')) void run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive.current = false; document.removeEventListener('visibilitychange', onVisible); };
  }, [run]);

  return { kind: footerStatusKind(phase, status), simulated: !!status?.simulated && phase !== 'failed' };
}
