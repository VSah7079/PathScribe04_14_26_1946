// src/services/clinical/amendmentMismatch.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (#31): the clinical-pathologic mismatch check for what happens
// AFTER first sign-out: an amendment or correction (re-signed out) and an
// addendum (released from the amendment window). Until now only the first
// sign-out asked. Pure rules here; the service wiring is
// clinicalMismatchService.atRevision.
//
//   • An amendment or correction unlocks the report. While it is edited the
//     report page shows the same alert as before sign-out (Gate A), and the
//     re-sign-out asks again (Gate B), through clinicalMismatchService.
//   • An addendum is released without unlocking the report, so its text is
//     checked with the report's diagnosis before it is released.
//   • Whether a high-risk mismatch (a Block rule) HOLDS the release is a lab
//     setting (Configuration → System → Clinical Mismatch Rules; on by
//     default). Off: the alert is still shown and the mismatch is logged to
//     the QA dashboard, but nobody is made to stop and decide.
//
// The earlier decision still counts: a typo fix or a finding no worse than
// what was decided does not ask again (clinicalMismatchInputs.mismatchRecheck).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { ClinicalMismatchInput } from './detectClinicalPathologicMismatch';
import { autopsyMismatchInput, surgicalMismatchInput } from './clinicalMismatchInputs';
import type { ClinicalMismatchAssessment } from './clinicalMismatchService';

export type AmendmentKind = 'amendment' | 'correction' | 'addendum';

/** What a revision's release does with an assessment. */
export type RevisionStep = 'continue' | 'log' | 'decide';

/** Whether this case is being re-signed after an amendment or correction (some report is unlocked for it). */
export function caseHasPendingAmendment(c: Pick<Case, 'synopticReports'>): boolean {
  return (c.synopticReports ?? []).some(r => !!r.pendingAmendmentId);
}

/**
 * The text compared for an addendum: the report's own diagnosis with the
 * addendum's text added to it, so a new finding in the addendum is weighed
 * against the clinical history. Clinical and narrative text only.
 */
export function addendumMismatchInput(c: Case, addendumText: string): ClinicalMismatchInput | null {
  const extra = addendumText.trim();
  if (!extra) return null;
  const base = c.autopsy ? autopsyMismatchInput(c) : surgicalMismatchInput(c);
  return { ...base, diagnosis: [base.diagnosis, extra].filter(Boolean).join('\n') };
}

/**
 * What the release does (pure): nothing to show or suppressed → continue; a
 * high-risk mismatch → the pathologist decides first when the lab setting
 * holds the release, else it is logged; any other mismatch shown → logged.
 */
export function revisionStep(assessment: ClinicalMismatchAssessment | null, holdsRelease: boolean): RevisionStep {
  if (!assessment || assessment.outcome.risk === 'suppressed') return 'continue';
  return assessment.outcome.holdsSignOut && holdsRelease ? 'decide' : 'log';
}

/**
 * The assessment as the report alert shows it for a revision (pure). When the
 * lab setting does not hold the release, a high-risk mismatch is still shown
 * as high risk, marked so the alert says the release will not be held.
 */
export function withReleaseSetting(assessment: ClinicalMismatchAssessment, holdsRelease: boolean): ClinicalMismatchAssessment {
  if (holdsRelease || !assessment.outcome.holdsSignOut) return assessment;
  return { ...assessment, releaseNotHeld: true };
}
