// Batch 669 (ws-8): the shared save used by the Embedding, Slide Distribution and Add-On Order stations.
import { describe, it, expect, vi } from 'vitest';
import { runCaseAction, saveSpecimenChange, saveCaseChange, saveFailedKey, replaceSpecimenById } from './runCaseAction';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';

const sp = (id: string, label = id): Specimen => ({ id, label, blocks: [] } as unknown as Specimen);
const caseAt = (version: number, specimens: Specimen[] = [sp('s1')]): Case => ({ id: 'c1', version, specimens } as unknown as Case);

function deps(over: { cases?: Case[]; update?: (id: string, u: Partial<Case>, v: number) => Promise<void> } = {}) {
  const cases = over.cases ?? [caseAt(4)];
  let i = 0;
  return {
    getCase: vi.fn(async () => cases[Math.min(i++, cases.length - 1)]),
    updateCase: vi.fn(over.update ?? (async () => {})),
  };
}

describe('saveSpecimenChange', () => {
  it('saves against the newest read and reports the case as saved, one version on', async () => {
    const d = deps();
    const r: any = await saveSpecimenChange('c1', cur => [...cur.specimens!, sp('s2')], d);
    expect(r.status).toBe('saved');
    expect(d.updateCase).toHaveBeenCalledWith('c1', { specimens: [sp('s1'), sp('s2')] }, 4);
    expect(r.caseData!.version).toBe(5);
    expect(r.caseData!.specimens).toHaveLength(2);
  });

  it('on a conflict reads again and re-derives the change from the newer case, then saves', async () => {
    const calls: number[] = [];
    const d = deps({
      cases: [caseAt(4), caseAt(5, [sp('s1', 'changed by someone else')])],
      update: async (_id, _u, v) => { calls.push(v); if (v === 4) throw new ConcurrencyConflictError('c1', 4, 5); },
    });
    const derive = vi.fn((cur: Case) => cur.specimens!.map(s => ({ ...s, description: 'mine' }) as Specimen));
    const r: any = await saveSpecimenChange('c1', derive, d);
    expect(r.status).toBe('saved');
    expect(calls).toEqual([4, 5]);
    expect(derive).toHaveBeenCalledTimes(2);
    expect(r.caseData!.specimens![0].label).toBe('changed by someone else');
  });

  it('says it was NOT saved (conflict) after 3 conflicting tries, with the stored case to reload', async () => {
    const d = deps({ cases: [caseAt(4), caseAt(5), caseAt(6), caseAt(7)], update: async (_i, _u, v) => { throw new ConcurrencyConflictError('c1', v, v + 1); } });
    const r: any = await saveSpecimenChange('c1', cur => cur.specimens!, d);
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('conflict');
    expect(d.updateCase).toHaveBeenCalledTimes(3);
    expect(r.latest!.version).toBe(7);
  });

  it('a save that throws is reported as not applied (never shown as saved) and the stored case comes back', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const d = deps({ update: async () => { throw new Error('network down'); } });
    const r: any = await saveSpecimenChange('c1', cur => cur.specimens!, d);
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('notApplied');
    expect(d.updateCase).toHaveBeenCalledTimes(1);
    expect(r.latest).toBeTruthy();
    err.mockRestore();
  });

  it('a case that cannot be found is a failure, with nothing to reload', async () => {
    const d = { getCase: vi.fn(async () => null), updateCase: vi.fn(async () => {}) };
    const r: any = await saveSpecimenChange('c1', cur => cur.specimens!, d);
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('notApplied');
    expect(r.latest).toBeNull();
    expect(d.updateCase).not.toHaveBeenCalled();
  });

  it('when the change no longer applies to the newest case (derive gives null) nothing is saved and it is reported', async () => {
    const d = deps();
    const r: any = await saveSpecimenChange('c1', () => null, d);
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('conflict');
    expect(d.updateCase).not.toHaveBeenCalled();
  });
});

describe('runCaseAction', () => {
  it('an action that finishes without saving is "unchanged" and its value comes back', async () => {
    const d = deps();
    const r: any = await runCaseAction('c1', async () => ({ ok: false, notPermitted: true }), d);
    expect(r.status).toBe('unchanged');
    expect(r.value).toEqual({ ok: false, notPermitted: true });
    expect(d.updateCase).not.toHaveBeenCalled();
  });

  it('runs the whole action again on a conflict, but work after a successful save runs only once', async () => {
    const after = vi.fn();
    const d = deps({ cases: [caseAt(1), caseAt(2)], update: async (_i, _u, v) => { if (v === 1) throw new ConcurrencyConflictError('c1', 1, 2); } });
    const action = vi.fn(async (cur: Case, save: (s: Specimen[]) => Promise<void>) => { await save(cur.specimens!); after(); return 'done'; });
    const r: any = await runCaseAction('c1', action, d);
    expect(r.status).toBe('saved');
    expect(r.value).toBe('done');
    expect(action).toHaveBeenCalledTimes(2);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('an error after the save went through is rethrown, not reported as "Not saved"', async () => {
    const d = deps();
    await expect(runCaseAction('c1', async (cur, save) => { await save(cur.specimens!); throw new Error('mail down'); }, d)).rejects.toThrow('mail down');
  });
});

describe('helpers', () => {
  it('saveFailedKey picks the conflict wording only for a conflict', () => {
    expect(saveFailedKey('conflict')).toBe('workstationSave.conflict');
    expect(saveFailedKey('notApplied')).toBe('workstationSave.notApplied');
    expect(saveFailedKey(undefined)).toBe('workstationSave.notApplied');
  });
  it('replaceSpecimenById swaps only the matching specimen', () => {
    const out = replaceSpecimenById([sp('a'), sp('b')], { ...sp('b'), label: 'B2' } as Specimen);
    expect(out.map(s => s.label)).toEqual(['a', 'B2']);
  });
});

// Batch 729: the same save for other case fields (a matrix block lives in Case.matrixBlocks).
describe('saveCaseChange', () => {
  it('saves the derived fields, retrying from the newer case on a conflict', async () => {
    const calls: number[] = [];
    const d = deps({ cases: [caseAt(4), caseAt(5)], update: async (_i, _u, v) => { calls.push(v); if (v === 4) throw new ConcurrencyConflictError('c1', 4, 5); } });
    const r = await saveCaseChange('c1', cur => ({ matrixBlocks: [{ id: `mb-v${(cur as { version: number }).version}` }] as never }), d);
    expect(r.status).toBe('saved');
    expect(calls).toEqual([4, 5]);
    expect(r.status === 'saved' && (r.caseData.matrixBlocks as unknown as { id: string }[])[0].id).toBe('mb-v5');
  });
  it('a change that no longer applies is reported as not saved (conflict), with the stored case', async () => {
    const d = deps();
    const r = await saveCaseChange('c1', () => null, d);
    expect(r).toMatchObject({ status: 'failed', reason: 'conflict' });
    expect(d.updateCase).not.toHaveBeenCalled();
  });
  it('another error is not retried', async () => {
    const d = deps({ update: async () => { throw new Error('network down'); } });
    const r = await saveCaseChange('c1', () => ({ matrixBlocks: [] }), d);
    expect(r).toMatchObject({ status: 'failed', reason: 'notApplied' });
    expect(d.updateCase).toHaveBeenCalledTimes(1);
  });
});
