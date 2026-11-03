// src/types/case/OriginatingCase.ts
// Batch 759 (Patient Verification, Outside Case Tracking and Audit Logging spec §2.1, Pete, Nov 2, 2026): for a case
// that came from another facility (an outside, referral or consultation case), the originating institution's own case
// number, kept with the case for good. Every workspace header shows it beside the PathScribe accession number (the
// Foreign Identifier), so nobody has to compare against the paper requisition. A block, slide or decant that came with
// its own number keeps it in its own externalId (Specimen.ts).
export interface OriginatingCase {
  /** The originating institution's case (or accession) number, as on its paperwork, e.g. S-24-9842. */
  caseNumber: string;
  /** The institution it came from, as written on its paperwork. */
  institution?: string;
}
