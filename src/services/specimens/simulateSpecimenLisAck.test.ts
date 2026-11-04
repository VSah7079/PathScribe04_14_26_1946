import { describe, it, expect, beforeEach } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { writeBackSpecimenToLis, lisSyncStateAfterAnswer } = await import('./simulateSpecimenLisAck');
const { setMockInterfaceEngineSettings, getMockInterfaceEngineSettings } = await import('../mockInterfaceEngine/mockInterfaceEngineSettings');
const { setDataMayPersistInBrowserForTests } = await import('../browserData/browserDataPolicy');
const { listSimulatedEngineMessages, resetSimulatedEngineForTests } = await import('../mockInterfaceEngine/simulatedEngineReceiver');

beforeEach(() => { setDataMayPersistInBrowserForTests(true); resetSimulatedEngineForTests(); setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), enabled: false, simulatedEngine: true, mode: 'always_succeed' }); });
const sp = (lisSyncState: any) => ({ id: 'SP1', label: 'A', lisSyncState });

describe('specimen LIS write-back answer', () => {
  it('pending specimen becomes Sent when the engine acknowledges', async () => {
    const r = await writeBackSpecimenToLis('C1', sp('pending_sync'), 'T');
    expect(r).toMatchObject({ state: 'sync_sent', simulated: true });
    expect(listSimulatedEngineMessages()[0].transactionType).toBe('LIS_SYNC');
  });
  it('becomes Rejected when the engine rejects (mode)', async () => {
    setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), mode: 'always_fail' });
    const r = await writeBackSpecimenToLis('C1', sp('pending_sync'), 'T');
    expect(r).toMatchObject({ state: 'sync_rejected' }); expect(r!.error).toBeTruthy();
  });
  it('does nothing for a specimen with nothing waiting', async () => {
    expect(await writeBackSpecimenToLis('C1', sp('local_only'), 'T')).toBeNull();
    expect(await writeBackSpecimenToLis('C1', sp(undefined), 'T')).toBeNull();
    expect(lisSyncStateAfterAnswer(true)).toBe('sync_sent');
  });
});
