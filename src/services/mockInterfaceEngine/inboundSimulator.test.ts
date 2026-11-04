// src/services/mockInterfaceEngine/inboundSimulator.test.ts
import { describe, it, expect } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const { INBOUND_SAMPLE_IDS, prepareInboundSample, runInboundMessage } = await import('./inboundSimulator');
const ctx = { organisationId: 'ORG-SIM', facilityId: 'FAC-SIM', actor: 'Tester' };

describe('inbound simulator', () => {
  it('every sample builds and runs without throwing, labelled simulated', async () => {
    for (const id of INBOUND_SAMPLE_IDS) {
      const text = await prepareInboundSample(id, ctx);
      expect(text.length).toBeGreaterThan(10);
      const r = await runInboundMessage(text, ctx);
      expect(r.simulated).toBe(true);
      expect(typeof r.summary).toBe('string');
    }
  });

  it('A01 creates a patient and A40 merges', async () => {
    const a01 = await runInboundMessage(await prepareInboundSample('A01', ctx), ctx);
    expect(a01.ok).toBe(true);
    const a40 = await runInboundMessage(await prepareInboundSample('A40', ctx), ctx);
    expect(a40.ok).toBe(true);
    expect(a40.exceptionQueued).toBeUndefined();
  });

  it('an A40 for unknown patients is queued, not applied', async () => {
    const r = await runInboundMessage(await prepareInboundSample('A40-unknown', ctx), ctx);
    expect(r.ok).toBe(false);
    expect(r.exceptionQueued).toBeTruthy();
  });

  it('A50 changes the visit number and A45 moves the visit', async () => {
    expect((await runInboundMessage(await prepareInboundSample('A50', ctx), ctx)).ok).toBe(true);
    expect((await runInboundMessage(await prepareInboundSample('A45', ctx), ctx)).ok).toBe(true);
  });

  it('rejects empty and non-HL7 input with a plain message', async () => {
    expect((await runInboundMessage('  ', ctx)).ok).toBe(false);
    expect((await runInboundMessage('hello', ctx)).ok).toBe(false);
    expect((await runInboundMessage('{"event":"nope","payload":{}}', ctx)).ok).toBe(false);
  });
});
