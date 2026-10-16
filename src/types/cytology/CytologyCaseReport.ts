// src/types/cytology/CytologyCaseReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 532 (Pete, Oct 12, 2026: "an accession number represents a single
// clinical order … the clinician expects a single cohesive diagnostic report").
// The consolidated cytology case report: every cytology specimen on the
// accession, in case order, each with its newest signed record (sign-out,
// correction or addendum) or, when the case was finalized early, "not
// reported" with the reason. Built from the immutable sign-out records
// (services/cytology/resolveCytologyCaseReport.ts); never stored itself.
// Per-specimen screening, review and signatures are unchanged: this is what
// is published, once, when the case closes.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologySignOutRecord } from './CytologySignOutRecord';

export interface CytologyCaseReportSpecimen {
  specimenId: string;
  label: string;
  description?: string;
  /** The specimen's newest signed record: its sign-out, or a later correction or addendum. */
  record?: CytologySignOutRecord;
  /** Present when the case was finalized before this specimen was signed out. */
  notReportedReason?: string;
}

export interface CytologyCaseReport {
  caseId: string;
  accessionNumber: string;
  /** The report language (from the signed records). */
  language?: string;
  specimens: CytologyCaseReportSpecimen[];
  /** True when every listed specimen has a signed record. */
  complete: boolean;
}
