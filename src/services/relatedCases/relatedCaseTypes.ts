// src/services/relatedCases/relatedCaseTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (Pete, Oct 18, 2026): a patient's other released cases, attached to the report being
// signed out, or printed as a Patient summary. This file is the shape of what is attached.
//
// A RelatedCaseSnapshot is a copy of what a released case said at the time it was chosen. It is
// text only (no images, no files: PathScribe stores links, never bytes). Once the signer signs
// out, the snapshot is frozen: a later amendment to the other case does not change it, it raises
// a flag on this case instead (relatedCaseRules.amendedRelatedCases).
// ─────────────────────────────────────────────────────────────────────────────

export interface RelatedCaseSnapshot {
  /** The other case. */
  sourceCaseId: string;
  /** Its accession number as printed. */
  accession: string;
  /** When it was released (ISO). */
  releasedAt: string;
  /** Its record version when the snapshot was taken; a higher version later means it was amended. */
  sourceVersion: number;
  /** The specimens, one short line each (site and procedure as recorded). */
  specimens: string[];
  /** Its final diagnosis. */
  diagnosis: string;
  /** Its intraoperative (frozen section) diagnosis: part of that case's report, one line per specimen. */
  intraoperativeDiagnosis?: string;
  /** Who signed it out. */
  signedBy?: string;
  /** The physicians tied to it, so the signer can decide whether to include it. */
  orderingPhysician?: string;
  copyToPhysicians: string[];
  /** The client that sent it (facility name). */
  client?: string;
}

/** What is attached to one case's report. */
export interface RelatedCaseAttachment {
  caseId: string;
  /** Chosen cases, oldest first. */
  cases: RelatedCaseSnapshot[];
  updatedAt: string;
  updatedBy: string;
  /** Set when the case was signed out: the attached section is then fixed. */
  frozenAt?: string;
  frozenBy?: string;
}

/** A released case the signer may choose to attach. */
export interface RelatedCaseCandidate {
  snapshot: RelatedCaseSnapshot;
}

/** A frozen related case whose source has been amended since. */
export interface AmendedRelatedCase {
  sourceCaseId: string;
  accession: string;
  snapshotVersion: number;
  currentVersion: number;
}
