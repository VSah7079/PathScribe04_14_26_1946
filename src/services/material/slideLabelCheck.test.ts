// Batch 757: the Microtome's dual scan (block, then the printed slide label).
import { describe, it, expect } from 'vitest';
import { fullSlideId, labelAwaitingScan, slideLabelScanOutcome, labelsAwaitingScan, blockLabelsToPrint, nextBlockLockout, UNSCANNED_LABEL_NOTE, withLabelIds } from './slideLabelCheck';

const stains = [
  { displayId: 'S26-0001-A1-L1', printStatus: 'Printed' },
  { displayId: 'S26-0001-A1-L2', printStatus: 'Pending' },
  { displayId: 'A1-L3', printStatus: 'Printed' },
];

describe('slideLabelCheck (Batch 757)', () => {
  it('confirms a printed label of the block being cut, case and spacing aside', () => {
    expect(slideLabelScanOutcome({ scannedSlideId: ' s26-0001-a1-l1 ', fullAccession: 'S26-0001', stains })).toEqual({ kind: 'confirm', slideId: 'S26-0001-A1-L1' });
    expect(slideLabelScanOutcome({ scannedSlideId: 'S26-0001-A1-L3', fullAccession: 'S26-0001', stains })).toEqual({ kind: 'confirm', slideId: 'S26-0001-A1-L3' });
  });
  it('refuses a slide of this block not printed yet, and leaves any other slide to the usual handling', () => {
    expect(slideLabelScanOutcome({ scannedSlideId: 'S26-0001-A1-L2', fullAccession: 'S26-0001', stains })).toEqual({ kind: 'notPrinted', slideId: 'S26-0001-A1-L2' });
    expect(slideLabelScanOutcome({ scannedSlideId: 'S26-0001-A2-L1', fullAccession: 'S26-0001', stains })).toEqual({ kind: 'otherWork' });
  });
  it('holds Print/Etch Next while a label printed for this block waits for its scan', () => {
    expect(labelAwaitingScan(new Set(['S26-0001-A1-L1']), 'S26-0001', stains)).toBe('S26-0001-A1-L1');
    expect(labelAwaitingScan(new Set(['S26-0001-A2-L1']), 'S26-0001', stains)).toBeNull();
    expect(fullSlideId('S26-0001', 'A1-L3')).toBe('S26-0001-A1-L3');
  });
});

describe('slideLabelCheck: Block mode and the lockout (Batch 758)', () => {
  const block = [
    { id: 's1', displayId: 'A1-L1', printStatus: 'Printed' },
    { id: 's2', displayId: 'A1-L2', printStatus: 'Printed' },
    { id: 's3', displayId: 'A1-L3', printStatus: 'Canceled' },
    { id: 's4', displayId: 'A1-L4', printStatus: 'Failed' },
    { id: 's5', displayId: 'A1-L5' },
    { id: 's6', displayId: 'A1-L6', printStatus: 'Pending' },
  ];
  const awaiting = new Set(['S26-0001-A1-L1', 'S26-0001-A1-L2', 'S26-0001-A1-L3', 'S26-0009-A1-L1']);

  it('lists every label of this block still waiting, in grid order, leaving out a cancelled slide and other cases', () => {
    expect(labelsAwaitingScan(awaiting, 'S26-0001', block)).toEqual([
      { slideId: 'S26-0001-A1-L1', stainId: 's1' }, { slideId: 'S26-0001-A1-L2', stainId: 's2' },
    ]);
    expect(labelsAwaitingScan(new Set(), 'S26-0001', block)).toEqual([]);
  });

  it('a block scan prints every slide not printed yet (new, pending or failed)', () => {
    expect(blockLabelsToPrint(block)).toEqual(['s4', 's5', 's6']);
  });

  it('moving on with labels waiting is held; staying on the same block never is', () => {
    const waiting = labelsAwaitingScan(awaiting, 'S26-0001', block);
    expect(nextBlockLockout(waiting, true)).toHaveLength(2);
    expect(nextBlockLockout(waiting, false)).toBeNull();
    expect(nextBlockLockout([], true)).toBeNull();
    expect(UNSCANNED_LABEL_NOTE).toMatch(/not scanned/);
  });
});

describe('withLabelIds (Batch 758)', () => {
  it('a slide with no stored id gets the one on its label; a stored id is kept', () => {
    const out = withLabelIds([{ id: 'a' }, { id: 'b', displayId: 'S26-1-A1-L7' }, { id: 'c' }], 'A1');
    expect(out.map(s => s.displayId)).toEqual(['A1-L1', 'S26-1-A1-L7', 'A1-L3']);
    expect(labelsAwaitingScan(new Set(['S26-1-A1-L1']), 'S26-1', out.map(s => ({ ...s, printStatus: 'Printed' })))).toEqual([{ slideId: 'S26-1-A1-L1', stainId: 'a' }]);
  });
});
