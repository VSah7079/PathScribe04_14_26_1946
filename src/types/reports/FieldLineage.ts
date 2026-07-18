// src/types/reports/FieldLineage.ts
// ─────────────────────────────────────────────────────────────────────────────
// DR-2 — field-level audit trail. Deliberately scoped to fields that were
// part of a delta at reseed time (i.e. differed across the version
// history being compared when an amendment was initiated), not every
// field on the synoptic. Rationale: for a field the pathologist never
// touched, "provenance" is just "carried forward from the current
// release" -- already fully reconstructable from the ReportVersionRecord
// chain (mockReportVersionService.ts). Storing a redundant lineage entry
// for all ~22 untouched fields on every amendment adds storage/write
// overhead without adding any auditable information beyond what the
// version chain already proves. If literal per-field records are wanted
// even for untouched fields, extend `buildFieldLineage` (added in the
// reseed logic, not yet written) to populate every field key instead of
// just the delta set -- the type here doesn't need to change either way.
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldLineageEntry {
  fieldKey: string;
  value: unknown;
  /** Which released version this value was sourced from — corresponds
   *  to ReportVersionRecord.versionNumber for this instance's history. */
  sourceVersionNumber: number;
  /** When this selection was made — at reseed time, not at the source
   *  version's original release time. This is the actual new
   *  information DR-2 requires: the moment of the human decision. */
  chosenAt: string;
  chosenBy: { userId: string; userName: string };
  /** True if the pathologist picked an older value than the default
   *  (most recent) — corresponds to the FR-9G inline warning having
   *  been shown and accepted. */
  wasOverride: boolean;
}
