// src/services/healthStatus/healthStatusContract.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669h (footer): the wire contract and rules for the Home footer's system
// status (docs/architecture/HEALTH_STATUS_API.md). The server checks four fixed
// components and DECIDES the overall state; the browser only shows it. The
// answer carries states and a time, never patient data or free text.
// ─────────────────────────────────────────────────────────────────────────────

export const HEALTH_STATES = ['operational', 'degraded', 'unavailable'] as const;
export type HealthState = (typeof HEALTH_STATES)[number];

/** The only components the server reports (no others are accepted). */
export const HEALTH_COMPONENTS = ['database', 'messaging', 'queues', 'interfaceEngine'] as const;
export type HealthComponent = (typeof HEALTH_COMPONENTS)[number];

export interface HealthStatus {
  /** Decided by the server from the components. */
  overall: HealthState;
  components: Record<HealthComponent, HealthState>;
  /** ISO time the server made the check. */
  checkedAt: string;
  /** True only for the demo's stand-in (no API server): nothing was really checked. */
  simulated?: boolean;
}

/** After this long hidden, a tab that becomes visible checks again. Never a timer. */
export const HEALTH_RECHECK_AFTER_MS = 5 * 60 * 1000;

const isState = (v: unknown): v is HealthState => typeof v === 'string' && (HEALTH_STATES as readonly string[]).includes(v);

/**
 * Reads the server's answer strictly: all four components and the overall state must be known
 * values, otherwise null (shown as "Status unavailable", never as operational). Extra fields are dropped.
 */
export function parseHealthStatus(raw: unknown): HealthStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const comps = r.components as Record<string, unknown> | undefined;
  if (!isState(r.overall) || !comps || typeof comps !== 'object') return null;
  const components = {} as Record<HealthComponent, HealthState>;
  for (const c of HEALTH_COMPONENTS) {
    const s = comps[c];
    if (!isState(s)) return null;
    components[c] = s;
  }
  const checkedAt = typeof r.checkedAt === 'string' ? r.checkedAt : '';
  return { overall: r.overall, components, checkedAt };
}

/** What the footer is doing. */
export type FooterPhase = 'checking' | 'ready' | 'failed';
export type FooterStatusKind = 'checking' | HealthState | 'statusUnavailable';

/**
 * The footer's one state. A failed check is "statusUnavailable" (never operational); until the first answer
 * it is "checking". During a re-check the previous answer stays on screen.
 */
export function footerStatusKind(phase: FooterPhase, status: HealthStatus | null): FooterStatusKind {
  if (phase === 'failed') return 'statusUnavailable';
  return status ? status.overall : 'checking';
}

/** True when the tab has become visible and the last check is old enough (or there is none). */
export function shouldRecheck(lastCheckedAtMs: number | null, nowMs: number, visible: boolean): boolean {
  if (!visible) return false;
  if (lastCheckedAtMs === null) return true;
  return nowMs - lastCheckedAtMs >= HEALTH_RECHECK_AFTER_MS;
}
