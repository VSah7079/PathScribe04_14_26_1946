// src/services/cytology/cytologyReviewNotes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 412 (PS-359; Pete). Pre-sign-out review without "review ping-pong":
//
//   • Nobody edits another person's review. A reviewer leaves a note on one
//     part of it (adequacy, general categorization, primary, secondary,
//     recommendations, notes). Notes are advisory by default and never stop
//     anyone.
//   • A note marked "Requires revision" (cytology:revision:request) stops a
//     cytotechnologist signing the specimen out (the sign-out gate's
//     pending_author_revision) until:
//       – the review's author acknowledges it and saves a revised review
//         (only the author can: Pete, "Only the author"); or
//       – a pathologist records their own review of the specimen, which
//         resolves it (Pete: "Blocks CT only"; the pathologist is the final
//         gatekeeper and never waits).
//   • saveCytologyReview applies both resolutions when a review is saved.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologyReviewNote, CytologyReviewRecord, CytologyReviewSection } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';
import { patchCytologyScreening } from './cytologyCaseActions';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const CYTOLOGY_REVIEW_SECTIONS: CytologyReviewSection[] = ['adequacy', 'generalCategorization', 'primary', 'additional', 'recommendations', 'notes'];

const notesOf = (specimen: any): CytologyReviewNote[] => specimen?.cytologyScreening?.reviewNotes ?? [];
const isOpenRevision = (n: CytologyReviewNote) => n.requiresRevision && (n.status === 'open' || n.status === 'acknowledged');

/** A revision request is still open on the specimen: a cytotechnologist can't sign it out. */
export function hasPendingAuthorRevision(specimen: any): boolean {
  return notesOf(specimen).some(isOpenRevision);
}

/** The notes on one review, oldest first. */
export function notesForReview(specimen: any, reviewId: string): CytologyReviewNote[] {
  return notesOf(specimen).filter(n => n.reviewId === reviewId).sort((a, b) => a.at.localeCompare(b.at));
}

export async function addCytologyReviewNote(
  input: { caseData: Case; specimenId: string; specimen: any; review: CytologyReviewRecord; section: CytologyReviewSection; text: string; requiresRevision: boolean; user: { id: string; name: string } },
  deps: CytologyWorkspaceDeps,
): Promise<'ownReview' | 'textRequired' | 'notPermitted' | 'added'> {
  if (input.review.recordedBy.userId === input.user.id) return 'ownReview';
  const text = input.text.trim();
  if (!text) return 'textRequired';
  if (input.requiresRevision) {
    const decision = await deps.enforce('cytology:revision:request', { caseId: input.caseData.id });
    if (!decision.allowed) return 'notPermitted';
  }
  const note: CytologyReviewNote = {
    id: `rn-${deps.newId()}`, reviewId: input.review.id, reviewAuthorId: input.review.recordedBy.userId,
    section: input.section, text, requiresRevision: input.requiresRevision,
    by: { userId: input.user.id, userName: input.user.name }, at: deps.now().toISOString(), status: 'open',
  };
  // PS-71 (Batch 458): built from the specimen as saved, so a note someone else added in between is kept.
  await patchCytologyScreening(input.caseData, input.specimenId, sp => ({ reviewNotes: [...notesOf(sp), note] }), deps);
  if (input.requiresRevision) {
    deps.logAudit({
      type: 'user', event: 'Cytology review revision requested',
      detail: `${input.user.name} asked ${input.review.recordedBy.userName} to revise the ${input.section} of review ${input.review.id} (specimen ${input.specimenId}): ${text}`,
      user: input.user.name || input.user.id, caseId: input.caseData.accession?.fullAccession ?? input.caseData.id, confidence: null,
    });
  }
  return 'added';
}

/** Only the review's author acknowledges a note on it. */
export async function acknowledgeCytologyReviewNote(
  input: { caseData: Case; specimenId: string; specimen: any; noteId: string; user: { id: string } },
  deps: CytologyWorkspaceDeps,
): Promise<'notFound' | 'notAuthor' | 'notOpen' | 'acknowledged'> {
  const note = notesOf(input.specimen).find(n => n.id === input.noteId);
  if (!note) return 'notFound';
  if (note.reviewAuthorId !== input.user.id) return 'notAuthor';
  if (note.status !== 'open') return 'notOpen';
  const at = deps.now().toISOString();
  // PS-71 (Batch 458): built from the specimen as saved.
  await patchCytologyScreening(input.caseData, input.specimenId, sp => ({
    reviewNotes: notesOf(sp).map(n => (n.id === note.id ? { ...n, status: 'acknowledged', acknowledgedAt: at } : n)),
  }), deps);
  return 'acknowledged';
}

/**
 * What saving a review does to the specimen's notes. The author saving their
 * own review turns its acknowledged notes into revised ones (an unacknowledged
 * note stays open: the author acknowledges first). A pathologist's review
 * resolves every open revision request on the specimen. Null: nothing changes.
 */
export function reviewNotesAfterSave(
  specimen: any,
  saved: { reviewId: string; byUserId: string; byUserName: string; isPathologistReview: boolean },
  at: string,
): CytologyReviewNote[] | null {
  let changed = false;
  const next = notesOf(specimen).map(n => {
    if (n.reviewId === saved.reviewId && n.reviewAuthorId === saved.byUserId && n.status === 'acknowledged') {
      changed = true;
      return { ...n, status: 'revised' as const, closedAt: at };
    }
    if (saved.isPathologistReview && isOpenRevision(n) && n.reviewId !== saved.reviewId) {
      changed = true;
      return { ...n, status: 'resolvedByPathologist' as const, closedAt: at, resolvedByReviewId: saved.reviewId, resolvedBy: { userId: saved.byUserId, userName: saved.byUserName } };
    }
    return n;
  });
  return changed ? next : null;
}
