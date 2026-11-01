// Batch 729 (Lab Workflow & Batch spec §7.5): "not all blocks sectioned".
import { describe, it, expect } from 'vitest';
import { sectioningProgress, sectioningIncomplete, otherBlocksWaiting } from './incompleteSectioning';

const slide = (status: string, extra: Record<string, unknown> = {}) => ({ id: Math.random().toString(36), stainName: 'H&E', status, ...extra });
const kase = {
  specimens: [
    { label: 'A', blocks: [{ label: '1', stains: [slide('Cut & Placed')] }, { label: '2', stains: [slide('Pending Cut')] }, { label: '3', stains: [slide('Pending Cut', { orderedAt: 'x', addOnPriority: 'Routine Sign-Out' })] }] },
    { label: 'B', blocks: [{ label: '1', stains: [slide('Pending Cut', { isControlSlide: true }), slide('Cancelled')] }] },
  ],
  matrixBlocks: [{ label: 'M1', slides: [slide('Pending Cut')] }],
} as never;

describe('sectioning progress (§7.5)', () => {
  it('counts started blocks and the blocks still waiting (add-ons, controls and cancelled slides left out)', () => {
    expect(sectioningProgress(kase)).toEqual({ started: 1, waiting: 2, waitingLabels: ['A2', 'M1'] });
    expect(sectioningIncomplete(kase)).toBe(true);
  });
  it('not incomplete before any cutting starts', () => {
    expect(sectioningIncomplete({ specimens: [{ label: 'A', blocks: [{ label: '1', stains: [slide('Pending Cut')] }] }] } as never)).toBe(false);
  });
  it('the others waiting, leaving out the block at the bench', () => {
    expect(otherBlocksWaiting(kase, 'A2')).toEqual(['M1']);
  });
});
