// src/utils/blockExceptionStates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct follow-up building a full exception-states
// matrix for the grossing bench (STAT/urgent, 0 slides, Consumed/
// Entirely Submitted, Damaged, Lost). One, single, shared source of
// truth for how each state is computed — used by both
// ManageReprintsModal.tsx and MaterialTreePanel.tsx, so the two
// surfaces can never quietly disagree about whether a given block or
// specimen is in one of these states.
// ─────────────────────────────────────────────────────────────────────────────

import type { TFunction } from 'i18next';
import type { Case } from '@/types/case/Case';
import type { StainOrder, HistologyBlock, Specimen } from '@/types/case/Specimen';

/** A block's own priority override wins if set; otherwise it inherits
 *  the case's own order.priority — the same real resolution
 *  HeaderBar.tsx's own priority badge already uses. */
export function isUrgent(block: { priority?: string }, caseData: Case): boolean {
  return (block.priority ?? caseData.order.priority) === 'STAT';
}

export function isExhausted(block: Pick<HistologyBlock, 'status'>): boolean {
  return block.status === 'Exhausted';
}

/**
 * Batch 610 (#16): a block flagged 'Block exhausted' cannot be cut until the ordering
 * pathologist answers: Approve destructive cutting lets it go on; Cancel or Modify puts
 * the block's status back. True while any order on the block has that flag still open.
 * (A block whose status is Exhausted from grossing, with no flag, is not held up.)
 * Batch 731 (spec §10.6): also true while an order waits for the block to be re-embedded.
 */
export function cuttingBlockedByExhaustion(block: Pick<HistologyBlock, 'status' | 'stains'>): boolean {
  const open = (st: string) => (block.stains ?? []).some(s => s.exception?.reason === 'Block exhausted' && s.status !== 'Cancelled' && s.exception.status === st);
  // Batch 732: an order waiting for re-embedding holds the block even when only its pieces were used up.
  return (block.status === 'Exhausted' && open('pending_pathologist_review')) || open('reembed_requested');
}

/**
 * Batch 732 (review of Batch 731, spec §10.6 "never silently proceeds"): whether this one slide may be cut now.
 * Besides the holds above, on an Exhausted block a slide still waiting to be cut (Pending Cut) is held unless the
 * ordering pathologist approved destructive cutting for it or its block was re-embedded for it. The tech flags it
 * ("Block exhausted") so the pathologist can choose an alternative.
 */
export function stainCuttingBlocked(block: Pick<HistologyBlock, 'status' | 'stains'>, stain: Pick<StainOrder, 'status' | 'exception'> | undefined): boolean {
  if (cuttingBlockedByExhaustion(block)) return true;
  if (block.status !== 'Exhausted' || !stain || stain.status !== 'Pending Cut') return false;
  return stain.exception?.status !== 'approved_destructive_cut' && stain.exception?.status !== 'reembedded';
}

/** The order a "Block exhausted" flag goes on: a slide still waiting to be cut, not a control, with no open flag and
 *  not waiting for re-embedding (never a finished or cancelled slide). Undefined: nothing left to flag. */
export function exhaustionFlagTarget(block: Pick<HistologyBlock, 'stains'>): StainOrder | undefined {
  return (block.stains ?? []).find(s => s.status === 'Pending Cut' && !s.isControlSlide
    && s.exception?.status !== 'pending_pathologist_review' && s.exception?.status !== 'reembed_requested');
}

export function isLost(block: Pick<HistologyBlock, 'status'>): boolean {
  return block.status === 'Lost';
}

export function isDamaged(block: Pick<HistologyBlock, 'status'>): boolean {
  return block.status === 'Damaged';
}

/**
 * Real feature, per direct follow-up: "Add a clear badge... directly
 * on the Specimen B tile" for a specimen that's been "entirely
 * submitted" — every real bit of its tissue used up during grossing,
 * nothing left. Deliberately derived from the specimen's own real
 * blocks (every block Exhausted) rather than a new, separate field —
 * Specimen has no field for this at all today, and a derived state
 * can never drift out of sync with the blocks it's actually
 * describing the way a second, independently-set field could.
 * Requires at least one real block — an empty specimen (no blocks
 * grossed yet) is not "entirely submitted," it just hasn't started.
 */
export function isEntirelySubmitted(specimen: Pick<Specimen, 'blocks'>): boolean {
  const blocks = specimen.blocks ?? [];
  return blocks.length > 0 && blocks.every(b => b.status === 'Exhausted');
}

/** "Entirely submitted in blocks B1–B2" — real block labels, not a
 *  generic "all blocks" phrase, so a tech can see at a glance exactly
 *  which cassettes accounted for all the tissue. Takes `t` explicitly
 *  (shared by two already-translated surfaces, ManageReprintsModal.tsx
 *  and MaterialTreePanel.tsx) since this is a plain function, not a
 *  component or hook. */
export function entirelySubmittedBlockRangeText(specimen: Pick<Specimen, 'label' | 'blocks'>, t: TFunction): string {
  const labels = (specimen.blocks ?? []).map(b => `${specimen.label}${b.label}`);
  if (labels.length === 0) return '';
  const range = labels.length === 1 ? labels[0] : `${labels[0]}–${labels[labels.length - 1]}`;
  return t('blockExceptionStates.entirelySubmittedRange', { count: labels.length, range });
}

/** Batch 737 (spec §10.6): whether a block scanned into a batch is exhausted (no tissue remains), so Batch
 *  Management can warn before it goes on to processing or cutting. A block or matrix block on the case; any other
 *  item (a slide, a decant) is never flagged here. Pure. */
export function exhaustedOnScan(
  caseData: { specimens?: { label: string; blocks?: Pick<HistologyBlock, 'label' | 'status'>[] }[]; matrixBlocks?: { id: string; status: HistologyBlock['status'] }[] },
  target: { level: string; blockNumber?: string; matrixBlockId?: string },
  specimenLetter: string | undefined,
): boolean {
  if (target.level === 'block') {
    const block = (caseData.specimens ?? []).find(sp => sp.label === specimenLetter)?.blocks?.find(b => b.label === target.blockNumber);
    return !!block && isExhausted(block);
  }
  if (target.level === 'matrix_block') return (caseData.matrixBlocks ?? []).find(m => m.id === target.matrixBlockId)?.status === 'Exhausted';
  return false;
}
