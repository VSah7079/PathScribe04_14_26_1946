// src/services/material/blockDeletion.ts
// ───────────────────────────────────────────────────────────────────────────
// Batch 588 (Pete, Oct 16 2026): deleting a block that is still in process.
//
// This is the pure part: what a delete does to the case. It is a SOFT delete:
// the block and its id stay on the case (chain of custody), the status becomes
// 'Deleted', every stain not yet finished is cancelled, the cassette position is
// released, and who / when / why is recorded on the block. Cancelling a block
// (a wrong piece in a block) is a different action and is unchanged.
//
// Only the 'in_process' tier exists so far. A block on a signed-out case (which
// includes every amended report: it was signed out first) is refused here;
// tiers 2 and 3 are later work.
// The permission, the billing deficiency and the audit entry are added by
// deleteBlockInProcess.ts. Policy: docs/product/BLOCK_DELETION.md.
// ───────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { HistologyBlock, BlockDeletion } from '@/types/case/Specimen';
import type { CaseChange } from './blockCaseChanges';

/** The picklist. The label for each is `blockDeletion.reasons.<code>`. 'other' needs a note. */
export const BLOCK_DELETION_REASON_CODES = ['enteredInError', 'duplicate', 'notNeeded', 'processingFailure', 'other'] as const;
export type BlockDeletionReasonCode = (typeof BLOCK_DELETION_REASON_CODES)[number];

const TERMINAL_STAIN_STATUSES = new Set(['Coverslipped', 'Ready for Review', 'QC Failed', 'Cancelled']);

export type BlockDeletionRefusal =
  | 'notFound' | 'alreadyDeleted' | 'reasonMissing' | 'noteRequired' | 'caseSignedOut';

/** What is missing from the reason the person gave, or null when it is complete. */
export function blockDeletionInputMissing(reasonCode: string, note: string | undefined): 'reasonMissing' | 'noteRequired' | null {
  if (!isBlockDeletionReasonCode(reasonCode)) return 'reasonMissing';
  if (reasonCode === 'other' && !(note ?? '').trim()) return 'noteRequired';
  return null;
}

/** Null when the case is still in process; otherwise why a block on it cannot be deleted here. */
export function caseBlockDeletionRefusal(caseData: Pick<Case, 'status' | 'finalizedAt'>): 'caseSignedOut' | null {
  return caseData.finalizedAt || SIGNED_OUT.has(String(caseData.status ?? '')) ? 'caseSignedOut' : null;
}

export function isBlockDeletionReasonCode(code: string): code is BlockDeletionReasonCode {
  return (BLOCK_DELETION_REASON_CODES as readonly string[]).includes(code);
}

/** The first reason a block cannot be deleted in process, or null when it can. */
export function blockDeletionRefusal(
  caseData: Pick<Case, 'specimens' | 'status' | 'finalizedAt'>,
  specimenId: string, blockId: string, reasonCode: string, note: string | undefined,
): BlockDeletionRefusal | null {
  const block = (caseData.specimens ?? []).find(s => s.id === specimenId)?.blocks?.find(b => b.id === blockId);
  if (!block) return 'notFound';
  if (block.status === 'Deleted') return 'alreadyDeleted';
  return blockDeletionInputMissing(reasonCode, note) ?? caseBlockDeletionRefusal(caseData);
}

/** Case statuses at or after sign-out (tiers 2 and 3 handle these later). */
const SIGNED_OUT = new Set(['finalized', 'closed', 'finalizing', 'pending-release', 'pending-countersign']);

/** The billing codes applied to a block (CPT and others); these are released by the delete. */
export function appliedCodesOf(block: Pick<HistologyBlock, 'coding'>): string[] {
  return [...new Set((block.coding?.cpt ?? []).map(c => c.code))];
}

/**
 * The case change for a delete. Derives everything from the case it is given, so it can be
 * re-applied to the newest case after a version conflict. Null when the block is gone or already deleted.
 */
export const deleteBlockChange = (p: {
  specimenId: string; blockId: string; reasonCode: BlockDeletionReasonCode; note?: string;
  deletedBy: string; deletedByName: string; deletedAt: string;
}): CaseChange => current => {
  const specimens = current.specimens ?? [];
  const sp = specimens.find(s => s.id === p.specimenId);
  const block = sp?.blocks?.find(b => b.id === p.blockId);
  if (!sp || !block || block.status === 'Deleted') return null;
  const deletion: BlockDeletion = {
    reasonCode: p.reasonCode,
    ...(p.note?.trim() ? { note: p.note.trim() } : {}),
    deletedBy: p.deletedBy, deletedByName: p.deletedByName, deletedAt: p.deletedAt,
    tier: 'in_process',
    releasedCodes: appliedCodesOf(block),
  };
  const next: HistologyBlock = {
    ...block,
    status: 'Deleted',
    sharedCassetteId: undefined,
    positionInBlock: undefined,
    coding: block.coding ? { ...block.coding, cpt: [] } : block.coding,
    deletion,
    stains: block.stains.map(st => TERMINAL_STAIN_STATUSES.has(st.status) ? st : { ...st, status: 'Cancelled' as const }),
  };
  return { specimens: specimens.map(s => s.id !== p.specimenId ? s : { ...s, blocks: (s.blocks ?? []).map(b => b.id === p.blockId ? next : b) }) };
};

// ─── Batch 610 (#11): tiers 2 and 3 ──────────────────────────────────────────

