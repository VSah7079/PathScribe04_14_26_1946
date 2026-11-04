// src/services/billing/billingMaterialSync.test.ts
// Batch 451 (PS-316): the decisions that keep the AI Billing Code Review panel
// and the Material tab in step. The screens themselves are exercised in
// pages/SynopticReportPage/components/BillingMaterialSync.test.tsx.
import { describe, it, expect } from 'vitest';
import { resolveMaterialAssetClick, billingSelectionForMaterialBlock, billingHighlightsForSelection } from './billingMaterialSync';

const specimens = [
  { id: 'sp-a', blocks: [{ id: 'blk-a1' }, { id: 'blk-a2' }] },
  { id: 'sp-b', blocks: [{ id: 'blk-b1' }] },
  { id: 'sp-c' },
];

describe('PS-316 Material tab → billing panel', () => {
  it('a block (or one of its slides, which reports its block) selects that block\'s billing row under its own specimen', () => {
    expect(billingSelectionForMaterialBlock(specimens, 'blk-a2')).toEqual({ type: 'block', specimenId: 'sp-a', blockId: 'blk-a2' });
    expect(billingSelectionForMaterialBlock(specimens, 'blk-b1')).toEqual({ type: 'block', specimenId: 'sp-b', blockId: 'blk-b1' });
  });

  it('nothing selected, or an id that is not one of the case\'s blocks (a decant, a matrix block), selects no billing row', () => {
    expect(billingSelectionForMaterialBlock(specimens, undefined)).toBeNull();
    expect(billingSelectionForMaterialBlock(specimens, 'dec-1')).toBeNull();
  });

  it('a Material click on a block focuses that block (by its position); a decant focuses the decant; anything else nothing', () => {
    const blockIds = ['blk-a1', 'blk-a2', 'blk-b1'];
    const decantIds = ['dec-1'];
    expect(resolveMaterialAssetClick('blk-a2', blockIds, decantIds)).toEqual({ kind: 'block', blockIndex: 1, blockId: 'blk-a2' });
    expect(resolveMaterialAssetClick('dec-1', blockIds, decantIds)).toEqual({ kind: 'decant', decantId: 'dec-1' });
    expect(resolveMaterialAssetClick('mx-1', blockIds, decantIds)).toEqual({ kind: 'none' });
  });
});

describe('PS-316 billing panel → Material tab', () => {
  it('a block row highlights the stain that produced its active suggestion, names it in the report, and focuses the specimen', () => {
    expect(billingHighlightsForSelection(
      { type: 'block', specimenId: 'sp-a', blockId: 'blk-a2' },
      { sourceStainId: 'st-mlh1', sourceStainName: 'MLH1' },
      ['H&E', 'MLH1'],
    )).toEqual({ focusSpecimenId: 'sp-a', reportText: 'MLH1', stainId: 'st-mlh1' });
  });

  it('a block with nothing pending highlights no stain, but names its first stain in the report text', () => {
    expect(billingHighlightsForSelection({ type: 'block', specimenId: 'sp-b', blockId: 'blk-b1' }, undefined, ['H&E']))
      .toEqual({ focusSpecimenId: 'sp-b', reportText: 'H&E', stainId: undefined });
  });

  it('a specimen row focuses the specimen with no stain highlight; no selection clears everything', () => {
    expect(billingHighlightsForSelection({ type: 'specimen', specimenId: 'sp-a' }, { sourceStainId: 'st-x', sourceStainName: 'X' }, ['X']))
      .toEqual({ focusSpecimenId: 'sp-a', reportText: undefined, stainId: undefined });
    expect(billingHighlightsForSelection(null, undefined, undefined))
      .toEqual({ focusSpecimenId: undefined, reportText: undefined, stainId: undefined });
  });
});

// Batch 452: decants have billing rows (services/material/billableMaterial.ts),
// and the panel reacts to material events.
import { billingReactionToMaterialEvent } from './billingMaterialSync';
import { billableMaterialOf } from '../material/billableMaterial';

describe('decants in billing (Batch 452)', () => {
  const decantEvent = { parentId: 'sp-a', childId: 'dc-1', materialType: 'cell_block', volumeOrWeight: null, timestamp: 't' };
  it('on the billable material, a decant selected on the Material tab selects its billing row', () => {
    const specimens = billableMaterialOf([{ id: 'sp-a', label: 'A', blocks: [], decants: [{ id: 'dc-1', label: 'D1', stains: [] }] }]);
    expect(billingSelectionForMaterialBlock(specimens, 'dc-1')).toEqual({ type: 'block', specimenId: 'sp-a', blockId: 'dc-1' });
  });
  it('an added or changed decant is focused; a deleted one clears its row; a rollback is announced', () => {
    expect(billingReactionToMaterialEvent({ type: 'MATERIAL_DECANTED', caseId: 'C', change: 'added', decant: decantEvent }))
      .toEqual({ focusMaterialId: 'dc-1', notice: { key: 'billingReviewPanel.materialSync.decantAdded', params: {} } });
    expect(billingReactionToMaterialEvent({ type: 'MATERIAL_DECANTED', caseId: 'C', change: 'modified', decant: decantEvent }).notice.key).toBe('billingReviewPanel.materialSync.decantChanged');
    expect(billingReactionToMaterialEvent({ type: 'MATERIAL_DECANTED', caseId: 'C', change: 'deleted', decant: decantEvent }))
      .toEqual({ clearMaterialId: 'dc-1', notice: { key: 'billingReviewPanel.materialSync.decantRemoved', params: {} } });
    expect(billingReactionToMaterialEvent({ type: 'MATERIAL_ROLLED_BACK', caseId: 'C', decant: decantEvent, reason: 'saveFailed' }).notice.key).toBe('billingReviewPanel.materialSync.rolledBack');
  });
});
