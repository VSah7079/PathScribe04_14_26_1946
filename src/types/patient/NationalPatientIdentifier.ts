// src/types/patient/NationalPatientIdentifier.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 417 (Registry Engine SRS v2.1, FR-004.3). A patient's national
// healthcare identifiers, kept apart from the lab's own MRN. Every registry
// keys on one of these (the NHS number, the BSN, the IHI), never on the MRN,
// so the registry engines read this list and the MRN stays the lab's.
//
// `system` is the IDENTIFIER_FORMAT_LIBRARY id of the identifier (mrn_nhs,
// mrn_bsn, …): one vocabulary for the format, the registry definition and
// this record, no mapping table between them.
//
// `verificationStatus` is what the check digit said when the value was
// recorded or last checked (services/patientIdentifiers/checkDigits.ts).
// A registry submission that needs this identifier is blocked unless it is
// 'verified' (SRS FR-004.2); 'unchecked' is for systems with no check digit
// PathScribe can run (the Korean RRN, a Canadian province without a rule).
// ─────────────────────────────────────────────────────────────────────────────

export type NationalIdentifierVerification = 'verified' | 'failedChecksum' | 'unchecked';

export interface NationalPatientIdentifier {
  /** IDENTIFIER_FORMAT_LIBRARY id, e.g. 'mrn_nhs'. */
  system: string;
  value: string;
  verificationStatus: NationalIdentifierVerification;
  /** ISO timestamp of the last check. */
  verifiedAt?: string;
  /** Where the value came from: typed at accession, an HL7 PID-3, a legacy import. */
  source?: 'manual' | 'hl7' | 'import';
  /** Batch 605: the NHS Number Status Indicator code (PID-32 on an inbound ADT, e.g. '01' = verified). Only for mrn_nhs. */
  statusCode?: string;
}
