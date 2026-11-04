// src/services/flags/applyLisSyncFlags.test.ts
// Batch 450 (PS-57): a flag the report page's LIS sync brings in lands on the
// specific specimen's own specimenFlags, not on a case-level field.
import { describe, it, expect } from 'vitest';
import { applyLisSyncFlags } from './applyLisSyncFlags';
import type { LisSyncPendingFlag } from '../lisSync/mockLisSyncService';

const NOW = '2026-10-03T12:00:00.000Z';
const pending = (over: Partial<LisSyncPendingFlag>): LisSyncPendingFlag => ({
  id: 'p', name: 'Recut', lisCode: 'RC', tagClass: 'ADMINISTRATIVE', severity: 2, ...over,
});
const caseWith = (over: Record<string, unknown> = {}): any => ({
  id: 'S26-1',
  caseFlags: [],
  specimens: [
    { id: 'SP-A', specimenFlags: [] },
    { id: 'SP-B', specimenFlags: [] },
  ],
  ...over,
});
function deps(defIds: Record<string, string>) {
  let n = 0;
  return { resolveDefinitionId: async (pf: LisSyncPendingFlag) => defIds[pf.lisCode], now: NOW, newId: () => `inst-${++n}` };
}

describe('applyLisSyncFlags (PS-57, report page LIS sync)', () => {
  it('puts a specimen-level LIS flag on that specimen\'s own specimenFlags as a FlagInstance, and nowhere else', async () => {
    const out = await applyLisSyncFlags(caseWith(), [pending({ lisCode: 'RC', specimenId: 'SP-B' })], deps({ RC: 'FLAG-RC' }));
    const b = out.specimens!.find(s => s.id === 'SP-B')!;
    expect(b.specimenFlags).toEqual([{
      id: 'inst-1', flagDefinitionId: 'FLAG-RC', appliedAt: NOW, appliedBy: 'LIS Sync', source: 'lis', deletedAt: null, deletedBy: null,
    }]);
    expect(out.specimens!.find(s => s.id === 'SP-A')!.specimenFlags).toEqual([]);
    expect(out.caseFlags).toEqual([]);
    expect((out as any).specimenFlags).toBeUndefined();
  });

  it('puts a flag with no specimen on caseFlags', async () => {
    const out = await applyLisSyncFlags(caseWith(), [pending({ lisCode: 'QA' })], deps({ QA: 'FLAG-QA' }));
    expect(out.caseFlags).toEqual([expect.objectContaining({ flagDefinitionId: 'FLAG-QA', source: 'lis' })]);
    expect(out.specimens!.every(s => (s.specimenFlags ?? []).length === 0)).toBe(true);
  });

  it('does not re-apply a definition already active at the same place, but does when the earlier one was removed', async () => {
    const active = { id: 'old', flagDefinitionId: 'FLAG-RC', appliedAt: NOW, appliedBy: 'x', source: 'product', deletedAt: null, deletedBy: null };
    const removed = { ...active, id: 'gone', deletedAt: NOW, deletedBy: 'x' };
    const c = caseWith({
      caseFlags: [active],
      specimens: [{ id: 'SP-A', specimenFlags: [active] }, { id: 'SP-B', specimenFlags: [removed] }],
    });
    const out = await applyLisSyncFlags(c, [
      pending({ lisCode: 'RC' }),
      pending({ lisCode: 'RC', specimenId: 'SP-A' }),
      pending({ lisCode: 'RC', specimenId: 'SP-B' }),
    ], deps({ RC: 'FLAG-RC' }));
    expect(out.caseFlags!.map(f => f.id)).toEqual(['old']);
    expect(out.specimens!.find(s => s.id === 'SP-A')!.specimenFlags!.map(f => f.id)).toEqual(['old']);
    expect(out.specimens!.find(s => s.id === 'SP-B')!.specimenFlags!.map(f => f.id)).toEqual(['gone', 'inst-3']);
  });

  it('resolves each reported flag through the catalog lookup by LIS code', async () => {
    const seen: string[] = [];
    await applyLisSyncFlags(caseWith(), [pending({ lisCode: 'RC', specimenId: 'SP-A' }), pending({ lisCode: 'QA' })], {
      resolveDefinitionId: async pf => { seen.push(pf.lisCode); return `FLAG-${pf.lisCode}`; }, now: NOW, newId: () => 'i',
    });
    expect(seen).toEqual(['RC', 'QA']);
  });

  it('does not change the case passed in', async () => {
    const c = caseWith();
    await applyLisSyncFlags(c, [pending({ specimenId: 'SP-A' })], deps({ RC: 'FLAG-RC' }));
    expect(c.specimens[0].specimenFlags).toEqual([]);
  });
});
