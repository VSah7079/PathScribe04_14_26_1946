import { describe, it, expect } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { dispatchMaterialScanEvent } = await import('./dispatchMaterialScanEvent');
const { listSimulatedEngineMessages, resetSimulatedEngineForTests } = await import('@/services/mockInterfaceEngine/simulatedEngineReceiver');
const { setMockInterfaceEngineSettings, getMockInterfaceEngineSettings } = await import('@/services/mockInterfaceEngine/mockInterfaceEngineSettings');
const { setDataMayPersistInBrowserForTests } = await import('@/services/browserData/browserDataPolicy');

describe('dispatchMaterialScanEvent', () => {
  it('goes through the interface dispatch to the simulated engine', async () => {
    setDataMayPersistInBrowserForTests(true);
    resetSimulatedEngineForTests();
    setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), enabled: false, simulatedEngine: true, mode: 'always_succeed' });
    const r = await dispatchMaterialScanEvent({ messageId: 'scan-1', rawScanValue: 'CASS-1', stationName: 'Embedding 1' } as any);
    expect(r.dispatched).toBe(true);
    expect(listSimulatedEngineMessages()[0]).toMatchObject({ transactionType: 'MATERIAL_SCAN_EVENT', queueEntryId: 'scan-1', outcome: 'accepted' });
  });
});
