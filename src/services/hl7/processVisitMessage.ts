// src/services/hl7/processVisitMessage.ts
// ─────────────────────────────────────────────────
// Batch 605 (entry 3): the visit-level ADT messages that carry an MRG segment.
//   A45  Move visit information: the visit named by MRG-5 moves from the patient
//        in MRG-1 to the patient in PID-3.
//   A50  Change visit number: the visit named by MRG-5 gets the number in PV1-19.
//   A34  Merge patient identifiers only: handled as an A40 merge (the prior
//        identifier in MRG-1 is folded into the one in PID-3).
// Anything that cannot be applied safely (an unknown patient or visit) goes to
// the Interface Exception queue instead of guessing, the same rule as A40/A24/A47/A43.
// ─────────────────────────────────────────────────
import { parseHL7Message, getField, getComponent, getRepetitions } from './hl7Parser';
import { processPatientManagementMessage } from './processPatientManagementMessage';
import { patientIndexService } from '../patients/patientServicesInstance';
import { encounterService } from '../encounters/encounterInstance';
import { interfaceExceptionService } from '../interfaceExceptions/interfaceExceptionServiceInstance';

export type VisitEventType = 'A45' | 'A50' | 'A34';
export const VISIT_EVENT_TYPES: readonly string[] = ['A45', 'A50', 'A34'];

export interface ProcessVisitMessageResult {
  eventType: VisitEventType;
  /** The visit that moved or was renumbered. */
  encounterId?: string;
  applied: boolean;
  /** Plain-English account of what happened (no names). */
  summary: string;
  routedToExceptionQueue?: string;
}

const toIso = (v: string): string => {
  if (v.length >= 8) {
    const d = new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(8, 10) || '00'}:${v.slice(10, 12) || '00'}:${v.slice(12, 14) || '00'}.000Z`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
};

export async function processVisitMessage(raw: string, organisationId: string): Promise<ProcessVisitMessageResult> {
  const message = parseHL7Message(raw);
  const msh = message.getSegment('MSH');
  if (!msh) throw new Error('Not a parseable HL7 message: no MSH segment.');
  const eventType = getComponent(getField(msh, 9), 1) as VisitEventType;
  if (!VISIT_EVENT_TYPES.includes(eventType)) throw new Error(`"${eventType}" is not a visit message (A45, A50, A34).`);

  if (eventType === 'A34') {
    // Patient-ID-only merge: same operation as A40 on the same segments.
    const asA40 = raw.replace(/ADT\^A34/, 'ADT^A40');
    const r = await processPatientManagementMessage(asA40, organisationId);
    return {
      eventType, applied: !r.routedToExceptionQueue, routedToExceptionQueue: r.routedToExceptionQueue,
      summary: r.routedToExceptionQueue ? `A34 was queued for review: ${r.routedToExceptionQueue}` : `A34 applied as a merge of patient identifiers (${r.casesRepointed ?? 0} case(s) repointed).`,
    };
  }

  const mrg = message.getSegment('MRG');
  const pid = message.getSegment('PID');
  const pv1 = message.getSegment('PV1');
  const evn = message.getSegment('EVN');
  const at = toIso(getField(evn, 2) || getField(msh, 7));
  const priorVisit = getField(mrg, 5);
  const newVisit = getField(pv1, 19);
  const ref = (cx: string) => {
    const first = getRepetitions(cx)[0] ?? '';
    return { value: getComponent(first, 0), authority: getComponent(first, 3) };
  };

  const queue = async (reason: string, sourcePatientId?: string, targetPatientId?: string): Promise<ProcessVisitMessageResult> => {
    await interfaceExceptionService.create({
      eventType, reason, rawMessage: raw, organisationId, sourcePatientId, targetPatientId,
      sourcePatientIdentifier: ref(getField(mrg, 1)).value || undefined, targetPatientIdentifier: ref(getField(pid, 3)).value || undefined,
    });
    return { eventType, applied: false, routedToExceptionQueue: reason, summary: `${eventType} was queued for review: ${reason}` };
  };

  if (!priorVisit) return queue(`No MRG-5 (prior visit number) on this ${eventType}: cannot tell which visit it refers to.`);
  const found = await encounterService.getByEncounterNumber(organisationId, priorVisit);
  if (!found.ok || !found.data) return queue(`MRG-5 "${priorVisit}" does not match any known visit for this organisation.`);
  const enc = found.data;

  if (eventType === 'A50') {
    if (!newVisit) return queue('No PV1-19 (new visit number) on this A50.');
    const r = await encounterService.changeEncounterNumber(enc.id, newVisit, at);
    if (!r.ok) return queue(r.error);
    return r.data.changed
      ? { eventType, encounterId: enc.id, applied: true, summary: `A50 applied: visit number ${priorVisit} is now ${newVisit}.` }
      : queue(r.data.reason ?? 'The visit number could not be changed.');
  }

  // A45: move the visit between patients.
  const target = ref(getField(pid, 3));
  const source = ref(getField(mrg, 1));
  const targetId = target.authority && target.value ? await patientIndexService.resolveByIdentifier(target.authority, target.value) : null;
  const sourceId = source.authority && source.value ? await patientIndexService.resolveByIdentifier(source.authority, source.value) : null;
  if (!targetId || !sourceId) {
    return queue(!targetId && !sourceId ? 'Neither patient on this A45 is known.' : !targetId ? 'The target patient (PID-3) on this A45 is not known.' : 'The source patient (MRG-1) on this A45 is not known.', sourceId ?? undefined, targetId ?? undefined);
  }
  const moved = await encounterService.reassignPatient(enc.id, sourceId, targetId, at);
  if (!moved.ok) return queue(moved.error, sourceId, targetId);
  return moved.data.reassigned
    ? { eventType, encounterId: enc.id, applied: true, summary: `A45 applied: visit ${priorVisit} moved to the target patient.` }
    : queue(moved.data.reason ?? 'The visit could not be moved.', sourceId, targetId);
}
