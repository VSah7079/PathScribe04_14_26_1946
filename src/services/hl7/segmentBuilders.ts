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
//
// Real fix, Phase 2, per Pete's direct HL7 v2.x guidance: HL7 TS
// (Timestamp) fields require YYYYMMDDHHMMSS[+/-ZZZZ] - the real,
// signed offset of the ORIGINATING FACILITY, never the sending
// browser/device's own offset (sending a browser-local offset breaks
// message parsing at the receiving LIS). toHL7Timestamp/buildMSH/
// buildORC/buildOBR now take a required, real facility timezone
// parameter and produce the real offset via
// utils/facilityTime.ts's getFacilityUtcOffsetString. toHL7Date/
// buildPID/buildFT1 also take the real, required timezone - HL7's DT
// (date-only) type has no offset component, but still needs the real,
// facility-local calendar date, not the viewing device's own local
// date, for the same real reason every other date-bucketing fix
// tonight exists.
// ─────────────────────────────────────────────────────────────

import type { HL7MessageContext } from './types';
import { HL7_VERSION, HL7_FIELD_SEP, HL7_ENCODING_CHARS } from './types';
import { getFacilityDateParts, getFacilityDateTimeParts, getFacilityUtcOffsetString } from '@/utils/facilityTime';

const F = HL7_FIELD_SEP; // short alias for readability at call sites, real fix: previously its own duplicate '|' literal

/** HL7 timestamp format — YYYYMMDDHHmmss+/-ZZZZ. Takes an ISO string
 *  (what every date field in our own Case/Specimen model already uses)
 *  and reformats it against the real, required facility timezone;
 *  falls back to "now" if given nothing. Real fix: the real, signed
 *  facility UTC offset is now appended, per HL7 v2.x spec - the
 *  previous version produced a bare, offset-less YYYYMMDDHHmmss using
 *  whichever timezone the browser/device happened to be in. */
function toHL7Timestamp(timezone: string, iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const { year, month, day, hour, minute, second } = getFacilityDateTimeParts(d, timezone);
  const pad = (n: number) => String(n).padStart(2, '0');
  const offset = getFacilityUtcOffsetString(d, timezone);
  return (
    year +
    pad(month + 1) +
    pad(day) +
    pad(hour) +
    pad(minute) +
    pad(second) +
    offset
  );
}

/** HL7 date-only format — YYYYMMDD. No offset component - HL7's DT
 *  data type is date-only, unlike TS. Still uses the real, required
 *  facility timezone for the real calendar date itself, not the
 *  viewing device's own local date. */
