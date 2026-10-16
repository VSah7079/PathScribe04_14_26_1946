// src/services/quality/reviewQueueCounts.ts
// Batch 396 (Pete): how many items wait in each peer-review queue, for the
// counts on the Worklist's queue tiles. Counts the same items the queues list:
// active cytology QC assignments (the unified queue) and the surgical
// post-sign-out QA items on the cases the reader can see, and (Batch 530)
// the deferred clinical mismatches awaiting secondary review.

import type { Case } from '@/types/case/Case';
import { buildSurgicalQaRows } from './surgicalQaReview';

export interface ReviewQueueCounts {
  cytologyQc: number | null;
  surgicalQa: number | null;
}

export interface ReviewQueueCountDeps {
  cytologyQcQueueSize: () => Promise<number | null>;
  listCases: () => Promise<Case[] | null>;
  /** Batch 530 (PS-554): deferred clinical mismatches awaiting secondary review (on the same tile). */
  mismatchQueueSize?: () => Promise<number>;
}

/** A queue whose items couldn't be loaded counts as null (the tile shows no number). */
export async function loadReviewQueueCounts(
  deps: ReviewQueueCountDeps,
  which: { cytologyQc: boolean; surgicalQa: boolean },
): Promise<ReviewQueueCounts> {
  const [cytologyQc, cases, mismatches] = await Promise.all([
    which.cytologyQc ? deps.cytologyQcQueueSize().catch(() => null) : Promise.resolve(null),
    which.surgicalQa ? deps.listCases().catch(() => null) : Promise.resolve(null),
    which.surgicalQa && deps.mismatchQueueSize ? deps.mismatchQueueSize().catch(() => 0) : Promise.resolve(0),
  ]);
  return { cytologyQc, surgicalQa: cases ? buildSurgicalQaRows(cases).length + mismatches : null };
}
