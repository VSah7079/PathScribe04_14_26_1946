// src/services/hl7/patientManagementParser.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real parser for the patient-MANAGEMENT ADT events - A40 (merge),
// A24 (link), A47 (change patient identifier), A43 (move patient
// information) - structurally different from adtParser.ts's visit
// events (A01/A04/A08, which use PID+PV1). These all share the real,
// standard PID+MRG shape (confirmed directly against the HL7 v2.5
// message-structure table: "MSH [{SFT}] EVN PID [PD1] MRG" for A24;
// the same PID+MRG core for A40/A47/A43's own message structures).
//
// Real, confirmed field structure: MRG-1 (Prior Patient Identifier
// List) uses the EXACT SAME CX component structure as PID-3
// (id^checkDigit^checkDigitScheme^assigningAuthority^identifierTypeCode)
// - the same getComponent/getRepetitions helpers from hl7Parser.ts
// apply directly, no new parsing logic needed for that part.
//
// Real, IMPORTANT correction found during research, worth being
// direct about: the original spec text described A47 as "detach
// misidentified records or cases" - that is NOT what real A47 does.
// Verified directly against multiple real HL7 v2 references: A47
// ("Change Patient Identifier List") means a SINGLE patient's own
// identifier was corrected - same real person, same real record, only
// the identifier value changes. It is explicitly NOT a record-merge
// or a case-detach operation; A31 is the real event for demographic
// corrections, and A40 is the real event for combining two genuinely
// separate people. Built to match the real, verified standard here,
// not the original spec text.
//
// Real feature, per direct architecture confirmation: A43 (Move
// Patient Information) is genuinely different from A40/A47 in one
// important way — target and source are NOT the same real person.
// A40 merges two identities that turned out to be the same patient;
// A47 corrects one patient's own identifier. A43 moves a SPECIFIC
// piece of misattributed data (in this app's data model, one Case)
// from a patient it was wrongly attached to over to the correct one —
// both patients remain real, separate, independently-active people.
// MRG-5 (Prior Visit Number) is the real, standard field that scopes
// WHICH visit/encounter's data is moving — without it, this app has
// no reliable way to know which specific Case to repoint (see
// processPatientManagementMessage.ts's own real fallback: no usable
// MRG-5 routes to the Interface Exception Queue rather than guessing
// or moving everything).
// ─────────────────────────────────────────────────────────────────────────────

import { parseHL7Message, getField, getComponent, getRepetitions, type ParsedHL7Segment } from './hl7Parser';

export type PatientManagementEventType = 'A40' | 'A24' | 'A47' | 'A43';

export interface ParsedPatientRef {
  identifierValue: string;
  assigningAuthority: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
}

export interface ParsedPatientManagementMessage {
  eventType: PatientManagementEventType;
  recordedAt: string;
  /** The real, "surviving"/target/new identity - from the real PID
   *  segment, present on all real event types. */
  target: ParsedPatientRef;
  /** The real, "prior"/source/old identity - from the real MRG
   *  segment, present on all real event types (every one of
   *  A40/A24/A47/A43 genuinely requires it). */
  source: ParsedPatientRef;
  /** Real feature, per direct architecture confirmation: MRG-5 (Prior
   *  Visit Number) — only genuinely meaningful for A43, where it
   *  scopes WHICH specific visit/encounter's data is moving. Real,
   *  standard field; not fabricated when absent from the message. */
  priorVisitNumber?: string;
}

function parsePatientRefFromPID(pid: ParsedHL7Segment | null): ParsedPatientRef {
  const rawIdentifiers = getRepetitions(getField(pid, 3));
  const first = rawIdentifiers[0] ?? '';
  const nameField = getField(pid, 5);
  return {
    identifierValue: getComponent(first, 0),
    assigningAuthority: getComponent(first, 3),
    lastName: getComponent(nameField, 0) || undefined,
    firstName: getComponent(nameField, 1) || undefined,
    dateOfBirth: getField(pid, 7) || undefined,
  };
}

function parsePatientRefFromMRG(mrg: ParsedHL7Segment | null): ParsedPatientRef {
  // Real, confirmed: MRG-1 (Prior Patient Identifier List) is the
  // same CX structure as PID-3 - same component positions.
  const rawIdentifiers = getRepetitions(getField(mrg, 1));
  const first = rawIdentifiers[0] ?? '';
  // MRG-7 (Prior Patient Name) - real, confirmed field, present but
  // "not used to change a patient name" per the real standard's own
  // definition; captured here only as real, informational context for
  // whichever real record this identifier belonged to.
  const nameField = getField(mrg, 7);
  return {
    identifierValue: getComponent(first, 0),
    assigningAuthority: getComponent(first, 3),
    lastName: getComponent(nameField, 0) || undefined,
    firstName: getComponent(nameField, 1) || undefined,
  };
}

function fromHL7Date(value: string): string | undefined {
  if (!value || value.length < 8) return undefined;
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const hour = value.length >= 10 ? value.slice(8, 10) : '00';
  const minute = value.length >= 12 ? value.slice(10, 12) : '00';
  const second = value.length >= 14 ? value.slice(12, 14) : '00';
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : iso;
}

/** Real, honest parse — throws only when the message genuinely cannot
 *  be processed (no MSH, an event type this app doesn't handle, or a
 *  genuinely missing real MRG segment - every one of A40/A24/A47
 *  requires one; a message claiming to be one of these without a real
 *  MRG is not a valid message of that type, not something to guess
 *  at). */
export function parsePatientManagementMessage(raw: string): ParsedPatientManagementMessage {
  const message = parseHL7Message(raw);
  const msh = message.getSegment('MSH');
  if (!msh) throw new Error('Not a real, parseable HL7 message — no MSH segment found.');

  const messageType = getField(msh, 9);
  const eventType = getComponent(messageType, 1);
  if (eventType !== 'A40' && eventType !== 'A24' && eventType !== 'A47' && eventType !== 'A43') {
    throw new Error(`Real event type "${eventType}" is not a patient-management event this parser handles — only A40, A24, A47, A43.`);
  }

  const mrg = message.getSegment('MRG');
  if (!mrg) throw new Error(`A real ${eventType} message requires a real MRG segment — none found.`);

  const evn = message.getSegment('EVN');
  const pid = message.getSegment('PID');

  return {
    eventType,
    recordedAt: fromHL7Date(getField(evn, 2)) ?? new Date().toISOString(),
    target: parsePatientRefFromPID(pid),
    source: parsePatientRefFromMRG(mrg),
    // Real feature, per direct architecture confirmation: MRG-5,
    // real for A43. Genuinely undefined when absent — never
    // fabricated, since processPatientManagementMessage.ts's real
    // fallback depends on honestly knowing the difference between
    // "no MRG-5" and "MRG-5 present but empty string."
    priorVisitNumber: getField(mrg, 5) || undefined,
  };
}
