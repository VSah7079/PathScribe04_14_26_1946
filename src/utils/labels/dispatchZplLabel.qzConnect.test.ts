import { beforeEach, describe, expect, it, vi } from 'vitest';

const bridge = vi.hoisted(() => ({
  connectToQzTray: vi.fn(),
  isQzTrayConnected: vi.fn(),
  printZplViaQzTray: vi.fn(),
}));
vi.mock('./qzTrayBridge', () => bridge);

import { dispatchZplLabel } from './dispatchZplLabel';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';

const printer = { id: 'p1', name: 'Zebra', bridgeType: 'qz_tray', printerId: 'ZDesigner' } as unknown as PrinterProfile;

beforeEach(() => { vi.clearAllMocks(); });

describe('QZ Tray connection before a label prints (PS-55)', () => {
  it('connects first when not connected, then prints', async () => {
    bridge.isQzTrayConnected.mockReturnValue(false);
    bridge.connectToQzTray.mockResolvedValue({ ok: true, data: undefined });
    bridge.printZplViaQzTray.mockResolvedValue({ ok: true, data: undefined });
    const result = await dispatchZplLabel(printer, '^XA^XZ', 1);
    expect(bridge.connectToQzTray).toHaveBeenCalledTimes(1);
    expect(bridge.printZplViaQzTray).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it('does not reconnect when already connected', async () => {
    bridge.isQzTrayConnected.mockReturnValue(true);
    bridge.printZplViaQzTray.mockResolvedValue({ ok: true, data: undefined });
    await dispatchZplLabel(printer, '^XA^XZ', 1);
    expect(bridge.connectToQzTray).not.toHaveBeenCalled();
  });

  it('returns the "not running" message and does not print when QZ Tray cannot be reached', async () => {
    bridge.isQzTrayConnected.mockReturnValue(false);
    bridge.connectToQzTray.mockResolvedValue({ ok: false, message: 'QZ Tray does not appear to be running on this workstation.' });
    const result = await dispatchZplLabel(printer, '^XA^XZ', 1);
    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toContain('QZ Tray does not appear to be running');
    expect(bridge.printZplViaQzTray).not.toHaveBeenCalled();
  });
});
