// src/services/validationStudies/computeValidationStudyGrade.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real fix, found by this app's own inline-CSS/business-logic sweep:
// this grading rule used to live directly inside
// ValidationStudiesSection.tsx (as a local, unexported gradeResult()),
// with no backing service and no tests, even though its output —
// persisted as ValidationStudy.finalGrade the first time a report is
// generated — is real, regulatory-relevant evidence:
// resolveClientAiModel.ts/resolveVoiceAiModel.ts both gate whether an
// AI model is eligible for production use at a client specifically on
// finalGrade === 'PASS'. A grading bug here could silently let an AI
// model into (or keep it out of) production use it shouldn't have.
// Extracted here, unchanged behavior, now with real test coverage.
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationStudyGrade = 'PASS' | 'CONDITIONAL PASS' | 'FURTHER REVIEW';

export interface ValidationStudyGradeResult {
  /** Persisted as ValidationStudy.finalGrade: a stored code, so it stays English. */
  grade: ValidationStudyGrade;
  color: string;
  /** Batch 514 (Pete, Oct 10, 2026): the printed report is translated, so the
   *  grade's wording comes from validationStudies.printReport.grade.<key> and
   *  .gradeDescription.<key> in the reader's language. It used to be English
   *  description text here, on the reasoning that the report was a compliance
   *  artifact like the audit log; Pete decided the report follows the user's
   *  language. The stored grade code above is unchanged. */
  key: 'pass' | 'conditionalPass' | 'furtherReview';
}

/**
 * The real PASS / CONDITIONAL PASS / FURTHER REVIEW grading rule for a
 * validation study's parallel-run results:
 *  - PASS: acceptance rate meets its target AND edit ratio stays at or
 *    under its target ceiling.
 *  - CONDITIONAL PASS: acceptance rate reaches at least 85% of its
 *    target, even if the full PASS bar (both conditions) isn't met.
 *  - FURTHER REVIEW: neither of the above.
 */
export function computeValidationStudyGrade(
  acceptanceRate: number,
  targetAcceptanceRate: number,
  editRatio: number,
  targetMaxEditRatio: number,
): ValidationStudyGradeResult {
  const passes = acceptanceRate >= targetAcceptanceRate && editRatio <= targetMaxEditRatio;
  const partial = acceptanceRate >= targetAcceptanceRate * 0.85;
  if (passes)  return { grade: 'PASS',             color: '#10b981', key: 'pass' };
  if (partial) return { grade: 'CONDITIONAL PASS', color: '#f59e0b', key: 'conditionalPass' };
  return        { grade: 'FURTHER REVIEW',         color: '#ef4444', key: 'furtherReview' };
}