function toHL7Date(timezone: string, iso?: string): string {
  if (!iso) return '';
  const { year, month, day } = getFacilityDateParts(iso, timezone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return year + pad(month + 1) + pad(day);
}

/**
 * MSH — Message Header. Required in every message; fields below are
 * exactly the ones IHE PaLM TF-2x Appendix C.1 marks required.
 */
export function buildMSH(ctx: HL7MessageContext, messageControlId: string, timezone: string, sentAt?: string, messageType: string = 'ORM^O01'): string {
  return [
    'MSH', HL7_ENCODING_CHARS,
    ctx.sendingApplication, ctx.sendingFacility,
    ctx.receivingApplication, ctx.receivingFacility,
    toHL7Timestamp(timezone, sentAt),
    '', // MSH-8 Security — not used
    messageType, // MSH-9 Message Type — defaults to ORM^O01, real fix: generalized so this same, already-verified builder serves the new DFT^P03 message type too, rather than duplicating it
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
}, timezone: string, setId = 1): string {
  return [
    'PID', String(setId),
    '', // PID-2 — deprecated field, not used
    patient.mrn ?? '', // PID-3 Patient Identifier List
    '',
    `${patient.lastName}^${patient.firstName}`, // PID-5
    '',
    toHL7Date(timezone, patient.dateOfBirth), // PID-7
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
// setId unused — every OTHER segment builder in this file (buildPID,
// buildPV1, buildOBR, buildNTE, buildSPM) uses setId as the literal
// first field after the segment name, but ORC-1 is already the Order
// Control code ('NW'), not a set-sequence slot the way those other
// segments' position 1 is. Inheriting the setId parameter for
// signature consistency with the other builders, then not using it,
// left this exact gap. NOT guess-fixed here — inserting String(setId)
// into the wrong ORC field position would produce a non-compliant HL7
// message, the same class of mistake vantageAdapter.ts's stub exists
// to avoid. If ORC genuinely needs multi-instance set tracking, that
// needs a real HL7 v2.x ORC field-table lookup, not a guess.
export function buildORC(placerOrderNumber: string, fillerOrderNumber: string, timezone: string, orderedAt?: string, _setId = 1): string {
  return [
    'ORC', 'NW',
    placerOrderNumber, // ORC-2
    fillerOrderNumber, // ORC-3
    '', '', '', '', '',
    toHL7Timestamp(timezone, orderedAt), // ORC-9
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
  timezone: string, observationAt?: string, setId = 1
): string {
  return [
    'OBR', String(setId),
    placerOrderNumber, fillerOrderNumber,
    `${serviceCode}^${serviceText}^PATHSCRIBE-STAIN`, // OBR-4
    '', '',
    toHL7Timestamp(timezone, observationAt), // OBR-7
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

/**
 * FT1 — Financial Transaction. Real fix, Phase 3 of specimen/block-level
 * CPT association: field positions confirmed directly against multiple
 * real HL7 v2.5 DFT^P03 reference sources and real example messages,
 * not assumed. Deliberately follows the "professional" billing pattern
 * (FT1.7 carries CPT directly, modifiers in FT1.26, rendering provider
 * NPI in FT1.20) rather than the institutional pattern (local charge
 * code + revenue code + PR1/DRG) - matches this app's real domain
 * (professional anatomic pathology interpretation, not a hospital
 * facility billing every service line).
 *
 * Honest scope boundary: FT1-11 (Transaction Amount Extended) is
 * deliberately left blank. This app tracks real, verified work RVU
 * values (services/billing/) - not dollar pricing, which would require
 * GPCI/locality/conversion-factor math this app explicitly doesn't do
 * (see services/billing/README.md's own scope limits). The receiving
 * RCM/billing system prices the real CPT code in FT1-7; this app
 * doesn't fabricate a dollar amount it has no real basis for.
 */
export function buildFT1(ft1: {
  setId: number; transactionId: string; transactionDate?: string;
  transactionType: 'CG' | 'PY' | 'AJ' | 'CR'; cptCode: string; cptDescription?: string;
  modifier?: string; quantity?: number; departmentCode?: string;
  diagnosisCode?: string; performingProviderId?: string; performingProviderName?: string;
}, timezone: string): string {
  const txDate = toHL7Date(timezone, ft1.transactionDate);
  return [
    'FT1', String(ft1.setId), // FT1-1
    ft1.transactionId, // FT1-2
    '', // FT1-3 Transaction Batch ID — not used, this app doesn't batch
    txDate, // FT1-4 Transaction Date
    txDate, // FT1-5 Transaction Posting Date — same as transaction date, no separate GL posting concept here
    ft1.transactionType, // FT1-6
    `${ft1.cptCode}^${ft1.cptDescription ?? ''}^CPT4`, // FT1-7 Transaction Code (CE)
    '', // FT1-8 Transaction Description — redundant with FT1-7's own description component
    '', // FT1-9
    String(ft1.quantity ?? 1), // FT1-10
    '', // FT1-11 Transaction Amount Extended — deliberately blank, see this function's own doc comment
    '', // FT1-12
    ft1.departmentCode ?? '', // FT1-13
    '', '', // FT1-14, FT1-15
    '', // FT1-16
    '', '', // FT1-17, FT1-18
    ft1.diagnosisCode ?? '', // FT1-19 Diagnosis Code FT1 — links this charge to a specific real diagnosis
    ft1.performingProviderId ? `${ft1.performingProviderId}^${ft1.performingProviderName ?? ''}` : '', // FT1-20
    '', '', '', '', // FT1-21 through FT1-24
    '', // FT1-25 Procedure Code (alt placement) — not used, this app puts CPT in FT1-7 per the professional pattern
    ft1.modifier ?? '', // FT1-26 Procedure Code Modifier
  ].join(F);
}

/**
 * DG1 — Diagnosis. Real fix, Phase 3: field positions confirmed
 * directly against real HL7 v2.5 DFT reference sources. Carries the
 * real ICD-10 diagnosis codes this app already has
 * (Case.coding.icd10) - the clinical justification FT1's own charges
 * link back to via FT1-19.
 */
export function buildDG1(dg1: {
  setId: number; icd10Code: string; icd10Description?: string; isPrincipal?: boolean;
}): string {
  return [
    'DG1', String(dg1.setId), // DG1-1
    'I10', // DG1-2 Diagnosis Coding Method — ICD-10-CM
    `${dg1.icd10Code}^${dg1.icd10Description ?? ''}^I10`, // DG1-3
    '', // DG1-4
    '', // DG1-5
    dg1.isPrincipal ? 'F' : 'W', // DG1-6 — F (final/principal) vs W (working) per real, verified DG1.6 semantics
  ].join(F);
}
