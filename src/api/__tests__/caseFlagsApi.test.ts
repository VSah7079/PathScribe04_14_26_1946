// @vitest-environment happy-dom
// Batch 452 (PS-57): the Flag Manager's apply/remove write the one stored
// flag shape, a FlagInstance on Case.caseFlags or the specimen's own
// Specimen.specimenFlags, against the real mock case store.
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { applyFlags, deleteFlags } from '../caseFlagsApi';
import { mockCaseService } from '../../services/cases/mockCaseService';
import { toCaseWithFlags } from '../../services/flags/caseFlagView';

const CASE_ID = 'S26-4402-COLON-RES';

describe('caseFlagsApi (PS-57)', () => {
  beforeEach(() => localStorage.clear());

  it('applying a case flag stores a FlagInstance (definition id, when, by whom, not removed) on caseFlags', async () => {
    const view = await applyFlags({ caseId: CASE_ID, flagDefinitionId: 'flag-test-1' });
    const stored = (await mockCaseService.getCase(CASE_ID))!;
    const inst = stored.caseFlags!.find(f => f.flagDefinitionId === 'flag-test-1')!;
    expect(inst).toMatchObject({ flagDefinitionId: 'flag-test-1', source: 'product', deletedAt: null, deletedBy: null });
    expect(typeof inst.id).toBe('string');
    expect(Number.isNaN(Date.parse(inst.appliedAt))).toBe(false);
    expect(Object.keys(inst).sort()).toEqual(['appliedAt', 'appliedBy', 'deletedAt', 'deletedBy', 'flagDefinitionId', 'id', 'source']);
    expect(view.flags.some(f => f.id === inst.id)).toBe(true);
  });

  it('applying a specimen flag lands on that specimen only, never on the case', async () => {
    const before = (await mockCaseService.getCase(CASE_ID))!;
    const [first, second] = before.specimens;
    await applyFlags({ caseId: CASE_ID, flagDefinitionId: 'flag-test-2', specimenId: first.id });
    const after = (await mockCaseService.getCase(CASE_ID))!;
    expect(after.specimens.find(s => s.id === first.id)!.specimenFlags!.some(f => f.flagDefinitionId === 'flag-test-2')).toBe(true);
    if (second) expect((after.specimens.find(s => s.id === second.id)!.specimenFlags ?? []).some(f => f.flagDefinitionId === 'flag-test-2')).toBe(false);
    expect((after.caseFlags ?? []).some(f => f.flagDefinitionId === 'flag-test-2')).toBe(false);
  });

  it('applying the same definition twice does not add a second active record', async () => {
    await applyFlags({ caseId: CASE_ID, flagDefinitionId: 'flag-test-3' });
    await applyFlags({ caseId: CASE_ID, flagDefinitionId: 'flag-test-3' });
    const stored = (await mockCaseService.getCase(CASE_ID))!;
    expect(stored.caseFlags!.filter(f => f.flagDefinitionId === 'flag-test-3')).toHaveLength(1);
  });

  it('removing a flag keeps the record and marks it deleted; the Flag Manager view then leaves it out', async () => {
    const applied = await applyFlags({ caseId: CASE_ID, flagDefinitionId: 'flag-test-4' });
    const id = applied.flags.find(f => f.flagDefinitionId === 'flag-test-4')!.id;
    await deleteFlags({ caseId: CASE_ID, flagInstanceId: id });
    const stored = (await mockCaseService.getCase(CASE_ID))!;
    const rec = stored.caseFlags!.find(f => f.id === id)!;
    expect(rec.deletedAt).not.toBeNull();
    expect(rec.deletedBy).toBe('current-user');
    expect(toCaseWithFlags(stored, { activeOnly: true }).flags.some(f => f.id === id)).toBe(false);
    // and it can be applied again afterwards
    await applyFlags({ caseId: CASE_ID, flagDefinitionId: 'flag-test-4' });
    const again = (await mockCaseService.getCase(CASE_ID))!;
    expect(again.caseFlags!.filter(f => f.flagDefinitionId === 'flag-test-4' && !f.deletedAt)).toHaveLength(1);
  });

  it('PS-71 (Batch 458): a flag someone else added in between is kept; the save carries the version', async () => {
    const original = mockCaseService.updateCase.bind(mockCaseService);
    const versions: Array<number | undefined> = [];
    const spy = vi.spyOn(mockCaseService, 'updateCase').mockImplementation(async (id, u, v) => {
      versions.push(v);
      if (versions.length === 1) {
        // Another person's flag lands first.
        const cur = (await mockCaseService.getCase(id))!;
        await original(id, { caseFlags: [...(cur.caseFlags ?? []), { id: 'theirs', flagDefinitionId: 'flag-theirs', appliedAt: 'x', appliedBy: 'u2', source: 'product', deletedAt: null, deletedBy: null }] }, v);
      }
      return original(id, u, v);
    });
    await applyFlags({ caseId: CASE_ID, flagDefinitionId: 'flag-mine' });
    spy.mockRestore();
    expect(versions).toHaveLength(2);
    expect(versions.every(v => typeof v === 'number')).toBe(true);
    const stored = (await mockCaseService.getCase(CASE_ID))!;
    expect(stored.caseFlags!.map(f => f.flagDefinitionId)).toEqual(expect.arrayContaining(['flag-theirs', 'flag-mine']));
  });

  it('an unknown case is an error, not a silent no-op', async () => {
    await expect(applyFlags({ caseId: 'NO-SUCH-CASE', flagDefinitionId: 'x' })).rejects.toThrow();
  });
});

describe('toCaseWithFlags (PS-57)', () => {
  const inst = (id: string, def: string, deletedAt: string | null = null) =>
    ({ id, flagDefinitionId: def, appliedAt: '2026-10-01T00:00:00Z', appliedBy: 'u', source: 'product' as const, deletedAt, deletedBy: deletedAt ? 'u' : null });
  const c = {
    id: 'C1', accession: { accessionNumber: 'S26-1', fullAccession: 'S26-0001' } as never,
    caseFlags: [inst('a', 'f1'), inst('b', 'f2', '2026-10-02T00:00:00Z'), { ...inst('c', ''), flagDefinitionId: '' }],
    specimens: [{ id: 'SP1', label: 'A', specimenFlags: [inst('d', 'f3'), inst('e', 'f4', '2026-10-02T00:00:00Z')] }] as never,
  };

  it('activeOnly drops removed flags and records with no definition id, at case and specimen level', () => {
    const v = toCaseWithFlags(c, { activeOnly: true });
    expect(v.flags.map(f => f.id)).toEqual(['a']);
    expect(v.specimens[0].flags.map(f => f.id)).toEqual(['d']);
    expect(v.accession).toBe('S26-0001');
  });

  it('without activeOnly every record is kept; missing flag lists become empty lists', () => {
    expect(toCaseWithFlags(c).flags.map(f => f.id)).toEqual(['a', 'b', 'c']);
    const bare = toCaseWithFlags({ id: 'C2', specimens: [{ id: 'SP', label: 'B' }] as never }, { accessionFallback: 'X' });
    expect(bare).toEqual({ id: 'C2', accession: 'X', flags: [], specimens: [{ id: 'SP', label: 'B', flags: [] }] });
  });
});
