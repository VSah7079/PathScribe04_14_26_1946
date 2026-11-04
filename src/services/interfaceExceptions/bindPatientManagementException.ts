// src/services/interfaceExceptions/bindPatientManagementException.ts
// ─────────────────────────────────────────────────
// Batch 605: a reviewer picks the patient(s) an unresolved A40 / A24 / A47
// message meant, and this applies the message to them. Nothing is guessed:
// both choices come from the reviewer. Uses the same merge / link /
// add-identifier calls the automatic path uses, then closes the exception with
// a note. The audit entry holds no names or identifiers.
// ─────────────────────────────────────────────────
import { parsePatientManagementMessage } from '../hl7/patientManagementParser';
import { patientIndexService } from '../patients/patientServicesInstance';
import { interfaceExceptionService } from './interfaceExceptionServiceInstance';
import { auditService } from '../auditlog/auditServiceInstance';

export const BINDABLE_EVENT_TYPES = ['A40', 'A24', 'A47'] as const;

export interface BindInput {
  exceptionId: string;
  /** The patient the message's MRG (old / prior) identifier meant. */
  sourcePatientId?: string;
  /** The patient the message's PID (surviving / target) identifier meant. A47 does not need it. */
  targetPatientId?: string;
  actor: string;
}
export interface BindResult { ok: boolean; message: string; casesRepointed?: number }

export async function bindPatientManagementException(input: BindInput): Promise<BindResult> {
  const found = await interfaceExceptionService.getById(input.exceptionId);
  if (!found.ok) return { ok: false, message: 'That exception could not be found.' };
  const ex = found.data;
  if (ex.status !== 'pending') return { ok: false, message: 'That exception has already been closed.' };
  if (!(BINDABLE_EVENT_TYPES as readonly string[]).includes(ex.eventType)) return { ok: false, message: `${ex.eventType} cannot be bound by hand.` };

  const { sourcePatientId: src, targetPatientId: tgt } = input;
  let note: string;
  let casesRepointed: number | undefined;
  try {
    if (ex.eventType === 'A47') {
      if (!src) return { ok: false, message: 'Choose the patient whose identifier is being corrected.' };
      const parsed = parsePatientManagementMessage(ex.rawMessage);
      if (!parsed.target.assigningAuthority || !parsed.target.identifierValue) return { ok: false, message: 'The message carries no corrected identifier to add.' };
      await patientIndexService.addIdentifier(src, parsed.target.assigningAuthority, parsed.target.identifierValue, 'manual');
      note = 'A47 bound by a reviewer: corrected identifier added to the chosen patient.';
    } else {
      if (!src || !tgt) return { ok: false, message: 'Choose both patients.' };
      if (src === tgt) return { ok: false, message: 'The two choices are the same patient.' };
      if (ex.eventType === 'A40') {
        const r = await patientIndexService.mergeIntoExistingPatient(src, tgt);
        casesRepointed = r.casesRepointed;
        note = `A40 bound by a reviewer: prior patient merged into the surviving one (${r.casesRepointed} case(s) repointed).`;
      } else {
        await patientIndexService.linkPatients(src, tgt, 'same_person', input.actor, 'A24 bound by a reviewer');
        note = 'A24 bound by a reviewer: the two patient records linked.';
      }
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'The change could not be applied.' };
  }
  await interfaceExceptionService.resolve(ex.id, input.actor, note);
  await auditService.logEvent({
    type: 'system', event: 'Interface Exception Bound Manually',
    detail: `${ex.eventType} exception resolved by a reviewer choosing the patient(s). ${note}`,
    user: input.actor, caseId: null, confidence: null,
  }).catch(() => {});
  return { ok: true, message: note, casesRepointed };
}
