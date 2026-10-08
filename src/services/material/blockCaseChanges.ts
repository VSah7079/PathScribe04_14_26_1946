// src/services/material/blockCaseChanges.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-71 (Batch 458): the report page's block, stain and Biopsy Array changes
// as pure "apply this change to a case" functions, and the versioned save
// that uses them.
//
// Several of these changes are made AFTER the LIS has acknowledged the
// physical order (cancel, restain, block/recut, Biopsy Array). They used to
// catch a ConcurrencyConflictError and save again with no version, which
// silently overwrote whatever the other person had just saved. Now the
// first save goes out with the screen's version; on a conflict the same
// change is re-applied to the newest case (updateCaseWithRetry), so the
// LIS-acknowledged order is still recorded and the other person's
// concurrent edits survive. Nothing here ever saves without a version.
//
// Each change derives everything it writes from the case it is given, and
// returns null when, in that case, there is nothing left to do (the block
// was removed, the placeholder was already released, ...).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, StainOrder } from '@/types/case/Specimen';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import { cassetteIdentifier, slideIdentifier } from '@/types/labels/LabelData';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import { updateCaseWithRetry, type CaseWriteDeps } from '@/services/cases/caseWrite';

export type CaseChange = (current: Case) => Partial<Case> | null;

/** Makes a fresh id with the given prefix (`stain`, `blk-<specimenId>`). */
export type IdMaker = (prefix: string) => string;
export const defaultIdMaker: IdMaker = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const TERMINAL_STAIN_STATUSES = new Set(['Coverslipped', 'Ready for Review', 'QC Failed', 'Cancelled']);

/** Rewrites one block of one specimen; null when either is gone. */
function patchBlock(current: Case, specimenId: string, blockId: string, patch: (b: HistologyBlock) => HistologyBlock | null): Partial<Case> | null {
  const specimens = current.specimens ?? [];
  const sp = specimens.find(s => s.id === specimenId);
  const block = sp?.blocks?.find(b => b.id === blockId);
  if (!sp || !block) return null;
  const next = patch(block);
  if (!next) return null;
  return {
    specimens: specimens.map((s: Specimen) => s.id !== specimenId ? s : {
      ...s,
      blocks: (s.blocks ?? []).map(b => b.id === blockId ? next : b),
    }),
  };
}

/** Cancel a block (status Cancelled, out of any array) and every stain not yet finished. */
export const cancelBlockChange = (p: { specimenId: string; blockId: string; reason: string; cancelledBy: string; cancelledAt: string }): CaseChange =>
  current => patchBlock(current, p.specimenId, p.blockId, b => ({
    ...b,
    status: 'Cancelled' as const,
    sharedCassetteId: undefined,
    positionInBlock: undefined,
    cancelReason: p.reason.trim(),
    cancelledBy: p.cancelledBy,
    cancelledAt: p.cancelledAt,
    stains: b.stains.map(stain => TERMINAL_STAIN_STATUSES.has(stain.status) ? stain : { ...stain, status: 'Cancelled' as const }),
  }));

/**
 * Order a restain. The target slide's own CURRENT stain decides: an
 * Unstained spare converts in place; a stained slide is never touched and a
 * new slide (`newSlideId`) is ordered pointing back at it.
 */
export const orderRestainChange = (p: {
  specimenId: string; blockId: string; targetSlideId: string; stainName: string; reason: string;
  orderedBy: string; orderedAt: string; newSlideId: string; unstainedLabel: string;
}): CaseChange =>
  current => patchBlock(current, p.specimenId, p.blockId, b => {
    const target = b.stains.find(st => st.id === p.targetSlideId);
    if (!target) return null;
    const stainName = p.stainName.trim();
    const reason = p.reason.trim();
    if (target.stainName === p.unstainedLabel) {
      return {
        ...b,
        stains: b.stains.map(st => st.id !== p.targetSlideId ? st : {
          ...st, stainName, status: 'Staining' as const,
          restainReason: reason, restainOrderedBy: p.orderedBy, restainOrderedAt: p.orderedAt,
        }),
      };
    }
    if (b.stains.some(st => st.id === p.newSlideId)) return null; // already recorded
    const newRestain: StainOrder = {
      id: p.newSlideId, stainName, status: 'Pending Cut',
      restainReason: reason, restainOrderedBy: p.orderedBy, restainOrderedAt: p.orderedAt,
      restainOfSlideId: p.targetSlideId,
    };
    return { ...b, stains: [...b.stains, newRestain] };
  });

