// Batch 731 (spec §10.4): item lineage — a slide points to its block, a block to its specimen container, an aliquot
// to its slide, a matrix slide to its matrix block.
import { describe, it, expect } from 'vitest';
import { caseLineage, parentItemIdOf, childItemsOf, ancestryOf, benchParentItemId } from './materialLineage';
import type { Case } from '@/types/case/Case';

const caseData = {
  id: 'c1', accession: { fullAccession: 'S26-4403', accessionNumber: 'S26-4403' },
  specimens: [{
    id: 'sp1', label: 'A', blocks: [{
      id: 'b1', label: '1', stains: [
        { id: 's1', stainName: 'H&E', status: 'Cut & Placed', displayId: 'S26-4403-A1-L1' },
        { id: 's2', stainName: 'Unstained', status: 'Cut & Placed', aliquots: [{ id: 'q1', label: 'A' }] },
      ],
    }],
    decants: [{ id: 'd1', label: 'D1', stains: [{ id: 'ds1', stainName: 'Pap', status: 'Cut & Placed' }] }],
  }],
  matrixBlocks: [{ id: 'm1', label: 'M1', slides: [{ id: 'ms1', stainName: 'H&E', status: 'Cut & Placed' }] }],
} as unknown as Case;

describe('materialLineage', () => {
  it('links every item to the item it came from', () => {
    const byId = new Map(caseLineage(caseData).map(x => [x.itemId, x]));
    expect(byId.get('S26-4403-A')?.kind).toBe('container');
    expect(byId.get('S26-4403-A1')?.parentItemId).toBe('S26-4403-A');
    expect(byId.get('S26-4403-A1-L1')?.parentItemId).toBe('S26-4403-A1');
    expect(byId.get('S26-4403-A1-L2')?.parentItemId).toBe('S26-4403-A1');
    expect(byId.get('S26-4403-A1-L2A')?.parentItemId).toBe('S26-4403-A1-L2');
    expect(byId.get('S26-4403-AD1-L1')?.parentItemId).toBe('S26-4403-AD1');
    expect(byId.get('S26-4403-M1-L1')?.parentItemId).toBe('S26-4403-M1');
    expect(byId.get('S26-4403-M1')?.parentItemId).toBeUndefined();
  });
  it('finds a parent, the children and the ancestry, in any letter case', () => {
    expect(parentItemIdOf(caseData, 's26-4403-a1-l2')).toBe('S26-4403-A1');
    expect(childItemsOf(caseData, 'S26-4403-A1').map(x => x.itemId)).toEqual(['S26-4403-A1-L1', 'S26-4403-A1-L2']);
    expect(ancestryOf(caseData, 'S26-4403-A1-L2A').map(x => x.itemId)).toEqual(['S26-4403-A1-L2A', 'S26-4403-A1-L2', 'S26-4403-A1', 'S26-4403-A']);
    expect(parentItemIdOf(caseData, 'S99-1-A1')).toBeUndefined();
  });
  it('names the bench parent the stations record (block, matrix block or decant)', () => {
    expect(benchParentItemId('S26-4403', { specimenLabel: 'A', label: '1' })).toBe('S26-4403-A1');
    expect(benchParentItemId('S26-4403', { specimenLabel: '', label: '', matrixLabel: 'M1' })).toBe('S26-4403-M1');
    expect(benchParentItemId('S26-4403', { specimenLabel: 'A', label: 'D1', decant: true })).toBe('S26-4403-AD1');
  });
});
