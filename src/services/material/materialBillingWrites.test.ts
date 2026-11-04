// Batch 460: the bench's billing saves are made against the case as saved.
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { saveUnitCodingOnCase, saveSpecimensOnCase, MaterialBillingNotSaved, type MaterialBillingWriteDeps } from './materialBillingWrites';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import { codingWithApproved, specimensWithBaseCodeAdded } from '../billing/caseBillingCoding';

function store(initial: any) {
  let c = initial;
  const decantCalls: any[] = []; const published: any[] = [];
  const deps: MaterialBillingWriteDeps = {
    getCase: async () => structuredClone(c),
    updateCase: async (_id, updates, expected) => {
      if (expected !== c.version) throw new ConcurrencyConflictError('C', expected, c.version);
      c = { ...c, ...updates, version: c.version + 1 };
    },
    applyDecantChange: async (_id, change, version) => { decantCalls.push([change, version]); return { ok: true, specimens: c.specimens, version: c.version + 1, change: 'updated', event: {} } as any; },
    onDecantSaved: (id, r) => published.push([id, r.version]),
  };
  return { deps, get: () => c, decantCalls, published, set: (n: any) => { c = n; } };
}
const base = { id: 'C', version: 4, specimens: [{ id: 'A', blocks: [{ id: 'b1', coding: { cpt: [{ code: 'X' }], rejectedCpt: [] } }], decants: [{ id: 'd1', coding: undefined }] }] };

describe('materialBillingWrites', () => {
  it('a block code is added to the codes as saved, with the version', async () => {
    const s = store(structuredClone(base));
    const saved = await saveUnitCodingOnCase({ caseId: 'C', specimenId: 'A', unitId: 'b1', change: c => codingWithApproved(c, [{ code: 'Y' }]) }, s.deps);
    expect(saved.version).toBe(5);
    expect((saved.specimens![0] as any).blocks[0].coding.cpt.map((x: any) => x.code)).toEqual(['X', 'Y']);
  });
  it('a decant code goes through the decant save and is announced', async () => {
    const s = store(structuredClone(base));
    await saveUnitCodingOnCase({ caseId: 'C', specimenId: 'A', unitId: 'd1', change: c => codingWithApproved(c, [{ code: 'PAP' }]) }, s.deps);
    expect(s.decantCalls[0]).toEqual([{ kind: 'update', decantId: 'd1', patch: { coding: { cpt: [{ code: 'PAP', stainOrderId: undefined }], rejectedCpt: [] } } }, 4]);
    expect(s.published).toEqual([['C', 5]]);
  });
  it('a refused decant save throws, so nothing is charged', async () => {
    const s = store(structuredClone(base));
    s.deps.applyDecantChange = async () => ({ ok: false, error: 'conflict', currentVersion: 9 }) as any;
    await expect(saveUnitCodingOnCase({ caseId: 'C', specimenId: 'A', unitId: 'd1', change: c => c }, s.deps)).rejects.toBeInstanceOf(MaterialBillingNotSaved);
  });
  it('specimen codes are rebuilt on the newer case when someone saved first', async () => {
    const s = store(structuredClone(base));
    const realGet = s.deps.getCase;
    let first = true;
    s.deps.getCase = async id => {
      const c = await realGet(id);
      if (first) { first = false; s.set({ ...s.get(), version: 5, specimens: [{ ...s.get().specimens[0], coding: { cpt: ['88305'] } }] }); }
      return c;
    };
    const saved = await saveSpecimensOnCase({ caseId: 'C', change: sp => specimensWithBaseCodeAdded(sp, 'A', '88342') }, s.deps);
    expect((saved.specimens![0] as any).coding.cpt).toEqual(['88305', '88342']);
    expect(saved.version).toBe(6);
  });
});