/** Append a new block to a specimen (no-op if it is already there). */
export const appendBlockChange = (specimenId: string, newBlock: HistologyBlock): CaseChange =>
  current => {
    const specimens = current.specimens ?? [];
    const sp = specimens.find(s => s.id === specimenId);
    if (!sp || (sp.blocks ?? []).some(b => b.id === newBlock.id)) return null;
    return { specimens: specimens.map(s => s.id === specimenId ? { ...s, blocks: [...(s.blocks ?? []), newBlock] } : s) };
  };

/** Record the LIS's answer on one block. */
export const setBlockLisStatusChange = (specimenId: string, blockId: string, status: 'confirmed' | 'rejected'): CaseChange =>
  current => patchBlock(current, specimenId, blockId, b => ({ ...b, lisRequestStatus: status }));

/** Release still-Pending placeholder blocks (Pending → Grossed); null when none is still Pending. */
export const releasePendingBlocksChange = (specimenId: string, blockIds: string[]): CaseChange =>
  current => {
    const ids = new Set(blockIds);
    const specimens = current.specimens ?? [];
    const sp = specimens.find(s => s.id === specimenId);
    if (!sp || !(sp.blocks ?? []).some(b => ids.has(b.id) && b.status === 'Pending')) return null;
    return {
      specimens: specimens.map(s => s.id !== specimenId ? s : {
        ...s,
        blocks: (s.blocks ?? []).map(b => ids.has(b.id) && b.status === 'Pending' ? { ...b, status: 'Grossed' as const } : b),
      }),
    };
  };

/** Remove a placeholder block that is still Pending; null when it is gone or no longer Pending. */
export const removePendingBlockChange = (specimenId: string, blockId: string): CaseChange =>
  current => {
    const specimens = current.specimens ?? [];
    const block = specimens.find(s => s.id === specimenId)?.blocks?.find(b => b.id === blockId);
    if (!block || block.status !== 'Pending') return null;
    return { specimens: specimens.map(s => s.id !== specimenId ? s : { ...s, blocks: (s.blocks ?? []).filter(b => b.id !== blockId) }) };
  };

/** Add a new Biopsy Array (matrix block) and link its specimens to it. */
export const createMatrixBlockChange = (specimenIds: string[], matrixBlock: MatrixBlock): CaseChange =>
  current => {
    const matrixBlocks = current.matrixBlocks ?? [];
    if (matrixBlocks.some(m => m.id === matrixBlock.id)) return null;
    return {
      specimens: (current.specimens ?? []).map(s =>
        specimenIds.includes(s.id) && !(s.matrixBlockIds ?? []).includes(matrixBlock.id)
          ? { ...s, matrixBlockIds: [...(s.matrixBlockIds ?? []), matrixBlock.id] } : s),
      matrixBlocks: [...matrixBlocks, matrixBlock],
    };
  };

/** The ordinary block a specimen gets back when it leaves a Biopsy Array. */
function blockLeavingArray(sp: Specimen, matrixBlock: MatrixBlock, fullAccession: string | undefined, makeId: IdMaker): HistologyBlock {
  const blockLabel = String((sp.blocks ?? []).length + 1);
  return {
    id: makeId(`blk-${sp.id}`),
    label: blockLabel,
    status: matrixBlock.status,
    stains: [{
      id: makeId('stain'), stainName: 'H&E', status: 'Pending Cut',
      displayId: fullAccession ? slideIdentifier(fullAccession, sp.label, blockLabel, 'L1') : undefined,
    }],
    displayId: fullAccession ? cassetteIdentifier(fullAccession, sp.label, blockLabel) : undefined,
  };
}

/**
 * Set a Biopsy Array's specimens to `specimenIds` (in position order),
 * diffed against the array as it is in `current`: specimens leaving get an
 * ordinary block of their own, specimens joining get linked, positions are
 * renumbered. Null when the array is gone.
 */
