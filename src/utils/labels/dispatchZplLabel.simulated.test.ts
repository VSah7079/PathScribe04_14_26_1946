import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bridgeDispatchesZpl, dispatchZplLabel } from './dispatchZplLabel';
import { listSimulatedPrints, resetSimulatedPrintForTests, setSimulatedPrintFailure } from '@/services/printing/simulatedPrint';
import { setDataMayPersistInBrowserForTests } from '@/services/browserData/browserDataPolicy';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';

const printer = (bridgeType: string): PrinterProfile => ({ id: 'p1', printerId: 'ZEBRA-1', bridgeType, dpi: 300 } as unknown as PrinterProfile);

describe('dispatchZplLabel simulated routes (Batch 606)', () => {
  beforeEach(() => { resetSimulatedPrintForTests(); setDataMayPersistInBrowserForTests(true); });
  afterEach(() => setDataMayPersistInBrowserForTests(null));

  it.each(['bartender_rest', 'zebra_browser_print', 'direct_interface_engine'])('%s answers Simulated in the demo', async bridge => {
    const res = await dispatchZplLabel(printer(bridge), '^XA^XZ', 2);
    expect(res.ok).toBe(true);
    expect((res as { simulated?: true }).simulated).toBe(true);
    expect(listSimulatedPrints()[0]).toMatchObject({ transport: bridge, destination: 'ZEBRA-1', copies: 2, outcome: 'delivered' });
  });

  it('fails with the failure switch on', async () => {
    setSimulatedPrintFailure(true);
    const res = await dispatchZplLabel(printer('bartender_rest'), '^XA^XZ', 1);
    expect(res.ok).toBe(false);
    expect(listSimulatedPrints()[0].outcome).toBe('failed');
  });

  it('is a real error, not simulated, when an API server is configured', async () => {
    setDataMayPersistInBrowserForTests(false);
    const res = await dispatchZplLabel(printer('bartender_rest'), '^XA^XZ', 1);
    expect(res.ok).toBe(false);
    expect(listSimulatedPrints()).toHaveLength(0);
  });

  it('bridgeDispatchesZpl: real bridges always, simulated ones only in the demo, browser dialog never', () => {
    expect(bridgeDispatchesZpl({ bridgeType: 'qz_tray' })).toBe(true);
    expect(bridgeDispatchesZpl({ bridgeType: 'pathscribe_agent' })).toBe(true);
    expect(bridgeDispatchesZpl({ bridgeType: 'direct_interface_engine' })).toBe(true);
    expect(bridgeDispatchesZpl({ bridgeType: 'os_print_dialog' })).toBe(false);
    setDataMayPersistInBrowserForTests(false);
    expect(bridgeDispatchesZpl({ bridgeType: 'direct_interface_engine' })).toBe(false);
    expect(bridgeDispatchesZpl({ bridgeType: 'qz_tray' })).toBe(true);
  });
});
