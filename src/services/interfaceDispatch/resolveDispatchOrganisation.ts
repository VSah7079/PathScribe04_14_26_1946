// src/services/interfaceDispatch/resolveDispatchOrganisation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 634 (PS-171 follow-on, Pete, Oct 19, 2026). Every outbound result message is queued against the patient's organisation
// in the patient index. This is the one lookup the cytology and surgical dispatchers share: it uses the patient index the app is
// using (the demo's or the API server's), and when there is no organisation it records why in the audit log instead of skipping
// without a trace. No organisation id is ever invented: with none, nothing is queued.
// ─────────────────────────────────────────────────────────────────────────────
import { patientIndexService } from '../patients/patientServicesInstance';
import { auditService } from '../auditlog/auditServiceInstance';

export type DispatchPathway = 'Cytology' | 'Surgical';
export type DispatchKind = 'final' | 'amended' | 'preliminary';
export type DispatchSkipReason = 'no-patient-id' | 'patient-not-in-index';

interface CaseLike { id?: string; patient?: { id?: string } | null }

export function dispatchSkipReason(patientId: string | undefined): DispatchSkipReason {
  return patientId ? 'patient-not-in-index' : 'no-patient-id';
}

/** Audit text is literal English (a compliance record, not UI). */
export function dispatchSkipAuditDetail(pathway: DispatchPathway, kind: DispatchKind, reason: DispatchSkipReason): string {
  const why = reason === 'no-patient-id' ? 'the case has no patient id' : 'the patient is not in the patient index, so there is no organisation to queue the message against';
  return `${pathway} ${kind} result message was not queued: ${why}. Nothing was sent for this case until the patient is registered; a later release or retry will queue it.`;
}

export function dispatchSkipEventName(pathway: DispatchPathway): string {
  return `${pathway.toUpperCase()}_DISPATCH_SKIPPED`;
}

/** The organisation id to queue against, or null (after recording why). */
export async function resolveDispatchOrganisation(caseData: CaseLike, pathway: DispatchPathway, kind: DispatchKind): Promise<string | null> {
  const patientId = caseData.patient?.id;
  const record = patientId ? await patientIndexService.getById(patientId).catch(() => null) : null;
  if (record?.organisationId) return record.organisationId;
  await auditService.logEvent({
    type: 'system', event: dispatchSkipEventName(pathway), detail: dispatchSkipAuditDetail(pathway, kind, dispatchSkipReason(patientId)),
    user: 'system', caseId: caseData.id ?? '', confidence: null,
  }).catch(() => undefined);
  return null;
}
