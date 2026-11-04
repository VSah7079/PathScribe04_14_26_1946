// src/services/interfaceDispatch/resolveDispatchOrganisation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 634 (PS-171 follow-on, Pete, Oct 19, 2026). Every outbound result message is queued against the patient's organisation
// in the patient index. This is the one lookup the cytology and surgical dispatchers share: it uses the patient index the app is
// using (the demo's or the API server's), and when there is no organisation it records why in the audit log instead of skipping
// without a trace. No organisation id is ever invented: with none, nothing is queued.
// ─────────────────────────────────────────────────────────────────────────────
import { patientIndexService } from '../patients/patientServicesInstance';
import { auditService } from '../auditlog/auditServiceInstance';
import { isResearchCaseNow } from '../researchCases/researchCaseSettings';

export type DispatchPathway = 'Cytology' | 'Surgical';
export type DispatchKind = 'final' | 'amended' | 'preliminary';
export type DispatchSkipReason = 'no-patient-id' | 'patient-not-in-index' | 'research-case';

interface CaseLike { id?: string; patient?: { id?: string; mrn?: string } | null; accession?: { accessionPrefix?: string; fullAccession?: string; accessionNumber?: string } | null }

export function dispatchSkipReason(patientId: string | undefined): DispatchSkipReason {
  return patientId ? 'patient-not-in-index' : 'no-patient-id';
}

/** Audit text is literal English (a compliance record, not UI). */
export function dispatchSkipAuditDetail(pathway: DispatchPathway, kind: DispatchKind, reason: DispatchSkipReason): string {
  if (reason === 'research-case') return `${pathway} ${kind} result message was not queued: this is a research case (Configuration > System > Research Cases). Research cases are never sent to the EHR as results.`;
  const why = reason === 'no-patient-id' ? 'the case has no patient id' : 'the patient is not in the patient index, so there is no organisation to queue the message against';
  return `${pathway} ${kind} result message was not queued: ${why}. Nothing was sent for this case until the patient is registered; a later release or retry will queue it.`;
}

export function dispatchSkipEventName(pathway: DispatchPathway): string {
  return `${pathway.toUpperCase()}_DISPATCH_SKIPPED`;
}

async function recordSkip(caseData: CaseLike, pathway: DispatchPathway, kind: DispatchKind, reason: DispatchSkipReason): Promise<void> {
  await auditService.logEvent({
    type: 'system', event: dispatchSkipEventName(pathway), detail: dispatchSkipAuditDetail(pathway, kind, reason),
    user: 'system', caseId: caseData.id ?? '', confidence: null,
  }).catch(() => undefined);
}

/** Batch 728 (Lab Workflow spec, Decision 4): true when the case is a research case, after recording that nothing was queued. */
export async function skipResearchCaseDispatch(caseData: CaseLike, pathway: DispatchPathway, kind: DispatchKind): Promise<boolean> {
  if (!isResearchCaseNow(caseData)) return false;
  await recordSkip(caseData, pathway, kind, 'research-case');
  return true;
}

/** The organisation id to queue against, or null (after recording why). Batch 728: null for a research case. */
export async function resolveDispatchOrganisation(caseData: CaseLike, pathway: DispatchPathway, kind: DispatchKind): Promise<string | null> {
  if (await skipResearchCaseDispatch(caseData, pathway, kind)) return null;
  const patientId = caseData.patient?.id;
  const record = patientId ? await patientIndexService.getById(patientId).catch(() => null) : null;
  if (record?.organisationId) return record.organisationId;
  await recordSkip(caseData, pathway, kind, dispatchSkipReason(patientId));
  return null;
}
