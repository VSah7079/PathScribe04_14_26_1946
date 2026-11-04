// src/services/cytology/resolveCytologyHistologyCorrelationCandidates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance: work CYT-QA-04 (Cyto-Histologic Correlation
// and Discrepancy Matrix). Real investigation before building anything:
// surgical pathology's own diagnosis (Case.diagnostic.primaryDiagnosis,
// types/case/Case.ts) is free text, not a structured, ranked category
// system the way cytology's own diagnosticRank is — there is no
// automatic way to compute a comparable severity score from it, and no
// clean, structured "this specimen is a cervical biopsy" signal either
// (SpecimenEntry.type carries organ/tissue values inconsistently, not
// a reliable modality flag). A fully automatic correlation is
// therefore not honestly buildable today without a real data-model
// change to a different module (surgical pathology itself) — not
// attempted here.
//
// What IS honestly automatable: finding WHICH cytology findings should
// be checked for a possible correlation, and WHICH of a patient's
// other real cases are plausible candidates to check against — real,
// mechanical case-selection, leaving the actual diagnosis comparison
// and outcome classification to a real human reviewer, who records it
// via the already-existing, already-seeded "Cytology-Histology
// Correlation" QaActivityType (qa-activity-cyto-histo,
// services/quality/mockQaActivityTypeService.ts) once this candidate
// surfaces it.
//
// Real, deliberate trigger threshold: diagnosticRank >= 1 (ASC-US or
// worse) — CAP's own real requirement is correlation for abnormal
// cytology generally, not only HSIL+.
//
// Batch 452 (PS-156, Pete Oct 4 2026): the window is no longer "180 days
// from sign-out" fixed in code. Each abnormal cytology specimen carries its
// own window (cytologyHistologyCorrelationWindow.ts): by default 180 days
// from COLLECTION, configurable per enterprise, jurisdiction and facility.
// A later case matches when its specimens' collection OR receipt date falls
// in the window, so a biopsy taken inside the window still matches even if
// it reaches the lab a few days after it closes. The same function runs at
// sign-out and again whenever later cases arrive
// (sweepCytologyHistologyCorrelationCandidates.ts), so a biopsy accessioned
// after sign-out is no longer missed.
// ─────────────────────────────────────────────────────────────────────────────

import { isInCorrelationWindow, type CorrelationWindow } from './cytologyHistologyCorrelationWindow';

export interface CytologyHistologyCorrelationCandidate {
  cytologyCaseId: string;
  cytologySpecimenId: string;
  cytologyReviewId: string;
  /** Real, honest label: a plausible subsequent case for this same
   *  patient, not a confirmed cervical biopsy — a real human reviewer
   *  confirms relevance before recording an actual correlation. */
  candidateCaseId: string;
}

export interface AbnormalCytologyForCorrelation {
  reviewId: string;
  caseId: string;
  specimenId: string;
  diagnosticRank: number | undefined;
  window: Pick<CorrelationWindow, 'startsAt' | 'endsAt'> | null;
}

export interface OtherPatientCaseForCorrelation {
  caseId: string;
  hasNonCytologySpecimen: boolean;
  /** Every collection and receipt date on the case's specimens. */
  specimenDates: (string | undefined)[];
}

export function resolveCytologyHistologyCorrelationCandidates(
  abnormalCytology: AbnormalCytologyForCorrelation[],
  otherPatientCases: OtherPatientCaseForCorrelation[],
): CytologyHistologyCorrelationCandidate[] {
  const candidates: CytologyHistologyCorrelationCandidate[] = [];
  for (const cyto of abnormalCytology) {
    if (cyto.diagnosticRank === undefined || cyto.diagnosticRank < 1 || !cyto.window) continue;
    for (const other of otherPatientCases) {
      if (other.caseId === cyto.caseId || !other.hasNonCytologySpecimen) continue;
      if (isInCorrelationWindow(cyto.window, other.specimenDates)) {
        candidates.push({ cytologyCaseId: cyto.caseId, cytologySpecimenId: cyto.specimenId, cytologyReviewId: cyto.reviewId, candidateCaseId: other.caseId });
      }
    }
  }
  return candidates;
}

/** The patient's other cases, in the shape above. A specimen with no
 *  dictionary entry counts as non-cytology: surface a candidate rather than
 *  hide one. */
export function otherPatientCasesForCorrelation(
  allCases: { id: string; patient?: { id?: string } | null; specimens?: unknown[] }[],
  cytologyCaseId: string,
  patientId: string,
  dictById: ReadonlyMap<string, { type?: string }>,
): OtherPatientCaseForCorrelation[] {
  return allCases
    .filter(c => c.id !== cytologyCaseId && c.patient?.id === patientId)
    .map(c => {
      const specimens = (c.specimens ?? []) as { specimenDictionaryEntryId?: string; collectedAt?: string; receivedAt?: string }[];
      const hasNonCytologySpecimen = specimens.some(sp => {
        const entry = sp.specimenDictionaryEntryId ? dictById.get(sp.specimenDictionaryEntryId) : undefined;
        return !(entry && (entry.type === 'Cytology' || entry.type === 'FNA'));
      });
      return { caseId: c.id, hasNonCytologySpecimen, specimenDates: specimens.flatMap(sp => [sp.collectedAt, sp.receivedAt]) };
    });
}
