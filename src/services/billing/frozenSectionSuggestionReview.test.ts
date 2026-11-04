import { describe, it, expect } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { buildFrozenSuggestionRows, decideFrozenSuggestion } = await import('./frozenSectionSuggestionReview');
const sp = (id: string, blocks: number) => ({ id, specimenLabel: `Specimen ${id}`, preparations: Array.from({ length: blocks }, () => ({ type: 'frozen_block' })) }) as any;

describe('frozen section suggestion review', () => {
  it('first block 88331, further blocks 88332, per specimen; none for no blocks', () => {
    const rows = buildFrozenSuggestionRows('C1', [sp('A', 3), sp('B', 1), sp('C', 0)]);
    expect(rows.map(r => `${r.specimenId}:${r.cpt}`)).toEqual(['A:88331', 'A:88332', 'A:88332', 'B:88331']);
  });
  it('accept and dismiss are remembered per case and audited without charging', async () => {
    const rows = buildFrozenSuggestionRows('C2', [sp('A', 2)]);
    await decideFrozenSuggestion('C2', rows[0], 'accepted', 'T');
    await decideFrozenSuggestion('C2', rows[1], 'dismissed', 'T');
    const after = buildFrozenSuggestionRows('C2', [sp('A', 2)]);
    expect(after.map(r => r.decision)).toEqual(['accepted', 'dismissed']);
    expect(buildFrozenSuggestionRows('C3', [sp('A', 2)]).map(r => r.decision)).toEqual([undefined, undefined]);
  });
});
