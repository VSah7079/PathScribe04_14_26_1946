// src/services/cytology/reassignPendingCytologyCases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 635 (PS-189's open item). Moves a blocked cytotechnologist's pending cases to named colleagues with room under their
// own daily cap, and returns the rest to the pool. Case assignment only: accession status is never touched. Every move is
// non-blocking (a routing race must never fail the save) and audited. The plan itself is resolveWorkloadReassignmentPlan.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';
import { resolveEffectiveCytologyWorkloadCap } from './resolveEffectiveCytologyWorkloadCap';
import { colleagueRemainingScu, resolveWorkloadReassignmentPlan, type ReassignmentColleague } from './resolveWorkloadReassignmentPlan';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReassignmentSummary {
  /** Cases given to a named colleague. */
  assigned: number;
  /** Colleague names, once each, in the order they received a case. */
  colleagueNames: string[];
  /** Cases returned to the shared pool. */
  returnedToPool: number;
}

async function colleaguesWithRoom(blockedUserId: string, facilityId: string | undefined, deps: CytologyWorkspaceDeps): Promise<ReassignmentColleague[]> {
  const now = deps.now();
  const staff = (await deps.listCytotechnologists().catch(() => [])).filter(s => s.id !== blockedUserId);
  const rows = await Promise.all(staff.map(async s => {
    const [caps, ledger] = await Promise.all([
      deps.getWorkloadCaps(facilityId, s.id),
      deps.getLedgerInWindow(s.id, new Date(now.getTime() - DAY_MS).toISOString(), now.toISOString()),
    ]);
    if (!caps || !ledger.ok) return null;
    const cap = resolveEffectiveCytologyWorkloadCap(caps.enterprise, caps.facility, caps.staff);
    const used = ledger.data.reduce((sum, e) => sum + e.scuWeight, 0);
    const seconds = ledger.data.reduce((sum, e) => sum + (e.activeDurationSeconds ?? 0), 0);
    return { userId: s.id, name: s.name, remainingScu: colleagueRemainingScu(cap.dailySlideCap, used, seconds) };
  }));
  return rows.filter((r): r is ReassignmentColleague => r !== null);
}

export async function reassignPendingCytologyCases(
  candidates: readonly Case[], blockedUser: { id: string; name: string }, facilityId: string | undefined, deps: CytologyWorkspaceDeps,
): Promise<ReassignmentSummary> {
  const byId = new Map(candidates.map(c => [c.id, c]));
  const colleagues = await colleaguesWithRoom(blockedUser.id, facilityId, deps).catch(() => []);
  const plan = resolveWorkloadReassignmentPlan(candidates.map(c => c.id), colleagues);
  const names: string[] = [];
  let assigned = 0;
  let toPool = 0;
  await Promise.all([
    ...plan.assignments.map(a => Promise.resolve(deps.assignCaseToUser(byId.get(a.caseId)!, a.userId)).then(() => {
      assigned += 1; if (!names.includes(a.name)) names.push(a.name);
      deps.logAudit({ type: 'system', event: 'CYTOLOGY_WORKLOAD_REASSIGNED', detail: `Case reassigned from ${blockedUser.name} to ${a.name}: ${blockedUser.name} reached the daily CLIA screening limit. Accession status unchanged.`, user: blockedUser.id, caseId: a.caseId, confidence: null });
    }).catch(async e => {
      console.error('Workload reassignment to a colleague failed (non-blocking):', e);
      await Promise.resolve(deps.returnToCytologyPool(byId.get(a.caseId)!)).then(() => { toPool += 1; }).catch(() => undefined);
    })),
    ...plan.poolCaseIds.map(id => Promise.resolve(deps.returnToCytologyPool(byId.get(id)!)).then(() => { toPool += 1; })
      .catch(e => console.error('Workload reassignment routing failed (non-blocking):', e))),
  ]);
  return { assigned, colleagueNames: names, returnedToPool: toPool };
}
