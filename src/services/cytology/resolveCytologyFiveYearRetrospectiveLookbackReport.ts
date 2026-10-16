// src/services/cytology/resolveCytologyFiveYearRetrospectiveLookbackReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 483 (PS-359 tracker follow-up — "CYT-QA-03 vs CYT-QA-04 report
// asymmetry"): CYT-QA-03 (CAP's mandatory 5-Year Retrospective Lookback,
// resolveCytologyFiveYearRetrospectiveLookback.ts, Phase 58) and its
// outcome-recording UI (Phase 60) have existed for a while — every flagged
// specimen's retrospectiveReviewFlag (types/case/Specimen.ts) carries a
// real reason, trigger, and (once reviewed) outcome/correctiveAction/
// reviewedBy. CYT-QA-04 (Cyto-Histologic Correlation, Phases 63-67) got the
// full chain through to an aggregate report with a QA-tab tile, CSV export
// and a print view. CYT-QA-03 never did — this is that aggregate, closing
// the asymmetry. Same real, deliberate pure-function shape as every other
// report resolver in this module: the caller supplies already-fetched,
// already-flagged specimens; this function only shapes and aggregates.
// ─────────────────────────────────────────────────────────────────────────────

export type CytologyFiveYearLookbackOutcome = 'confirmed_negative' | 'screening_error' | 'interpretation_error' | 'sampling_error';

export interface CytologyFiveYearLookbackSpecimenInput {
  caseId: string;
  specimenId: string;
  accessionId?: string;
  /** The real, prior negative review this flag was raised against. */
  triggeredByCaseId: string;
  triggeredAt: string;
  outcome?: CytologyFiveYearLookbackOutcome;
  correctiveAction?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

export interface CytologyFiveYearLookbackReportRow extends CytologyFiveYearLookbackSpecimenInput {
  /** Real, honest derived status — 'pending' until a real reviewer has
   *  actually recorded an outcome, never defaulted to a completed state. */
  status: 'pending' | 'completed';
}

export interface CytologyFiveYearLookbackReport {
  rows: CytologyFiveYearLookbackReportRow[];
  totalFlagged: number;
  pendingCount: number;
  completedCount: number;
  /** Real, honest 0 (not undefined) when totalFlagged is 0 — unlike
   *  CYT-QA-04's ppvHsilPercent, there's no real calculation this would
   *  misrepresent: "0 of 0 completed" is a true, reportable 0%. */
  completedPercent: number;
  /** Among completed reviews only: how many led to a corrective action
   *  being recorded (CAP's own "mandatory documentation of retraining or
   *  amended report" requirement) — real, honest undefined when nothing
   *  has been completed yet, never a fabricated 0%. */
  correctiveActionRatePercent: number | undefined;
  byOutcome: Record<CytologyFiveYearLookbackOutcome, number>;
}

export function resolveCytologyFiveYearRetrospectiveLookbackReport(
  specimens: CytologyFiveYearLookbackSpecimenInput[],
): CytologyFiveYearLookbackReport {
  const rows: CytologyFiveYearLookbackReportRow[] = specimens.map(sp => ({
    ...sp,
    status: sp.outcome ? 'completed' : 'pending',
  }));

  const totalFlagged = rows.length;
  const completed = rows.filter(r => r.status === 'completed');
  const pendingCount = totalFlagged - completed.length;
  const completedCount = completed.length;
  const completedPercent = totalFlagged === 0 ? 0 : (completedCount / totalFlagged) * 100;

  const withCorrectiveAction = completed.filter(r => !!r.correctiveAction?.trim());
  const correctiveActionRatePercent = completedCount === 0 ? undefined : (withCorrectiveAction.length / completedCount) * 100;

  const byOutcome: Record<CytologyFiveYearLookbackOutcome, number> = {
    confirmed_negative: 0, screening_error: 0, interpretation_error: 0, sampling_error: 0,
  };
  for (const r of completed) if (r.outcome) byOutcome[r.outcome]++;

  return { rows, totalFlagged, pendingCount, completedCount, completedPercent, correctiveActionRatePercent, byOutcome };
}
