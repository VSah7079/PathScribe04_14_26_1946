// src/services/patientHistory/runHistoryRefreshSweep.ts
// ─────────────────────────────────────────────────
// Batch 605: the nightly "refresh prior reports" sweep, runnable on demand from
// the Server jobs screen (and by the demo timer). It takes the active Assist-mode
// cases, asks resolveCasesNeedingHistoryRefresh which need a fetch, and retries
// each. The audit entry holds counts only.
// ─────────────────────────────────────────────────
import { caseRouter } from '../cases/CaseRouter';
import { mockAuditService } from '../auditlog/mockAuditService';
import { patientHistoryCacheService as mockPatientHistoryCacheService } from './patientHistoryInstance';
import { resolveCasesNeedingHistoryRefresh } from './resolveCasesNeedingHistoryRefresh';
import { ensureHistoryFetchStarted, retryHistoryFetch } from './ensureHistoryFetchStarted';
import { isCaseSignedOutForBilling } from '../billing/isCaseSignedOutForBilling';

type SweepCase = { id: string; status: never; reportingMode?: string; patient: { id: string; mrn: string } };

export interface HistoryRefreshResult { considered: number; refreshed: number }

export async function runHistoryRefreshSweep(actor = 'system'): Promise<HistoryRefreshResult> {
  const all = await caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true } as never);
  const active = all.ok ? (all.data as unknown as SweepCase[]).filter(c => c.reportingMode === 'assist' && !isCaseSignedOutForBilling(c.status) && c.patient?.id && c.patient?.mrn) : [];
  const cache = await mockPatientHistoryCacheService.getAll();
  const entries = cache.ok ? cache.data : [];
  // A case with no cache entry yet is started; one that failed under the retry budget is retried.
  const need = resolveCasesNeedingHistoryRefresh(active.map(c => ({ caseId: c.id, patientId: c.patient.id })), entries);
  for (const n of need) {
    const c = active.find(x => x.id === n.caseId);
    if (!c) continue;
    if (entries.some(e => e.caseId === n.caseId)) await retryHistoryFetch(n.caseId, c.patient.mrn);
    else await ensureHistoryFetchStarted(c as never);
  }
  await mockAuditService.logEvent({
    type: 'system', event: 'Prior Reports Refresh Run',
    detail: `Prior-report refresh sweep: ${active.length} active Assist case(s) considered, ${need.length} refreshed. Run by a person from Server jobs.`,
    user: actor, caseId: null, confidence: null,
  }).catch(() => {});
  return { considered: active.length, refreshed: need.length };
}

/** At sign-out the case's prior-report cache is destroyed (it must not outlive the case). Never throws. */
export async function destroyHistoryCacheAtSignOut(caseId: string): Promise<void> {
  try {
    await mockPatientHistoryCacheService.destroy(caseId);
    await mockAuditService.logEvent({ type: 'system', event: 'Prior Reports Cache Destroyed', detail: 'The case\'s prior-report cache was destroyed at sign-out.', user: 'system', caseId, confidence: null });
  } catch { /* non-blocking */ }
}
