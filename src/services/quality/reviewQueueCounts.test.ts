import { describe, it, expect, vi } from 'vitest';
import { loadReviewQueueCounts } from './reviewQueueCounts';

const theCase = { id: 'S26-1', specimens: [{ id: 'SP-1', surgicalPeerReview: { postSignOutPeerReviewFlag: { reason: 'random_selection' } } }] } as any;

describe('loadReviewQueueCounts (Batch 396)', () => {
  it('counts the items each queue lists', async () => {
    const counts = await loadReviewQueueCounts({ cytologyQcQueueSize: async () => 3, listCases: async () => [theCase] }, { cytologyQc: true, surgicalQa: true });
    expect(counts).toEqual({ cytologyQc: 3, surgicalQa: 1 });
  });
  it('does not load a queue the reader cannot open, and a failure shows no number', async () => {
    const listCases = vi.fn();
    const counts = await loadReviewQueueCounts({ cytologyQcQueueSize: async () => { throw new Error('x'); }, listCases }, { cytologyQc: true, surgicalQa: false });
    expect(counts).toEqual({ cytologyQc: null, surgicalQa: null });
    expect(listCases).not.toHaveBeenCalled();
  });
});