/** Reasons for an Invalidated / Superseded flag on an amended report. Label: `blockDeletion.flagReasons.<code>`. */
export const BLOCK_FLAG_REASON_CODES = ['wrongPatient', 'enteredInError', 'replaced', 'processingFailure', 'other'] as const;
export type BlockFlagReasonCode = (typeof BLOCK_FLAG_REASON_CODES)[number];
export const isBlockFlagReasonCode = (code: string): code is BlockFlagReasonCode => (BLOCK_FLAG_REASON_CODES as readonly string[]).includes(code);

export type SignedOutDeletionRefusal = 'notFound' | 'alreadyDeleted' | 'reasonMissing' | 'noteRequired' | 'caseNotSignedOut';

/** Tier 2: the first reason a block cannot be invalidated after sign-out, or null when it can. Reasons use the same picklist as tier 1. */
export function signedOutDeletionRefusal(
  caseData: Pick<Case, 'specimens' | 'status' | 'finalizedAt'>,
  specimenId: string, blockId: string, reasonCode: string, note: string | undefined,
): SignedOutDeletionRefusal | null {
  const block = (caseData.specimens ?? []).find(s => s.id === specimenId)?.blocks?.find(b => b.id === blockId);
  if (!block) return 'notFound';
  if (block.status === 'Deleted' || block.status === 'Invalidated') return 'alreadyDeleted';
  const missing = blockDeletionInputMissing(reasonCode, note);
  if (missing) return missing;
  return caseBlockDeletionRefusal(caseData) ? null : 'caseNotSignedOut';
}

/** Tier 2 change: a signed-out case's block becomes Invalidated (soft delete; id, history and who/when/why stay). */
export const invalidateBlockChange = (p: {
  specimenId: string; blockId: string; reasonCode: BlockDeletionReasonCode; note?: string;
  deletedBy: string; deletedByName: string; deletedAt: string;
}): CaseChange => current => {
  const specimens = current.specimens ?? [];
  const sp = specimens.find(s => s.id === p.specimenId);
  const block = sp?.blocks?.find(b => b.id === p.blockId);
  if (!sp || !block || block.status === 'Deleted' || block.status === 'Invalidated') return null;
  const deletion: BlockDeletion = {
    reasonCode: p.reasonCode,
    ...(p.note?.trim() ? { note: p.note.trim() } : {}),
    deletedBy: p.deletedBy, deletedByName: p.deletedByName, deletedAt: p.deletedAt,
    tier: 'signed_out',
    releasedCodes: appliedCodesOf(block),
  };
  const next: HistologyBlock = {
    ...block,
    status: 'Invalidated',
    sharedCassetteId: undefined,
    positionInBlock: undefined,
    coding: block.coding ? { ...block.coding, cpt: [] } : block.coding,
    deletion,
    stains: block.stains.map(st => TERMINAL_STAIN_STATUSES.has(st.status) ? st : { ...st, status: 'Cancelled' as const }),
  };
  return { specimens: specimens.map(s => s.id !== p.specimenId ? s : { ...s, blocks: (s.blocks ?? []).map(b => b.id === p.blockId ? next : b) }) };
};

export type AmendmentFlagRefusal = 'notFound' | 'alreadyDeleted' | 'reasonMissing' | 'noteRequired' | 'notAmendedReport';

/** Tier 3: only a report that has been amended, corrected or added to can carry the flag; a deleted block cannot. */
export function amendmentFlagRefusal(
  caseData: Pick<Case, 'specimens' | 'lastRevisionType'>,
  specimenId: string, blockId: string, reasonCode: string, note: string | undefined,
): AmendmentFlagRefusal | null {
  const block = (caseData.specimens ?? []).find(s => s.id === specimenId)?.blocks?.find(b => b.id === blockId);
  if (!block) return 'notFound';
  if (block.status === 'Deleted' || block.status === 'Invalidated') return 'alreadyDeleted';
  if (!isBlockFlagReasonCode(reasonCode)) return 'reasonMissing';
  if (reasonCode === 'other' && !(note ?? '').trim()) return 'noteRequired';
  const rev = caseData.lastRevisionType;
  return rev && rev !== 'original' ? null : 'notAmendedReport';
}

/** Tier 3 change: sets (or replaces) the flag. The block is not deleted and its status does not change. */
export const flagBlockAmendmentChange = (p: {
  specimenId: string; blockId: string; kind: 'invalidated' | 'superseded'; reasonCode: BlockFlagReasonCode; note?: string;
  flaggedBy: string; flaggedByName: string; flaggedAt: string; supersededByBlockId?: string;
}): CaseChange => current => {
  const specimens = current.specimens ?? [];
  const block = specimens.find(s => s.id === p.specimenId)?.blocks?.find(b => b.id === p.blockId);
  if (!block || block.status === 'Deleted' || block.status === 'Invalidated') return null;
  const amendmentFlag = {
    kind: p.kind, reasonCode: p.reasonCode,
    ...(p.note?.trim() ? { note: p.note.trim() } : {}),
    flaggedBy: p.flaggedBy, flaggedByName: p.flaggedByName, flaggedAt: p.flaggedAt,
    ...(p.kind === 'superseded' && p.supersededByBlockId ? { supersededByBlockId: p.supersededByBlockId } : {}),
  };
  return { specimens: specimens.map(s => s.id !== p.specimenId ? s : { ...s, blocks: (s.blocks ?? []).map(b => b.id === p.blockId ? { ...b, amendmentFlag } : b) }) };
};
