// src/services/cytology/cytologyReviewDraft.ts
// ─────────────────────────────────────────────────────────────────────────────
// The Bethesda-style review form's in-progress draft, and the conversions
// between it and a saved review. Batch 410: moved here from
// pages/CytologyWorklistPage/cytologyDrafts.ts (which now re-exports it) and
// from inline code in CytologyScreeningPage.tsx, so the page only renders.
// The CISOE-A draft is in cisoeADraft.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyCategorySelection, CytologyReviewMode, CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import { resolveOwnCytologyReview } from './resolveOwnCytologyReview';
import { resolveCytologyReviewMode } from './resolveCytologyReviewMode';
import { cisoeADraftFromScore, type CisoeADraft } from './cisoeADraft';

export interface Draft {
  generalCategorizationId: string;
  adequacySelections: CytologyCategorySelection[];
  primaryInterpretationId: string;
  primaryInterpretationComment: string;
  additionalInterpretations: CytologyCategorySelection[];
  recommendations: CytologyCategorySelection[];
  notes: string;
  /** Local to the draft until the outer "Save as [Role]" action persists it,
   *  matching every other draft field's own save timing exactly. */
  synopticData?: CytologyReviewRecord['synopticData'];
}

export const EMPTY_DRAFT: Draft = {
  generalCategorizationId: '', adequacySelections: [],
  primaryInterpretationId: '', primaryInterpretationComment: '',
  additionalInterpretations: [], recommendations: [], notes: '',
};

/** A saved review back as an editable draft (the reviewer editing their own review). */
export function draftFromReview(review: Pick<CytologyReviewRecord, 'generalCategorizationId' | 'adequacySelections' | 'primaryInterpretationId' | 'primaryInterpretationComment' | 'additionalInterpretations' | 'recommendations' | 'notes'>): Draft {
  return {
    generalCategorizationId: review.generalCategorizationId ?? '',
    adequacySelections: review.adequacySelections ?? [],
    primaryInterpretationId: review.primaryInterpretationId,
    primaryInterpretationComment: review.primaryInterpretationComment ?? '',
    additionalInterpretations: review.additionalInterpretations ?? [],
    recommendations: review.recommendations ?? [],
    notes: review.notes ?? '',
  };
}

/** Another reviewer's review copied as a starting point: the picks, never their comment or notes. */
export function draftFromClonedReview(cloned: Pick<CytologyReviewRecord, 'generalCategorizationId' | 'adequacySelections' | 'primaryInterpretationId' | 'additionalInterpretations' | 'recommendations'>): Draft {
  return { ...draftFromReview(cloned), primaryInterpretationComment: '', notes: '' };
}

/** The review fields a draft saves (empty lists and blank text left out). */
export function reviewFieldsFromDraft(draft: Draft) {
  return {
    adequacySelections: draft.adequacySelections.length ? draft.adequacySelections : undefined,
    generalCategorizationId: draft.generalCategorizationId || undefined,
    primaryInterpretationId: draft.primaryInterpretationId,
    primaryInterpretationComment: draft.primaryInterpretationComment || undefined,
    additionalInterpretations: draft.additionalInterpretations.length ? draft.additionalInterpretations : undefined,
    recommendations: draft.recommendations.length ? draft.recommendations : undefined,
    notes: draft.notes || undefined,
    synopticData: draft.synopticData,
  };
}

/** A synoptic narrative inserted into the notes: appended after a blank line, never replacing what's written. */
export function notesWithNarrative(notes: string, narrative: string): string {
  return notes ? `${notes}\n\n${narrative}` : narrative;
}

/** Unsaved changes: the draft differs from what was last loaded or saved (plain data, so a JSON compare is exact). */
export function isDraftDirty<T>(draft: T, baseline: T): boolean {
  return JSON.stringify(draft) !== JSON.stringify(baseline);
}

/**
 * The reviewer's own review on this specimen, opened for editing (a user edits
 * their own review; nobody else's): its id, how it was screened, and both
 * drafts. Null when they haven't reviewed this specimen.
 */
export function ownReviewForEditing(reviews: CytologyReviewRecord[], userId: string):
  { reviewId: string; reviewMode: CytologyReviewMode; draft: Draft; cisoeADraft?: CisoeADraft } | null {
  const own = resolveOwnCytologyReview(reviews, userId);
  if (!own) return null;
  return {
    reviewId: own.id,
    reviewMode: resolveCytologyReviewMode(own),
    draft: draftFromReview(own),
    cisoeADraft: own.cisoeAScore ? cisoeADraftFromScore(own.cisoeAScore, own.notes) : undefined,
  };
}
