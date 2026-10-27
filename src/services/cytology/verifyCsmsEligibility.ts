// src/services/cytology/verifyCsmsEligibility.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 636 (PS-193). Records the answer to "is she eligible?" for a CSMS case: needs cytology:csms-eligibility:verify (which
// writes its own audit line, allowed or refused), clears the open f36 flag through the same versioned case write every flag
// change uses, and audits who, when and the outcome. The rules are in csmsEligibility.ts. The API server repeats the check.
// ─────────────────────────────────────────────────────────────────────────────
import { caseRouter } from '../cases/CaseRouter';
import { updateCaseWithRetryOrThrow } from '../cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { auditService } from '../auditlog/auditServiceInstance';
import type { FlagInstance } from '@/types/flagsRuntime';
import { csmsEligibilityAuditDetail, csmsEligibilityEventName, csmsEligibilityProblem, openCsmsEligibilityFlags, type CsmsEligibilityDecision } from './csmsEligibility';

import type { ReleaseCsmsDeps } from './releaseCsmsHeldSubmissions';

/** The real queue and resend wiring, loaded when needed (it pulls in the whole registry stack). */
async function realReleaseDeps(): Promise<ReleaseCsmsDeps> {
  const [{ cytologyRegistryOutboundQueueService: q }, { resendRegistrySubmissionDeps }] = await Promise.all([
    import('./cytologyRegistryOutboundQueueServiceInstance'), import('../registrySubmission/registryExceptionsDeps'),
  ]);
  return { getByCaseId: id => q.getByCaseId(id), markFailed: (id, f) => q.markFailed(id, f), resendDeps: resendRegistrySubmissionDeps, logAudit: e => auditService.logEvent(e as never) };
}

export type VerifyCsmsEligibilityOutcome = 'recorded' | 'refused' | 'reason-required' | 'case-not-found' | 'nothing-to-verify';

export async function verifyCsmsEligibility(args: { caseId: string; decision: CsmsEligibilityDecision; actor: { id: string; name: string } }, releaseDeps?: ReleaseCsmsDeps): Promise<VerifyCsmsEligibilityOutcome> {
  const { caseId, decision, actor } = args;
  const allowed = await authorizationService.enforce('cytology:csms-eligibility:verify', { caseId });
  if (!allowed.allowed) return 'refused';
  if (csmsEligibilityProblem(decision)) return 'reason-required';
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return 'case-not-found';

  const at = new Date().toISOString();
  let cleared = 0;
  await updateCaseWithRetryOrThrow(caseId, current => {
    const flags = (Array.isArray(current.caseFlags) ? current.caseFlags : []) as FlagInstance[];
    const open = openCsmsEligibilityFlags(flags);
    cleared = open.length;
    if (!open.length) return null;
    const ids = new Set(open.map(f => f.id));
    return { caseFlags: flags.map(f => ids.has(f.id) ? { ...f, deletedAt: at, deletedBy: actor.name } : f) };
  }, caseRouter);
  if (!cleared) return 'nothing-to-verify';

  auditService.logEvent({ type: 'user', event: csmsEligibilityEventName(decision), detail: csmsEligibilityAuditDetail(decision, actor.name), user: actor.name, caseId, confidence: null }).catch(() => {});
  // Batch 638: the answer decides the held CSMS message. A failure here never undoes the recorded answer; the message stays held.
  try {
    const { releaseCsmsHeldSubmissions } = await import('./releaseCsmsHeldSubmissions');
    await releaseCsmsHeldSubmissions({ caseId, decision, actor }, releaseDeps ?? await realReleaseDeps());
  } catch { /* the held message stays on the Registry Exceptions screen */ }
  return 'recorded';
}