export const updateMatrixBlockParticipantsChange = (p: { matrixBlockId: string; specimenIds: string[]; fullAccession?: string; makeId?: IdMaker }): CaseChange =>
  current => {
    const makeId = p.makeId ?? defaultIdMaker;
    const matrixBlocks = current.matrixBlocks ?? [];
    const matrixBlock = matrixBlocks.find(m => m.id === p.matrixBlockId);
    if (!matrixBlock) return null;
    const linked = matrixBlock.participants.map(x => x.specimenId);
    const toAdd = p.specimenIds.filter(id => !linked.includes(id));
    const toRemove = linked.filter(id => !p.specimenIds.includes(id));
    const specimens = (current.specimens ?? []).map((s: Specimen) => {
      if (toRemove.includes(s.id)) {
        return {
          ...s,
          matrixBlockIds: (s.matrixBlockIds ?? []).filter(id => id !== p.matrixBlockId),
          blocks: [...(s.blocks ?? []), blockLeavingArray(s, matrixBlock, p.fullAccession, makeId)],
        };
      }
      if (toAdd.includes(s.id) && !(s.matrixBlockIds ?? []).includes(p.matrixBlockId)) {
        return { ...s, matrixBlockIds: [...(s.matrixBlockIds ?? []), p.matrixBlockId] };
      }
      return s;
    });
    const participants = p.specimenIds.map((id, i) => ({
      specimenId: id,
      positionInBlock: i + 1,
      tissueType: matrixBlock.participants.find(x => x.specimenId === id)?.tissueType,
    }));
    return { specimens, matrixBlocks: matrixBlocks.map(m => m.id === p.matrixBlockId ? { ...m, participants } : m) };
  };

/** Dissolve a Biopsy Array: every participant gets an ordinary block back; null when the array is gone. */
export const dissolveMatrixBlockChange = (p: { matrixBlockId: string; fullAccession?: string; makeId?: IdMaker }): CaseChange =>
  current => {
    const makeId = p.makeId ?? defaultIdMaker;
    const matrixBlocks = current.matrixBlocks ?? [];
    const matrixBlock = matrixBlocks.find(m => m.id === p.matrixBlockId);
    if (!matrixBlock) return null;
    const participantIds = new Set(matrixBlock.participants.map(x => x.specimenId));
    return {
      specimens: (current.specimens ?? []).map((s: Specimen) => !participantIds.has(s.id) ? s : {
        ...s,
        matrixBlockIds: (s.matrixBlockIds ?? []).filter(id => id !== p.matrixBlockId),
        blocks: [...(s.blocks ?? []), blockLeavingArray(s, matrixBlock, p.fullAccession, makeId)],
      }),
      matrixBlocks: matrixBlocks.filter(m => m.id !== p.matrixBlockId),
    };
  };

// ── The save ─────────────────────────────────────────────────────────────────

export type ScreenCaseSaveResult =
  | { ok: true; version: number; updates: Partial<Case>; retried: boolean }
  | { ok: false; reason: 'notFound' | 'noChange' | 'conflict'; retried: boolean };

/**
 * A person's change from a screen that loaded the case at `knownVersion`.
 * `firstUpdates` is the change as the screen already applied it (built from
 * its copy); it is saved with `knownVersion`. If someone else saved in
 * between, `change` is re-applied to the newest case and saved with that
 * case's version (up to 3 tries). Never saves without a version. When
 * `retried`, `updates` holds what was actually saved (the newest case's
 * arrays with this change applied), so the screen can adopt it.
 */
export async function saveScreenCaseChange(
  caseId: string,
  firstUpdates: Partial<Case>,
  change: CaseChange,
  knownVersion: number,
  deps: CaseWriteDeps,
): Promise<ScreenCaseSaveResult> {
  try {
    await deps.updateCase(caseId, firstUpdates, knownVersion);
    return { ok: true, version: knownVersion + 1, updates: firstUpdates, retried: false };
  } catch (e) {
    if (!(e instanceof ConcurrencyConflictError)) throw e;
  }
  const r = await updateCaseWithRetry(caseId, change, deps);
  if (r.ok === false) return { ok: false, reason: r.reason, retried: true };
  return { ok: true, version: r.version, updates: r.updates, retried: true };
}
