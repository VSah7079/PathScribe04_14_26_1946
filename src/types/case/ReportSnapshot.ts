// src/types/case/ReportSnapshot.ts
// ─────────────────────────────────────────────────────────────
// Immutable record-of-release for a finalized report. A case
// accumulates one of these per release event (original sign-out,
// each Corrected Report, each Addendum) — NEVER mutated after
// creation, NEVER overwritten. This is what makes "show exactly
// what was released, when, and by whom" possible on request,
// independent of any later edits to the Parts/Templates that
// produced it.
//
// Terminology follows standard pathology reporting convention:
//   Original        — the first signed-out version of the report.
//   Corrected Report — replaces the prior operative version. Used
//                      ONLY when something already reported is
//                      itself wrong (e.g. a diagnosis change).
//                      The new snapshot supersedes the old one as
//                      the operative version; the old one is
//                      retained, never deleted, and is no longer
//                      operative.
//   Addendum         — supplementary information added after the
//                      fact that does not change what was already
//                      said (e.g. a late IHC/molecular result).
//                      Both the original/prior snapshot AND the
//                      addendum remain simultaneously relevant —
//                      neither supersedes the other.
// ─────────────────────────────────────────────────────────────

export type ReportSnapshotType = 'original' | 'corrected-report' | 'addendum';

export interface ReportSnapshot {
  id:       string;
  caseId:   string;

  /** Sequential per-case version number, starting at 1 for 'original' */
  version:  number;
  type:     ReportSnapshotType;

  // ── Storage ──────────────────────────────────────────────
  /**
   * Reference to the encrypted PDF blob (not the PDF bytes
   * themselves) — e.g. an object-storage key. Resolve via the
   * storage layer, which is responsible for the actual encryption
   * at rest and for enforcing access control no looser than the
   * case itself.
   */
  pdfStorageRef: string;
  /**
   * SHA-256 hash of the PDF's raw bytes, computed at creation
   * time. Confidentiality (encryption) and integrity (this hash)
   * are separate properties — encryption alone doesn't prove a
   * file hasn't been swapped by someone with legitimate storage
   * access. Re-hash on retrieval and compare to detect tampering.
   */
  contentHash:   string;

  // ── Relationships between snapshots ─────────────────────
  /**
   * Set only on a 'corrected-report' snapshot — the id of the
   * snapshot it replaces as the operative version. The superseded
   * snapshot is never deleted; only its operative status changes.
   */
  supersedes?:   string;
  /**
   * Set only on an 'addendum' snapshot — the id of the snapshot it
   * supplements. Both remain operative; this is additive, not a
   * replacement.
   */
  supplements?:  string;

  // ── Why this snapshot exists ─────────────────────────────
  /**
   * Required for 'corrected-report' (what was wrong and what
   * changed — e.g. "Diagnosis corrected: invasive ductal
   * carcinoma, not DCIS, on re-review of block A3").
   * Optional but recommended for 'addendum' (e.g. "IHC results
   * received: ER/PR/HER2").
   */
  reason?:       string;
  /** Synoptic report instance(s) this snapshot's content reflects, for traceability back to source data */
  relatedSynopticInstanceIds?: string[];

  // ── Attribution & audit ──────────────────────────────────
  createdAt:     string;
  createdBy: {
    id:          string;
    name:        string;
    credentials?: string;
  };
}

/**
 * Whether a given snapshot is currently the operative version for
 * its case — i.e. not superseded by a later Corrected Report.
 * Addenda never supersede anything, so they don't affect this.
 */
export function isOperativeSnapshot(snapshot: ReportSnapshot, allSnapshots: ReportSnapshot[]): boolean {
  return !allSnapshots.some(s => s.supersedes === snapshot.id);
}

/**
 * Full release history for a case, ordered oldest to newest.
 * This — not a single mutable field on Case — is the source of
 * truth for "what was released and when." Add this array (or a
 * separate keyed collection, depending on how Case records are
 * stored) to the Case type once the finalize/amend/addendum
 * pipeline is ready to populate it.
 */
export type ReportSnapshotHistory = ReportSnapshot[];
