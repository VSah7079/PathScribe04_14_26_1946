// src/services/reportRelease/heldReleaseRules.ts
// Batch 534 (Pete, Oct 12, 2026): the release delay for every report output.
// What is due, who may recall, and what can be recalled yet. Pure.
import type { HeldRelease, HeldReleaseKind } from '@/types/reportRelease/HeldRelease';

/** Kinds Recall can reopen (Batch 535: surgical corrections and addenda, and autopsy PAD/FAD, too).
 *  The surgical FINAL sign-out is recalled from its own banner (reportReleaseService.recall). */
export const RECALLABLE_KINDS: readonly HeldReleaseKind[] = [
  'cytology-sign-out', 'cytology-late-sign-out', 'cytology-finalize-early', 'cytology-revision', 'cytology-preliminary', 'surgical-preliminary',
  'surgical-amendment', 'autopsy',
];

export function heldReleaseDue(h: Pick<HeldRelease, 'status' | 'expiresAt'>, now: Date): boolean {
  return h.status === 'held' && new Date(h.expiresAt).getTime() <= now.getTime();
}

export type HeldRecallRefusal = 'notHeld' | 'expired' | 'notReleaser' | 'notRecallable' | 'superseded';

/** Why this person can't recall it now, or null (Pete: only the person who released it). */
export function heldRecallRefusal(h: HeldRelease, userId: string, now: Date): HeldRecallRefusal | null {
  if (h.status !== 'held') return 'notHeld';
  if (heldReleaseDue(h, now)) return 'expired';
  if (h.releasedBy.userId !== userId) return 'notReleaser';
  if (!RECALLABLE_KINDS.includes(h.kind)) return 'notRecallable';
  return null;
}

/** The releases still waiting for a case, soonest first (the surgical sign-out has its own banner). */
export function pendingHeldReleases(all: readonly HeldRelease[], caseId: string): HeldRelease[] {
  return all.filter(h => h.caseId === caseId && h.status === 'held' && h.kind !== 'surgical-sign-out')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

/**
 * Batch 534 (fixes a bug found by the Batch 533 review): the case status after a
 * surgical correction is released. A case still in its sign-out buffer
 * ('pending-release', e.g. Finalize followed straight away by the correction)
 * stays there, so the buffer still holds it; before, it was set 'finalized',
 * leaving the buffer fields behind.
 */
export function caseStatusAfterCorrection(current: string | undefined): 'pending-release' | 'finalized' {
  return current === 'pending-release' ? 'pending-release' : 'finalized';
}
