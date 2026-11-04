// src/services/cases/mockCaseServicePoolClaim.test.ts
// PS-71 (Batch 458): acceptPoolCase and delegateCase save with the version of
// the case they read, re-built from the newest case on a conflict.
import { describe, it, expect, vi, afterEach } from 'vitest';

// Same in-memory localStorage stub as mockCaseServiceConcurrency.test.ts:
// the services read it at module load.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

const { mockCaseService, acceptPoolCase, delegateCase, updateCaseAnyMode } = await import('./mockCaseService');

let counter = 0;
async function poolCase(): Promise<string> {
  const id = `LIS-POOL-${++counter}`;
  await mockCaseService.createCase({
    id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    status: 'pool', order: { assignedTo: null, priority: 'Routine' },
    participants: [], synopticReports: [], specimens: [],
  } as any);
  return id;
}
const read = async (id: string) => ((await mockCaseService.getAll()) as any).data.find((c: any) => c.id === id) as any;

afterEach(() => { vi.useRealTimers(); });

describe('acceptPoolCase (PS-71)', () => {
  it('two people accepting the same pool case at once: exactly one wins, the other is refused as already claimed', async () => {
    const id = await poolCase();
    const results = await Promise.allSettled([acceptPoolCase(id, 'U1', 'One'), acceptPoolCase(id, 'U2', 'Two')]);
    const won = results.filter(r => r.status === 'fulfilled');
    const lost = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(String(lost[0].reason?.message)).toMatch(/already been accepted/);
    const saved = await read(id);
    expect(['U1', 'U2']).toContain(saved.order.assignedTo);
    expect(saved.version).toBe(1); // one write, not two
  });

  it('refuses a case someone else already holds, writing nothing', async () => {
    const id = await poolCase();
    await updateCaseAnyMode(id, { order: { assignedTo: 'U9' } as any }, 0);
    await expect(acceptPoolCase(id, 'U1', 'One')).rejects.toThrow(/already been accepted/);
    expect((await read(id)).order.assignedTo).toBe('U9');
    expect((await read(id)).version).toBe(1);
  });

  it('accepting again as the same person is fine', async () => {
    const id = await poolCase();
    await acceptPoolCase(id, 'U1', 'One');
    await expect(acceptPoolCase(id, 'U1', 'One')).resolves.toBeUndefined();
  });
});

describe('delegateCase (PS-71)', () => {
  it('a participant added by someone else while the delegation was in flight survives (was: overwritten from the copy read earlier)', async () => {
    const id = await poolCase();
    await updateCaseAnyMode(id, { order: { assignedTo: 'U1' } as any, participants: [{ staffId: 'U1', staffName: 'One', source: 'manual', participationTypeIds: ['primary'], addedBy: 'x', addedAt: 't', status: 'active' }] as any }, 0);

    vi.useFakeTimers();
    const pending = delegateCase({ caseId: id, requestorId: 'U1', delegationType: 'SECOND_OPINION', targetUserId: 'U2', targetUserName: 'Two' });
    await vi.advanceTimersByTimeAsync(400); // delegateCase has read the case; now looking up the delegation type
    // (no reads here: the service's reads wait on timers too)
    const u1 = { staffId: 'U1', staffName: 'One', source: 'manual', participationTypeIds: ['primary'], addedBy: 'x', addedAt: 't', status: 'active' };
    await updateCaseAnyMode(id, { participants: [u1, { staffId: 'U3', staffName: 'Three', source: 'manual', participationTypeIds: ['consultant'], addedBy: 'x', addedAt: 't', status: 'active' }] as any }, 1);
    await vi.advanceTimersByTimeAsync(200);
    await pending;
    vi.useRealTimers();

    const saved = await read(id);
    expect(saved.participants.map((p: any) => p.staffId)).toEqual(['U1', 'U3', 'U2']);
    expect(saved.version).toBe(3);
  });
});
