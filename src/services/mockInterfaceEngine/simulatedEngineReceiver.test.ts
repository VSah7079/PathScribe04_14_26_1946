import { describe, it, expect, beforeEach } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { simulateEngineReceive, listSimulatedEngineMessages, resetSimulatedEngineForTests, shouldUseSimulatedEngine } = await import('./simulatedEngineReceiver');
const { setMockInterfaceEngineSettings, getMockInterfaceEngineSettings } = await import('./mockInterfaceEngineSettings');

const env = (type = 'ORDER_CREATED', payload: object = { a: 1 }) => ({ queueEntryId: 'q1', transactionType: type as any, dispatchedAt: new Date().toISOString(), payload });
beforeEach(() => { resetSimulatedEngineForTests(); setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), mode: 'always_succeed', simulateWsiScanner: false }); });

describe('simulated engine receiver', () => {
  it('accepts and records, labelled simulated', async () => {
    expect((await simulateEngineReceive(env())).ok).toBe(true);
    const [m] = listSimulatedEngineMessages();
    expect(m.simulated).toBe(true); expect(m.outcome).toBe('accepted'); expect(m.envelopeJson).toContain('"a": 1');
  });
  it('rejects in always_fail mode and times out in timeout mode', async () => {
    setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), mode: 'always_fail', failureStatus: 503 });
    const r = await simulateEngineReceive(env());
    expect(r).toMatchObject({ ok: false, errorCode: 'DISPATCH_REJECTED' }); expect(r.error).toContain('503');
    setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), mode: 'timeout' });
    expect(await simulateEngineReceive(env())).toMatchObject({ ok: false, errorCode: 'DISPATCH_TIMEOUT' });
    expect(listSimulatedEngineMessages().map(x => x.outcome)).toEqual(['timed-out', 'rejected']);
  });
  it('rejects an envelope without a payload', async () => {
    expect((await simulateEngineReceive({ ...env(), payload: undefined as any })).ok).toBe(false);
  });
  it('gate: demo only, no address, mock off, not switched off', () => {
    const base = { demo: true, endpointConfigured: false, networkMockEnabled: false, simulatedEngine: true };
    expect(shouldUseSimulatedEngine(base)).toBe(true);
    expect(shouldUseSimulatedEngine({ ...base, demo: false })).toBe(false);
    expect(shouldUseSimulatedEngine({ ...base, endpointConfigured: true })).toBe(false);
    expect(shouldUseSimulatedEngine({ ...base, networkMockEnabled: true })).toBe(false);
    expect(shouldUseSimulatedEngine({ ...base, simulatedEngine: false })).toBe(false);
  });
});
