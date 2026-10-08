// Batch 450 (PS-189): returning a case to a pool (applyPoolRouting, used by the
// CLIA workload reassignment) changes its assignment and pool status only, never
// its accession, patient, specimens or the rest of its order.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

const { applyPoolRouting } = await import('./casePoolAssignmentService');
const { mockCaseService } = await import('./mockCaseService');
const { ConcurrencyConflictError } = await import('./ConcurrencyConflictError');

/* eslint-disable @typescript-eslint/no-explicit-any */
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

async function anAssignedCase(id: string) {
  const all = await mockCaseService.getAll();
  const list: any[] = (all as any).ok ? (all as any).data : (all as any);
  const seed = clone(list.find(c => c.accession?.fullAccession && c.patient && c.specimens?.length));
  if (!seed) throw new Error('no seeded case to use');
  const caseData = { ...seed, id, status: 'in-progress', version: 0, order: { ...seed.order, assignedTo: 'CT1', facilityId: 'F1' } };
  await mockCaseService.createCase(caseData);
  return caseData;
}

describe('applyPoolRouting — workload reassignment back to a pool', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('writes only the pool, the pool status, the unassigned order and the timestamp, against the case\'s version', async () => {
    const spy = vi.spyOn(mockCaseService, 'updateCase');
    const caseData = await anAssignedCase('PS189-A');
    await applyPoolRouting(caseData as any, '1', 'Cytology');
    expect(spy).toHaveBeenCalledTimes(1);
    const [id, patch, expectedVersion] = spy.mock.calls[0] as [string, any, number];
    expect(id).toBe('PS189-A');
    expect(expectedVersion).toBe(0);
    expect(Object.keys(patch).sort()).toEqual(['order', 'poolId', 'poolName', 'status', 'updatedAt']);
    expect(patch).toMatchObject({ status: 'pool', poolId: '1', poolName: 'Cytology' });
    const { assignedTo: _was, ...restOfOrder } = caseData.order;
    expect(patch.order.assignedTo).toBeUndefined();
    expect({ ...patch.order, assignedTo: undefined }).toEqual({ ...restOfOrder, assignedTo: undefined });
  });

  it('the stored case keeps its accession, patient, specimens and order details; only assignment and pool change', async () => {
    const caseData = await anAssignedCase('PS189-B');
    const before = clone(caseData);
    await applyPoolRouting(caseData as any, '1', 'Cytology');
    const after: any = await mockCaseService.getCase('PS189-B');
    expect(after.accession).toEqual(before.accession);
    expect(after.patient).toEqual(before.patient);
    expect(after.specimens).toEqual(before.specimens);
    expect(after.order.assignedTo).toBeUndefined();
    const { assignedTo: _a, ...orderBefore } = before.order;
    const { assignedTo: _b, ...orderAfter } = after.order;
    expect(orderAfter).toEqual(orderBefore);
    expect(after).toMatchObject({ status: 'pool', poolId: '1', poolName: 'Cytology' });
    expect(caseData).toEqual(before); // the caller's copy is not mutated
  });

  it('a case changed since it was loaded is not overwritten (version conflict), so a concurrent clinical edit survives', async () => {
    const caseData = await anAssignedCase('PS189-C');
    await mockCaseService.updateCase('PS189-C', { status: 'in-progress' } as any, 0); // someone else's edit: version 1
    await expect(applyPoolRouting(caseData as any, '1', 'Cytology')).rejects.toBeInstanceOf(ConcurrencyConflictError);
    const after: any = await mockCaseService.getCase('PS189-C');
    expect(after.order.assignedTo).toBe('CT1');
    expect(after.status).toBe('in-progress');
  });
});
