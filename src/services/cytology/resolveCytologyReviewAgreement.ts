// src/services/cytology/resolveCytologyReviewAgreement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 410 (Pete: "each subsequent review should explicitly store its level of
// agreement when saved"). A later review (QC rescreen, secondary reviewer,
// pathologist, peer review) compared with the specimen's initial screen:
//
//   • the level, by the standard QA taxonomy already used by the QA reports
//     (classifyCytologyAgreement: exact / minor / major with its subtype, from
//     the primary interpretation), and adequacy as its own flag;
//   • which interpretations (primary and secondary) and recommendations were
//     added or missed;
//   • which initial screen, whose, and which version was compared, and when
//     and by whom it was assessed.
//
// Pure. saveCytologyReview stores the result on the review.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyReviewAgreement, CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import { allCytologyInterpretationIds } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import { classifyCytologyAgreement } from './classifyCytologyAgreement';
import { resolveCytologyCategorySetConcordance } from './resolveCytologyCategorySetConcordance';

type Compared = Pick<CytologyReviewRecord, 'primaryInterpretationId' | 'additionalInterpretations' | 'adequacySelections' | 'recommendations'>;

export function resolveCytologyReviewAgreement(
  followUp: Compared,
  initial: CytologyReviewRecord,
  categories: CytologyCategoryEntry[],
  assessment: { at: string; by: { userId: string; userName: string } },
): CytologyReviewAgreement {
  const level = classifyCytologyAgreement(
    { primaryInterpretationId: initial.primaryInterpretationId, adequacyCategoryIds: initial.adequacySelections?.map(s => s.categoryId) },
    { primaryInterpretationId: followUp.primaryInterpretationId, adequacyCategoryIds: followUp.adequacySelections?.map(s => s.categoryId) },
    categories,
  );
  const interpretations = resolveCytologyCategorySetConcordance(allCytologyInterpretationIds(initial), allCytologyInterpretationIds(followUp));
  const recommendations = resolveCytologyCategorySetConcordance(
    (initial.recommendations ?? []).map(r => r.categoryId), (followUp.recommendations ?? []).map(r => r.categoryId));
  return {
    level: level.level,
    ...(level.majorSubtype ? { majorSubtype: level.majorSubtype } : {}),
    adequacyDiscrepancy: level.adequacyDiscrepancy,
    addedInterpretationIds: interpretations.addedByComparison,
    missedInterpretationIds: interpretations.missedByComparison,
    addedRecommendationIds: recommendations.addedByComparison,
    missedRecommendationIds: recommendations.missedByComparison,
    comparedWithReviewId: initial.id,
    comparedWithUserId: initial.recordedBy.userId,
    comparedWithVersionAt: initial.updatedAt ?? initial.recordedAt,
    assessedAt: assessment.at,
    assessedBy: assessment.by,
  };
}

/**
 * The initial screen a review is compared with: the specimen's most recent
 * primary_screen, never the review itself. Undefined for the initial screen,
 * or when there isn't one.
 */
export function initialScreenFor(reviews: CytologyReviewRecord[], role: CytologyReviewRecord['role'], selfId?: string): CytologyReviewRecord | undefined {
  if (role === 'primary_screen') return undefined;
  const initials = reviews.filter(r => r.role === 'primary_screen' && r.id !== selfId);
  return initials.length ? initials.reduce((a, b) => (b.recordedAt > a.recordedAt ? b : a)) : undefined;
}
