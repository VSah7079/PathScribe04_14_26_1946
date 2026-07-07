// src/services/hl7/types.ts
// ─────────────────────────────────────────────────────────────
// Standard HL7 v2.5.1 ORM^O01 core — built against segments confirmed
// directly from IHE PaLM Technical Framework Vol. 2x (Rev 11.0,
// 2024-04-08, IHE International's own current document): MSH, NTE, PID,
// PV1, ORC, TQ1, SPM. Cross-checked against multiple independent real
// HL7 references for the base ORM^O01 shape (MSH/PID/PV1/ORC/OBR/NTE).
//
// This is deliberately the STANDARD core only — no Vantage-specific or
// any other vendor-specific detail lives here. See adapters/ for where
// vendor customization plugs in. That split exists specifically so we
// were never blocked waiting on a vendor spec to start this work.
//
// One thing worth being honest about, found while verifying this:
// stain communication over HL7 is a genuinely unsettled problem
// industry-wide, not just something we don't know. Real, current IHE
// working discussion states plainly that SPM-6 (the closest standard
// field) "is not how pathologists think about stains." The
// Block→SPM / Stain→OBR mapping below is a reasonable interpretation
// using verified segment TYPES, not a guaranteed-correct industry
// mapping — flagged inline wherever that interpretation happens.
// ─────────────────────────────────────────────────────────────

export const HL7_FIELD_SEP = '|';
export const HL7_ENCODING_CHARS = '^~\\&';
export const HL7_VERSION = '2.5.1';

export interface HL7MessageContext {
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  /** 'P' production | 'T' training | 'D' debug — MSH-11, required per
   *  IHE PaLM. Default to 'D' anywhere this isn't explicitly set to 'P'
   *  by whatever's actually driving a real send — this is not a field
   *  to silently default to production. */
  processingId: 'P' | 'T' | 'D';
}
