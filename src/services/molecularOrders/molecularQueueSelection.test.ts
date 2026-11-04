// src/services/molecularOrders/molecularQueueSelection.test.ts (Batch 562)
import { describe, it, expect } from 'vitest';
import { keepSelectedInView } from './molecularQueueSelection';

describe('keepSelectedInView', () => {
  it('drops selected orders that left the queue, and keeps the same list when nothing left', () => {
    expect(keepSelectedInView(['a', 'b', 'c'], [{ orderId: 'a' }, { orderId: 'c' }])).toEqual(['a', 'c']);
    const same = ['a'];
    expect(keepSelectedInView(same, [{ orderId: 'a' }, { orderId: 'z' }])).toBe(same);
  });
});
