// Batch 434: the developer tool's slide-scanner replies.
import { describe, it, expect } from 'vitest';
import { plannedScannerReplies } from './simulateWsiScanner';

describe('plannedScannerReplies', () => {
  it('each slide in order: scanning, then scanned with image QC passed', () => {
    const replies = plannedScannerReplies({ batchId: 'wb1', slides: [{ slidePosition: '1' }, { slidePosition: 'R7-3' }] }, 1000, () => 'T');
    expect(replies.map(r => [r.atMs, r.payload().slidePosition, r.payload().scanStatus, r.payload().qcPassed])).toEqual([
      [1000, '1', 'scanning', undefined], [1500, '1', 'completed', true],
      [2000, 'R7-3', 'scanning', undefined], [2500, 'R7-3', 'completed', true],
    ]);
    expect(new Set(replies.map(r => r.payload().messageId)).size).toBe(4);
    expect(replies[0].payload()).toMatchObject({ batchId: 'wb1', timestamp: 'T' });
  });
});
