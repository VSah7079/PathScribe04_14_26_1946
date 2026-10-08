// src/services/autopsy/recordAutopsyConsentStatusChange.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 469 (PS-261 §2.5.1 follow-up) — the real orchestration behind
// applyAutopsyConsentStatusChange.ts's pure merge: capability check,
// fetch, re-check on the freshest copy, persist via updateCaseWithRetry
// (version-safe, PS-71), and a real audit-log write — same shape as
// recordAutopsyCustodyTransfer.ts.
//
// Hospital-consented cases only: a forensic case has no NOK consent
// to narrow or revoke.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { applyAutopsyConsentStatusChange, type AutopsyConsentStatusChangeInput } from './applyAutopsyConsentStatusChange';

export type RecordAutopsyConsentStatusChangeReasonCode =
  | 'notPermitted' | 'caseNotFound' | 'notHospitalConsented' | 'conflict';

export interface RecordAutopsyConsentStatusChangeResult {
  ok: boolean;
  error?: string;
  reasonCode?: RecordAutopsyConsentStatusChangeReasonCode;
  notPermitted?: boolean;
}

export async function recordAutopsyConsentStatusChange(
  caseId: string,
  input: AutopsyConsentStatusChangeInput,
  actingUserName: string,
): Promise<RecordAutopsyConsentStatusChangeResult> {
  // Batch 469: narrowing or revoking consent needs autopsy:consent:manage
  // for the case's facility — a new, distinct capability (never reusing
  // autopsy:body:release or autopsy:custody:transfer, each a different action).
  const decision = await authorizationService.enforce('autopsy:consent:manage', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Changing consent needs the autopsy:consent:manage permission', notPermitted: true, reasonCode: 'notPermitted' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };
  if (caseData.autopsy.caseAuthority !== 'hospital_consented' || !caseData.autopsy.hospitalConsent) {
    return { ok: false, error: 'This case has no next-of-kin consent record to change.', reasonCode: 'notHospitalConsented' };
  }

  let notEligible = false;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy || current.autopsy.caseAuthority !== 'hospital_consented' || !current.autopsy.hospitalConsent) {
      notEligible = true;
      return null;
    }
    const updated = applyAutopsyConsentStatusChange(current.autopsy, input);
    return { autopsy: updated };
  }, caseRouter);

  if (write.ok === true) {
    // Real, per the standing audit rule — same choke point every other
    // autopsy write uses.
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_CONSENT_STATUS_CHANGED',
      detail: `Consent status set to ${input.status}${input.revocationNote ? ` (${input.revocationNote})` : ''}`,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (notEligible) return { ok: false, error: 'This case has no next-of-kin consent record to change.', reasonCode: 'notHospitalConsented' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the consent change was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
