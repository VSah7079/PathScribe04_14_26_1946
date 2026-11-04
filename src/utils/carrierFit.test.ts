// Batch 737 (Lab Workflow & Batch spec §10.6, §11.1): what Batch Management checks when an item is scanned into a
// carrier: an exhausted block is added with a warning; a large-format slide needs a large-format staining carrier.
import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import { exhaustedOnScan } from './blockExceptionStates';
import { slideSizeOnScan, slideFitsCarrier } from './blockPieceRules';

const theCase = {
  specimens: [{ id: 'sp', label: 'A', blocks: [
    { id: 'b1', label: '1', status: 'Exhausted', stains: [] },
    { id: 'b2', label: '2', status: 'Embedded', blockType: 'megablock', stains: [{ id: 's1', stainName: 'H&E', displayId: 'S26-1-A2-L1' }] },
    { id: 'b3', label: '3', status: 'Embedded', stains: [{ id: 's2', stainName: 'H&E', displayId: 'S26-1-A3-L1' }] },
  ] }],
  matrixBlocks: [{ id: 'm1', label: 'M1', status: 'Exhausted', participants: [], slides: [] }],
} as unknown as Case;

describe('scanning into a carrier (Batch 737)', () => {
  it('flags an exhausted block or matrix block, nothing else', () => {
    expect(exhaustedOnScan(theCase, { level: 'block', blockNumber: '1' }, 'A')).toBe(true);
    expect(exhaustedOnScan(theCase, { level: 'block', blockNumber: '3' }, 'A')).toBe(false);
    expect(exhaustedOnScan(theCase, { level: 'matrix_block', matrixBlockId: 'm1' }, undefined)).toBe(true);
    expect(exhaustedOnScan(theCase, { level: 'slide', blockNumber: '1' }, 'A')).toBe(false);
  });
  it('a megablock\'s slide is large-format and needs a large-format staining carrier', () => {
    expect(slideSizeOnScan(theCase, { level: 'slide' }, 'S26-1-A2-L1')).toBe('large_format');
    expect(slideSizeOnScan(theCase, { level: 'slide' }, 'S26-1-A3-L1')).toBe('standard');
    expect(slideSizeOnScan(theCase, { level: 'block' }, 'S26-1-A2')).toBeNull();
    expect(slideFitsCarrier('large_format', { processingNode: 'Staining' })).toBe(false);
    expect(slideFitsCarrier('large_format', { processingNode: 'Staining', largeFormat: true })).toBe(true);
    expect(slideFitsCarrier('large_format', { processingNode: 'Checkout' })).toBe(true);
    expect(slideFitsCarrier('standard', { processingNode: 'Staining' })).toBe(true);
  });
});
