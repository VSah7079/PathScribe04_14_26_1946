// src/services/autopsy/recordAutopsyConsentReinstatement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 471 (PS-261 follow-up) — the real orchestration behind
// applyAutopsyConsentReinstatement.ts's pure merge: capability check,
// fetch, re-check on the freshest copy, persist via updateCaseWithRetry
// (version-safe, PS-71), and a real audit-log write — same shape as
// recordAutopsyConsentStatusChange.ts.
//
// Its own capability, autopsy:consent:reinstate — never reusing
// autopsy:consent:manage. Narrowing/revoking and reinstating are
// opposite-direction actions; granting one was never meant to imply
// the other, and a hospital that wants narrowing available to more
// roles than reinstatement (or vice versa) needs that to be a real
// choice in the Role Dictionary, not a side effect of one capability
// covering both directions.
//
// A reinstatementNote is mandatory — refused, not defaulted to an
// empty string, same "a real reason on file" posture
// recordAutopsyCustodyTransfer.ts and the revocation note before it
// already took informally. Hospital-consented cases only, same as
// narrowing: a forensic case has no NOK consent to reinstate.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { applyAutopsyConsentReinstatement, type AutopsyConsentReinstatementInput } from './applyAutopsyConsentReinstatement';

export type RecordAutopsyConsentReinstatementReasonCode =
  | 'notPermitted' | 'caseNotFound' | 'notHospitalConsented' | 'noteRequired' | 'conflict';

export interface RecordAutopsyConsentReinstatementResult {
  ok: boolean;
  error?: string;
  reasonCode?: RecordAutopsyConsentReinstatementReasonCode;
  notPermitted?: boolean;
}

export async function recordAutopsyConsentReinstatement(
  caseId: string,
  input: AutopsyConsentReinstatementInput,
  actingUserName: string,
): Promise<RecordAutopsyConsentReinstatementResult> {
  const decision = await authorizationService.enforce('autopsy:consent:reinstate', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Reinstating consent needs the autopsy:consent:reinstate permission', notPermitted: true, reasonCode: 'notPermitted' };

  if (!input.reinstatementNote.trim()) {
    return { ok: false, error: 'A reinstatement note is required.', reasonCode: 'noteRequired' };
  }

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };
  if (caseData.autopsy.caseAuthority !== 'hospital_consented' || !caseData.autopsy.hospitalConsent) {
    return { ok: false, error: 'This case has no next-of-kin consent record to reinstate.', reasonCode: 'notHospitalConsented' };
  }

  let notEligible = false;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy || current.autopsy.caseAuthority !== 'hospital_consented' || !current.autopsy.hospitalConsent) {
      notEligible = true;
      return null;
    }
    const updated = applyAutopsyConsentReinstatement(current.autopsy, input);
    return { autopsy: updated };
  }, caseRouter);

  if (write.ok === true) {
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_CONSENT_REINSTATED',
      detail: `Consent status reinstated to ${input.status} (${input.reinstatementNote})`,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (notEligible) return { ok: false, error: 'This case has no next-of-kin consent record to reinstate.', reasonCode: 'notHospitalConsented' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the reinstatement was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
