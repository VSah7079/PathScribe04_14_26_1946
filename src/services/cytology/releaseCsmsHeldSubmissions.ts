// src/services/cytology/releaseCsmsHeldSubmissions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 638 (PS-193, Pete). A CSMS message waits in the queue as AWAITING_ELIGIBILITY until a person answers the eligibility check
// (verifyCsmsEligibility). Verified: each waiting message is rebuilt from today's data and sent (resendRegistrySubmission, which
// alone may release it); if it is still not ready for another reason it stays held with that reason. Not eligible: each waiting
// message is closed as NOT_ELIGIBLE with the reason and never sent. The clinical report is not touched.
// ─────────────────────────────────────────────────────────────────────────────
import type { CytologyRegistryOutboundQueueEntry } from '@/types/case/CytologyRegistryOutboundQueueEntry';
import type { CsmsEligibilityDecision } from './csmsEligibility';
import { csmsNotEligibleMessage } from './csmsEligibility';
import { resendRegistrySubmission, type ResendDeps } from '../registrySubmission/resendRegistrySubmission';

interface WaitingEntry { id: string; errorCode?: string; status?: string }

export interface ReleaseCsmsDeps {
  getByCaseId: (caseId: string) => Promise<{ ok: boolean; data?: WaitingEntry[] }>;
  markFailed: (id: string, failure: { errorCode: NonNullable<CytologyRegistryOutboundQueueEntry['errorCode']>; errorMessage: string; maxRetriesExceeded: boolean }) => Promise<unknown>;
  resendDeps: ResendDeps;
  logAudit: (event: Record<string, unknown>) => unknown;
}

export interface ReleaseCsmsResult { released: number; stillHeld: number; closed: number }

export async function releaseCsmsHeldSubmissions(args: { caseId: string; decision: CsmsEligibilityDecision; actor: { id: string; name: string } }, deps: ReleaseCsmsDeps): Promise<ReleaseCsmsResult> {
  const { caseId, decision, actor } = args;
  const result: ReleaseCsmsResult = { released: 0, stillHeld: 0, closed: 0 };
  const found = await deps.getByCaseId(caseId);
  const waiting = (found.ok ? found.data ?? [] : []).filter(e => e.errorCode === 'AWAITING_ELIGIBILITY');
  for (const entry of waiting) {
    if (decision.kind === 'not_eligible') {
      await deps.markFailed(entry.id, { errorCode: 'NOT_ELIGIBLE', errorMessage: csmsNotEligibleMessage(decision.reason), maxRetriesExceeded: true });
      deps.logAudit({ type: 'user', event: 'CSMS submission closed: not eligible', detail: `Case ${caseId}: ${csmsNotEligibleMessage(decision.reason)} Not sent.`, user: actor.name, caseId, confidence: null });
      result.closed++;
      continue;
    }
    const r = await resendRegistrySubmission({ queue: 'cytology', entryId: entry.id, eligibilityVerified: true }, actor, deps.resendDeps);
    if (r.outcome === 'resent' || r.outcome === 'newVersion') { result.released++; continue; }
    // Not sent for some other reason (identifier, codes, go-live approval): it stays on the Registry Exceptions screen with that reason.
    await deps.markFailed(entry.id, { errorCode: r.outcome === 'stillHeld' ? 'REGISTRY_NOT_READY' : 'DISPATCH_REJECTED', errorMessage: r.message ?? 'Not sent after the eligibility check.', maxRetriesExceeded: false });
    result.stillHeld++;
  }
  return result;
}
