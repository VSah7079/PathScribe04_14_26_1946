// src/services/cases/poolAssignmentTimeout.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 652: the Assignment Timeout (RoutingConfig.assignmentTimeoutSec, default 300 s, System > Case pool
// assignment) is "how long PathScribe waits for an assignment before routing the case to a pool". The setting was
// saved and shown, but nothing ever read it.
//
// What this does: a case that is still UNASSIGNED and NOT in a pool this long after grossing completed (so nobody
// accepted it, the LIS never assigned it, and the automatic routing at Gross Complete found nothing, was switched
// off or failed) is routed to its pool with the same routeCase() call Gross Complete uses. 0 means no wait.
//
// What this does NOT do: it never takes a case away from a pathologist who holds it (assignedTo set), and it does
// not delay the routing that already happens at Gross Complete. Whether Gross Complete should itself wait for this
// timeout is a decision for Pete (KNOWN_GAPS.md).
//
// Stateless on purpose: `expireUnassignedCases` is a plain function of the cases and the clock, so the same call can
// run from a scheduled server function later. `startAssignmentTimeoutSweep` is the thin browser scheduler the pool
// client uses until then (Pete, Oct 21: the front end should not hold background-process state; this is the one
// interim exception, and it keeps nothing but a list of case ids it already tried this session).
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import { getRoutingConfig, routeCase, type RoutingResult } from './casePoolAssignmentService';
import { auditService } from '../auditlog/auditServiceInstance';

export const ASSIGNMENT_SWEEP_INTERVAL_MS = 30_000;

/** Pure: has this case waited for an assignment longer than the timeout? */
export function assignmentWaitExpired(c: Pick<Case, 'status' | 'order' | 'grossCompletedAt'>, nowMs: number, timeoutSec: number): boolean {
  if (c.order?.assignedTo) return false;
  if (c.status === 'pool' || c.status === 'finalized') return false;
  if (!c.grossCompletedAt) return false;
  const started = Date.parse(c.grossCompletedAt);
  if (Number.isNaN(started)) return false;
  return nowMs - started >= Math.max(0, timeoutSec) * 1000;
}

export interface ExpireDeps {
  timeoutSec: () => number;
  routingEnabled: () => boolean;
  route: (c: Case) => Promise<RoutingResult>;
  audit: (entry: { type: 'system'; event: string; detail: string; user: string; caseId: string; confidence: null }) => Promise<unknown>;
  now: () => number;
}

const defaultDeps = (): ExpireDeps => ({
  timeoutSec: () => getRoutingConfig().assignmentTimeoutSec,
  routingEnabled: () => getRoutingConfig().enabled,
  route: routeCase,
  audit: entry => auditService.logEvent(entry),
  now: () => Date.now(),
});

export interface ExpireOutcome { routed: string[]; skipped: string[]; failed: string[] }

/** Route every case whose assignment wait has expired. `tried` (optional) keeps a case from being retried every tick. */
export async function expireUnassignedCases(cases: readonly Case[], deps: ExpireDeps = defaultDeps(), tried: Set<string> = new Set()): Promise<ExpireOutcome> {
  const out: ExpireOutcome = { routed: [], skipped: [], failed: [] };
  if (!deps.routingEnabled()) return out;
  const timeoutSec = deps.timeoutSec();
  const nowMs = deps.now();
  for (const c of cases) {
    if (tried.has(c.id) || !assignmentWaitExpired(c, nowMs, timeoutSec)) continue;
    tried.add(c.id);
    try {
      const r = await deps.route(c);
      if (r.outcome === 'routed_to_pool' || r.outcome === 'routed_to_fallback') {
        out.routed.push(c.id);
        await deps.audit({
          type: 'system', event: 'Case routed to pool after assignment timeout', user: 'system', caseId: c.id, confidence: null,
          detail: `Still unassigned ${timeoutSec} s after grossing completed; routed to pool ${r.poolName ?? r.poolId ?? ''}`.trim(),
        }).catch(() => {});
      } else out.skipped.push(c.id);
    } catch { out.failed.push(c.id); }
  }
  return out;
}

export interface SweepScheduler {
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
}

/** Scheduler hook for the pool client: every `intervalMs` it sweeps the cases `getCases()` returns. Returns the stop function. */
export function startAssignmentTimeoutSweep(
  getCases: () => readonly Case[],
  onRouted: (caseIds: string[]) => void,
  options: { intervalMs?: number; deps?: ExpireDeps; scheduler?: SweepScheduler } = {},
): () => void {
  const scheduler: SweepScheduler = options.scheduler ?? { setInterval: (f, ms) => setInterval(f, ms), clearInterval: h => clearInterval(h as ReturnType<typeof setInterval>) };
  const tried = new Set<string>();
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    expireUnassignedCases(getCases(), options.deps ?? defaultDeps(), tried)
      .then(r => { if (r.routed.length) onRouted(r.routed); })
      .catch(() => {})
      .finally(() => { running = false; });
  };
  const handle = scheduler.setInterval(tick, options.intervalMs ?? ASSIGNMENT_SWEEP_INTERVAL_MS);
  return () => scheduler.clearInterval(handle);
}
