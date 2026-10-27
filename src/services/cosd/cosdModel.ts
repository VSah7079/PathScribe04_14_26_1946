// src/services/cosd/cosdModel.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 620 (part C, PS-800): UK cancer registry feed, COSD XML. Types and the honest statement of what is modelled.
//
// WHAT THIS IS: PathScribe's checks and a preview of the data a COSD submission is made from. The element names in the
// preview are PathScribe's own; they are NOT the official COSD schema and nothing here claims COSD conformance. The
// interface engine makes the real COSD file (translation and transport are its job; PathScribe owns what and when).
// WHAT IS STILL NEEDED: the published NHS England / NCRAS COSD specification. Each item in COSD_RULES_NEEDING_SPEC must be
// confirmed against it by the lab's sign-off lead (as for every registry, Registry Engine SRS FR-008.10).
// Contract: docs/architecture/UK_COSD_API.md
// ─────────────────────────────────────────────────────────────────────────────

/** The model this folder implements. 'simplified' until the official specification has been checked item by item. */
export const COSD_MODEL_STATUS = 'simplified' as const;

/** What a person must still confirm against the published specification before relying on the file. */
export const COSD_RULES_NEEDING_SPEC = [
  'schemaElementNames', 'mandatoryItemList', 'codeListValues', 'dateRules', 'submissionEnvelope', 'rejectionCodes', 'correctionWindowStart',
] as const;
export type CosdRuleNeedingSpec = (typeof COSD_RULES_NEEDING_SPEC)[number];

/** Default working days allowed to correct a rejected submission (Pete, Oct 19 2026: the UK 5-day rule). The destination can change it. */
export const COSD_DEFAULT_CORRECTION_WORKING_DAYS = 5;

/** PathScribe's own check codes (fixed, never text). They are not NCRAS rejection codes. */
export const COSD_FINDING_CODES = [
  'PATIENT_IDENTIFIER_MISSING', 'NHS_NUMBER_FORMAT', 'NHS_NUMBER_CHECK_DIGIT',
  'DOB_MISSING', 'DOB_INVALID', 'DOB_IN_FUTURE',
  'DIAGNOSIS_DATE_MISSING', 'DIAGNOSIS_DATE_INVALID', 'DIAGNOSIS_DATE_BEFORE_BIRTH', 'DIAGNOSIS_DATE_IN_FUTURE',
  'PRIMARY_DIAGNOSIS_MISSING', 'ICDO_MISSING', 'ICDO_FORMAT', 'ICD10_FORMAT', 'ACCESSION_MISSING', 'XML_NOT_WELL_FORMED',
] as const;
export type CosdFindingCode = (typeof COSD_FINDING_CODES)[number];

export interface CosdFinding {
  code: CosdFindingCode;
  /** An error means the submission would be held back; a warning is shown and does not stop it. */
  severity: 'error' | 'warning';
  /** Which part of the preview it concerns (a fixed id, never patient data). */
  field: 'patient' | 'dateOfBirth' | 'diagnosisDate' | 'primaryDiagnosis' | 'morphology' | 'icd10' | 'accession' | 'xml';
}

export type CosdMessageType = 'NEW' | 'CORRECTION' | 'AMENDMENT';

export interface CosdBuildOptions {
  submissionId: string;
  messageType: CosdMessageType;
  /** An amended report is a new submission that names the one it amends. */
  amendsSubmissionId?: string;
}
