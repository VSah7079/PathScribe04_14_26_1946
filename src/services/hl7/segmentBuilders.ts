// src/services/hl7/segmentBuilders.ts
// ─────────────────────────────────────────────────────────────
// One function per segment, each building a single pipe-delimited HL7
// line. Field positions below are the ones confirmed directly against
// real HL7/IHE PaLM sources — see types.ts's own header for the exact
// grounding. Deliberately simple string construction, not a typed
// object model — a full HL7 object model is real engineering effort
// this pass doesn't need; every field here is a plain string, and
// callers are responsible for passing values already in the right
// shape (dates as YYYYMMDDHHmmss, etc.) via the small helpers below.
// ─────────────────────────────────────────────────────────────

import type { HL7MessageContext } from './types';
import { HL7_VERSION } from './types';

const F = '|'; // field separator, spelled out for readability at call sites

/** HL7 timestamp format — YYYYMMDDHHmmss. Takes an ISO string (what
 *  every date field in our own Case/Specimen model already uses) and
 *  reformats it; falls back to "now" if given nothing. */
export function toHL7Timestamp(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/** HL7 date-only format — YYYYMMDD. */
export function toHL7Date(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
}

/**
 * MSH — Message Header. Required in every message; fields below are
 * exactly the ones IHE PaLM TF-2x Appendix C.1 marks required.
 */
export function buildMSH(ctx: HL7MessageContext, messageControlId: string, sentAt?: string): string {
  return [
    'MSH', '^~\\&',
    ctx.sendingApplication, ctx.sendingFacility,
    ctx.receivingApplication, ctx.receivingFacility,
    toHL7Timestamp(sentAt),
    '', // MSH-8 Security — not used
    'ORM^O01', // MSH-9 Message Type
    messageControlId, // MSH-10
    ctx.processingId, // MSH-11
    HL7_VERSION,
  ].join(F);
}

/**
 * PID — Patient Identification. Fields confirmed against IHE PaLM
 * TF-2x Appendix C.3 and multiple independent ORM^O01 examples.
 */
export function buildPID(patient: {
  mrn?: string; firstName: string; lastName: string; dateOfBirth?: string; sex?: 'M' | 'F' | 'U';
}, setId = 1): string {
  return [
    'PID', String(setId),
    '', // PID-2 — deprecated field, not used
    patient.mrn ?? '', // PID-3 Patient Identifier List
    '',
    `${patient.lastName}^${patient.firstName}`, // PID-5
    '',
    toHL7Date(patient.dateOfBirth), // PID-7
    patient.sex ?? 'U', // PID-8
  ].join(F);
}

/**
 * PV1 — Patient Visit. Optional per the base standard, but IHE PaLM
 * lists it in its required-segment appendix, so included here rather
 * than left out. Deliberately minimal — patient class only; nothing in
 * our current Case model maps to most of PV1's other fields.
 */
export function buildPV1(patientClass: 'O' | 'I' = 'O', setId = 1): string {
  return ['PV1', String(setId), patientClass].join(F);
}

/**
 * ORC — Common Order. orderControl 'NW' = new order, the standard
 * value for a fresh request — confirmed across every real ORM^O01
 * example checked.
 */
export function buildORC(placerOrderNumber: string, fillerOrderNumber: string, orderedAt?: string, setId = 1): string {
  return [
    'ORC', 'NW',
    placerOrderNumber, // ORC-2
    fillerOrderNumber, // ORC-3
    '', '', '', '', '',
    toHL7Timestamp(orderedAt), // ORC-9
  ].join(F);
}

/**
 * OBR — Observation Request. This is where the actual requested
 * item — a stain, in our use case — is identified via OBR-4
 * (Universal Service Identifier), coded as CODE^TEXT^CODING-SYSTEM.
 * Using a local coding system name ("PATHSCRIBE-STAIN") rather than
 * inventing a fake LOINC/SNOMED code — per IHE's own convention for
 * vendor-defined codes (the "99zzz" pattern), a real integration would
 * need a genuine crosswalk to whatever coding system the receiving
 * system expects. That crosswalk is exactly the kind of thing that
 * belongs in a vendor adapter, not here.
 */
export function buildOBR(
  placerOrderNumber: string, fillerOrderNumber: string,
  serviceCode: string, serviceText: string,
  observationAt?: string, setId = 1
): string {
  return [
    'OBR', String(setId),
    placerOrderNumber, fillerOrderNumber,
    `${serviceCode}^${serviceText}^PATHSCRIBE-STAIN`, // OBR-4
    '', '',
    toHL7Timestamp(observationAt), // OBR-7
  ].join(F);
}

/**
 * SPM — Specimen. Fields confirmed against the current, real SPM
 * segment definition (hl7.eu/refactored/segSPM.html, cross-checked
 * against IHE PaLM's own Appendix C.7 listing): SPM-4 (Specimen Type),
 * SPM-6 (Specimen Additives — the field real IHE discussion flags as
 * an imperfect fit for stains, see this file's own header), SPM-8
 * (Specimen Source Site), SPM-11 (Specimen Role), SPM-27 (Container
 * Type, confirmed via SPM-24's own definition pointing there).
 *
 * Collection timestamp deliberately NOT placed in a numbered SPM field
 * here — unlike the five anchors above, I did not independently verify
 * its exact field position with the same rigor, and guessing at a
 * field number is exactly the mistake this whole rebuild was trying to
 * avoid. Pass it as a comment via buildNTE alongside this segment
 * instead until that position is actually confirmed.
 *
 * Interpretation, not verified standard: using one SPM per Block, with
 * SPM-11 (Specimen Role) set to 'L' to indicate a derived/pooled
 * specimen relationship back to the parent Specimen. This is a
 * reasonable reading of SPM-11's real definition, not a confirmed
 * industry-standard mapping for our specific Case→Specimen→Block
 * hierarchy — flagged here rather than presented as settled.
 */
export function buildSPM(spm: {
  setId: number; specimenId: string; parentSpecimenId?: string;
  specimenType?: string; bodySite?: string; containerType?: string;
  isBlock?: boolean;
}): string {
  return [
    'SPM', String(spm.setId),
    spm.specimenId, // SPM-2
    '', // SPM-3
    spm.specimenType ?? 'TISS', // SPM-4 — 'TISS' (Tissue) is a real HL70487 value seen in multiple verified examples
    '', // SPM-5
    '', // SPM-6 — Specimen Additives; not used for stains, see this function's own doc comment
    '', // SPM-7
    spm.bodySite ?? '', // SPM-8
    '', // SPM-9
    '', // SPM-10
    spm.isBlock ? 'L' : '', // SPM-11
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', // SPM-12 through SPM-26
    spm.containerType ?? '', // SPM-27
  ].join(F);
}

/**
 * NTE — Notes and Comments. Applies to whatever segment immediately
 * precedes it — confirmed directly in the real HL7 v2.5.1 chapter 7
 * text ("the note segment applies to the entity that immediately
 * precedes it").
 */
export function buildNTE(comment: string, setId = 1): string {
  return ['NTE', String(setId), '', comment].join(F);
}
