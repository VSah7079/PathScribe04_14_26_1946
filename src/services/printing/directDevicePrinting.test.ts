// Batch 734 (Pete, Oct 30, 2026; spec Decision 6): direct browser-to-printer printing is blocked in a server
// deployment unless the facility allows it, and audited; the interface engine and the dialog are never blocked.
import { describe, it, expect, vi } from 'vitest';
import { directPrintDecision, checkDirectDevicePrint, isDirectDeviceBridge } from './directDevicePrinting';

describe('direct device printing', () => {
  it('only QZ Tray, the PathScribe Agent, Zebra Browser Print and BarTender are direct', () => {
    expect(['qz_tray', 'pathscribe_agent', 'zebra_browser_print', 'bartender_rest'].every(b => isDirectDeviceBridge(b as never))).toBe(true);
    expect(isDirectDeviceBridge('direct_interface_engine')).toBe(false);
    expect(isDirectDeviceBridge('os_print_dialog')).toBe(false);
  });
  it('the demo allows it; a server deployment only where the facility turned it on', () => {
    expect(directPrintDecision('qz_tray', true, undefined)).toBe('allowedDemo');
    expect(directPrintDecision('qz_tray', false, false)).toBe('blocked');
    expect(directPrintDecision('pathscribe_agent', false, true)).toBe('allowedByFacility');
    expect(directPrintDecision('direct_interface_engine', false, false)).toBe('notDirect');
  });
  it('audits an allowed or blocked direct print in a server deployment, and nothing for the interface engine', async () => {
    const audit = vi.fn();
    const deps = (allows: boolean) => ({ demo: () => false, facilityAllows: vi.fn(async () => allows), audit });
    expect(await checkDirectDevicePrint({ bridgeType: 'qz_tray', facilityId: 'f1', printerId: 'P1' }, 'slide-label', deps(false))).toBe('blocked');
    expect(audit).toHaveBeenLastCalledWith('Direct Device Print Blocked', expect.stringContaining('P1'));
    expect(await checkDirectDevicePrint({ bridgeType: 'qz_tray', facilityId: 'f1', printerId: 'P1' }, 'slide-label', deps(true))).toBe('allowedByFacility');
    expect(audit).toHaveBeenLastCalledWith('Direct Device Print', expect.stringContaining('slide-label'));
    audit.mockClear();
    expect(await checkDirectDevicePrint({ bridgeType: 'direct_interface_engine', printerId: 'P2' }, 'x', deps(false))).toBe('notDirect');
    expect(audit).not.toHaveBeenCalled();
  });
});
