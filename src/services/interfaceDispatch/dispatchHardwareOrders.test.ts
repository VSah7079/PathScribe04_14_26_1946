import { describe, it, expect, beforeEach } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { dispatchBlockOrder, dispatchSlideOrder, dispatchSpecimenLabelOrder } = await import('./dispatchHardwareOrders');
const { listSimulatedEngineMessages, resetSimulatedEngineForTests } = await import('../mockInterfaceEngine/simulatedEngineReceiver');
const { setMockInterfaceEngineSettings, getMockInterfaceEngineSettings } = await import('../mockInterfaceEngine/mockInterfaceEngineSettings');
const { setDataMayPersistInBrowserForTests } = await import('../browserData/browserDataPolicy');

beforeEach(() => {
  setDataMayPersistInBrowserForTests(true);
  resetSimulatedEngineForTests();
  setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), enabled: false, simulatedEngine: true, mode: 'always_succeed' });
});

const caseData = { id: 'C-9', patient: { mrn: 'M', firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01', sex: 'M' } } as any;
const specimen = { id: 'SP', label: 'A', collection: {}, container: {} } as any;
const block = { id: 'B', label: '1', status: 'Embedded', stains: [{ id: 'S1', stainName: 'H&E' }] } as any;

describe('hardware order dispatch', () => {
  it('sends a block order to the simulated engine and returns the ORM text', async () => {
    const r = await dispatchBlockOrder({ caseData, specimen, block, actor: 'T' });
    expect(r).toMatchObject({ ok: true, simulated: true, transactionType: 'BLOCK_ORDER' });
    expect(r.messageText.startsWith('MSH')).toBe(true);
    expect(listSimulatedEngineMessages()[0]).toMatchObject({ transactionType: 'BLOCK_ORDER', outcome: 'accepted' });
  });
  it('reports a rejection from the engine', async () => {
    setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), mode: 'always_fail', failureStatus: 500 });
    const r = await dispatchBlockOrder({ caseData, specimen, block, actor: 'T' });
    expect(r.ok).toBe(false); expect(r.error).toBeTruthy();
  });
  it('sends slide and specimen label orders', async () => {
    const s = await dispatchSlideOrder({ caseId: 'C-9', accession: 'S26-1', specimenLabel: 'A', blockLabel: '1', slideLabel: '1', barcode: 'BC1', actor: 'T' });
    const l = await dispatchSpecimenLabelOrder({ caseId: 'C-9', accession: 'S26-1', specimenLabel: 'A', barcode: 'BC2', actor: 'T' });
    expect(s.ok && l.ok).toBe(true);
    expect(listSimulatedEngineMessages().map(m => m.transactionType)).toEqual(['SPECIMEN_LABEL', 'SLIDE_ORDER']);
  });
});
