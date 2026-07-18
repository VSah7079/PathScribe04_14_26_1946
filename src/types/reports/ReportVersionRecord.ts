// src/types/reports/ReportVersionRecord.ts
// ─────────────────────────────────────────────────────────────────────────────
// CORRECTED — restores the real, already-in-use schema (mode, trigger,
// createdBy, pdfBase64, generationError, synopticAnswersSnapshot). My
// earlier draft replaced this entirely with a case-wide `instances[]`
// bundle, which was wrong: it didn't know this PDF-based system already
// existed and was already relied on by SynopticReportPage.tsx.
//
// Only two fields are genuinely NEW here:
//   - instanceId: lets a per-synoptic-report version history be
//     filtered out of a case's records (a case can have multiple
//     synoptic instances, each amended independently).
//   - amendmentRecordId: links a version back to the AmendmentRecord
//     that produced it, so the banner can pull narrative (reason,
//     notification) for the version transition. Undefined for the
//     initial_signout trigger, since there's no amendment yet.
// ─────────────────────────────────────────────────────────────────────────────

export type ReportVersionMode = 'copilot' | 'orchestration';
export type ReportVersionTrigger = 'initial_signout' | 'amendment';

export interface ReportVersionRecord {
  id: string;
  caseId: string;
  versionNumber: number;
  createdAt: string;
  mode: ReportVersionMode;
  trigger: ReportVersionTrigger;
  createdBy: { userId: string; userName: string };
  /** Full case PDF (every synoptic instance rendered together), same
   *  pipeline as the print button — not a second, separately-built artifact. */
  pdfBase64?: string;
  generationError?: string;
  /** One instance's structured answers at this version — the instance
   *  identified by `instanceId` below. */
  synopticAnswersSnapshot?: Record<string, unknown>;

  /** NEW — which synoptic instance this version's snapshot belongs to. */
  instanceId?: string;
  /** NEW — the AmendmentRecord that produced this version, if any. */
  amendmentRecordId?: string;
}
