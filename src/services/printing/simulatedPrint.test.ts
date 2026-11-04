import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearSimulatedPrints, getSimulatedPrintFailure, listSimulatedPrints, recordSimulatedPrint, resetSimulatedPrintForTests,
  setSimulatedPrintFailure, simulationAllowed, subscribeSimulatedPrint,
} from './simulatedPrint';
import { setDataMayPersistInBrowserForTests } from '../browserData/browserDataPolicy';

describe('simulatedPrint (Batch 606)', () => {
  beforeEach(() => { resetSimulatedPrintForTests(); setDataMayPersistInBrowserForTests(true); });
  afterEach(() => setDataMayPersistInBrowserForTests(null));

  it('records a send as Simulated and delivered, newest first', () => {
    recordSimulatedPrint({ kind: 'label', transport: 'bartender_rest', destination: 'LAB-1', copies: 2 });
    const second = recordSimulatedPrint({ kind: 'report', transport: 'site agent', destination: 'Front desk' });
    const all = listSimulatedPrints();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(second.id);
    expect(all.every(r => r.simulated === true && r.outcome === 'delivered')).toBe(true);
    expect(all[1].copies).toBe(2);
  });

  it('comes back failed while the failure switch is on, and delivered again when off', () => {
    setSimulatedPrintFailure(true);
    expect(getSimulatedPrintFailure()).toBe(true);
    expect(recordSimulatedPrint({ kind: 'label', transport: 't', destination: 'd' }).outcome).toBe('failed');
    setSimulatedPrintFailure(false);
    expect(recordSimulatedPrint({ kind: 'label', transport: 't', destination: 'd' }).outcome).toBe('delivered');
  });

  it('is allowed only when the browser may keep data (no API server)', () => {
    expect(simulationAllowed()).toBe(true);
    setDataMayPersistInBrowserForTests(false);
    expect(simulationAllowed()).toBe(false);
  });

  it('tells subscribers and clears the log', () => {
    let calls = 0;
    const off = subscribeSimulatedPrint(() => { calls += 1; });
    recordSimulatedPrint({ kind: 'engrave', transport: 'engraver', destination: 'Station 3' });
    clearSimulatedPrints();
    off();
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(listSimulatedPrints()).toHaveLength(0);
  });
});

describe('one toast for a burst of simulated sends (Batch 756)', () => {
  it('counts sends within the burst window and starts again after it', async () => {
    const { nextSimulatedToastCount, SIMULATED_TOAST_BURST_MS } = await import('./simulatedPrint');
    expect(nextSimulatedToastCount(undefined, 1000)).toBe(1);
    expect(nextSimulatedToastCount({ count: 1, last: 1000 }, 1500)).toBe(2);
    expect(nextSimulatedToastCount({ count: 11, last: 1000 }, 1000 + SIMULATED_TOAST_BURST_MS - 1)).toBe(12);
    expect(nextSimulatedToastCount({ count: 12, last: 1000 }, 1000 + SIMULATED_TOAST_BURST_MS)).toBe(1);
  });
});
