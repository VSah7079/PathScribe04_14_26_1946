// Batch 436 (PS-101): header-search flag chips come from caseFlags.
import { describe, it, expect } from 'vitest';
import { searchHitFlags, DEFAULT_FLAG_HUE } from './searchHitFlags';

const defs = new Map([['f36', { name: 'CSMS Eligibility Verification Needed', tagClass: 'ADMINISTRATIVE' as const }], ['f9', { name: 'Clinical only', tagClass: undefined }]]);

describe('searchHitFlags', () => {
  it('resolves references through the flag catalog, keeps inline flags, drops deleted and non-search classes', () => {
    const flags = searchHitFlags({ caseFlags: [
      { flagDefinitionId: 'f36', deletedAt: null },
      { flagDefinitionId: 'f9' },
      { flagDefinitionId: 'f36', deletedAt: '2026-10-01' },
      { name: 'Colorectal MDT Scheduled', color: '#3b82f6', tagClass: 'ADMINISTRATIVE' },
    ] }, defs);
    expect(flags).toEqual([
      { name: 'CSMS Eligibility Verification Needed', color: DEFAULT_FLAG_HUE, tagClass: 'ADMINISTRATIVE' },
      { name: 'Colorectal MDT Scheduled', color: '#3b82f6', tagClass: 'ADMINISTRATIVE' },
    ]);
  });
  it('at most four; nothing for a case without flags', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ name: `F${i}`, tagClass: 'COMPUTATIONAL' }));
    expect(searchHitFlags({ caseFlags: many }, defs)).toHaveLength(4);
    expect(searchHitFlags({}, defs)).toEqual([]);
  });
});
