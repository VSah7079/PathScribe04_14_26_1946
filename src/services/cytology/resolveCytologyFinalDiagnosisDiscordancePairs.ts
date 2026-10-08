// src/services/cytology/resolveCytologyFinalDiagnosisDiscordancePairs.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 459 (PS-152, its last open point; Pete: "That Final Diagnosis is what
// is used in discordance reporting against the Primary Cytotechs initial
// review"). Pairs each signed-out specimen's PRIMARY SCREEN with the review
// chosen as its FINAL DIAGNOSIS (CytologyFinalDiagnosisSnapshot.reviewRecordId,
// whatever role that review has: a QC rescreen, a secondary review, the
// pathologist's own). The pair is classified by the same engine as the other
// cytology QA reports (classifyCytologyAgreement via
// resolveCytologyQaAggregateReport), so "Primary screen vs Final Diagnosis"
// reads the same way as the others.
//
// A specimen whose Final Diagnosis IS its primary screen counts as exact
// agreement (the screener's read was signed out as is). A specimen with no
// primary screen on file, or a Final Diagnosis pointing at a review that
// isn't there, is left out: no pair is invented.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyQaComparisonPair } from './resolveCytologyQaComparisonPairs';
import type { CytologySpecimenFinalDiagnosisRef } from './resolveCytologyPeerReviewComparisonPairs';

/** The specimen's first primary screen (the screener's initial read). */
function firstPrimary(reviews: CytologyReviewRecord[]): CytologyReviewRecord | undefined {
  const primaries = reviews.filter(r => r.role === 'primary_screen');
  return primaries.reduce<CytologyReviewRecord | undefined>((first, r) => (!first || r.recordedAt < first.recordedAt ? r : first), undefined);
}

export function resolveCytologyFinalDiagnosisDiscordancePairs(
  reviews: CytologyReviewRecord[],
  specimenFinalDiagnoses: CytologySpecimenFinalDiagnosisRef[],
): CytologyQaComparisonPair[] {
  const reviewById = new Map(reviews.map(r => [r.id, r]));
  const bySpecimen = new Map<string, CytologyReviewRecord[]>();
  for (const r of reviews) bySpecimen.set(r.specimenId, [...(bySpecimen.get(r.specimenId) ?? []), r]);

  const pairs: CytologyQaComparisonPair[] = [];
  for (const spec of specimenFinalDiagnoses) {
    const finalReview = reviewById.get(spec.finalDiagnosisReviewRecordId);
    if (!finalReview) continue;
    const primary = firstPrimary(bySpecimen.get(spec.specimenId) ?? []);
    if (!primary) continue;
    pairs.push({ specimenId: spec.specimenId, caseId: spec.caseId, initial: primary, followUp: finalReview });
  }
  return pairs;
}
