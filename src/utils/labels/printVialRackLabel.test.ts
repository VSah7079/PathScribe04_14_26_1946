// src/utils/labels/printVialRackLabel.test.ts — Batch 615 (PS-360)
import { storageSet } from '@/services/mockStorage';
import { setDataMayPersistInBrowserForTests } from '@/services/browserData/browserDataPolicy';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./qzTrayBridge', () => ({
  printZplViaQzTray: vi.fn(),
  isQzTrayConnected: vi.fn(() => true),
  connectToQzTray: vi.fn(async () => ({ ok: true, data: undefined })),
}));
vi.mock('./dispatchNetworkPrintJob', async () => {
  const actual = await vi.importActual<typeof import('./dispatchNetworkPrintJob')>('./dispatchNetworkPrintJob');
  return { ...actual, dispatchNetworkPrintJob: vi.fn(actual.dispatchNetworkPrintJob) };
});

import { printVialLabel, printRackLabel, vialLabelLines, rackLabelLines } from './printVialRackLabel';
import { printZplViaQzTray } from './qzTrayBridge';
import { dispatchNetworkPrintJob } from './dispatchNetworkPrintJob';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';

const printer: PrinterProfile = {
  id: 'printer-1', printerId: 'ZEBRA-TEST', model: 'ZT411', dpi: 300,
  supportsDataMatrix: true, supportsGS1: true, zplVersion: '7.0',
  maxPrintDensity: 300, moduleSize: 4, vendor: 'ZEBRA_ZPL', bridgeType: 'qz_tray',
  ipAddress: '192.168.1.50', port: 9100, active: true,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const engine: PrinterProfile = { ...printer, bridgeType: 'direct_interface_engine' };

describe('printing a vial label (Batch 615, PS-360)', () => {
  beforeEach(() => { vi.clearAllMocks(); setDataMayPersistInBrowserForTests(true); storageSet('label_designer_layouts', []); (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined }); });

  it('goes to the interface engine as a VIAL payload carrying the ZPL, with the ZPL-VIAL-V1 template', async () => {
    const r = await printVialLabel({ vialId: 'V-26-0001', accessionNumber: 'S26-4403', description: 'DNA extract', volumeUl: 50 }, engine);
    expect(r.ok).toBe(true);
    expect(dispatchNetworkPrintJob).toHaveBeenCalledTimes(1);
    const [payload] = (dispatchNetworkPrintJob as any).mock.calls[0];
    expect(payload.templateVersion).toBe('ZPL-VIAL-V1');
    expect(payload.labelData.labelType).toBe('VIAL');
    expect(payload.labelData.accessionNumber).toBe('S26-4403');
    expect(payload.labelData.vialRack.barcode).toBe('V-26-0001');
    expect(payload.labelData.vialRack.zpl).toContain('^FDV-26-0001^FS');
    expect(payload.labelData.gs1DataMatrix).toBeUndefined();
  });

  it('goes to QZ Tray as ZPL on the local-bridge route', async () => {
    const r = await printVialLabel({ vialId: 'V-26-0001' }, printer);
    expect(r.ok).toBe(true);
    expect((printZplViaQzTray as any).mock.calls[0][1]).toContain('^FDV-26-0001^FS');
    expect(dispatchNetworkPrintJob).not.toHaveBeenCalled();
  });

  it('refuses with a reason and sends nothing when the id cannot be printed', async () => {
    const r = await printVialLabel({ vialId: 'V'.repeat(40) }, engine);
    expect(r.ok).toBe(false);
    expect(dispatchNetworkPrintJob).not.toHaveBeenCalled();
    expect(printZplViaQzTray).not.toHaveBeenCalled();
  });

  it('refuses for an inactive printer on the engine route', async () => {
    const r = await printVialLabel({ vialId: 'V1' }, { ...engine, active: false });
    expect(r.ok).toBe(false);
    expect(dispatchNetworkPrintJob).not.toHaveBeenCalled();
  });

  it('a molecular specimen layout saved in the label designer replaces the built-in ZPL', async () => {
    storageSet('label_designer_layouts', [{
      id: 'l1', labelType: 'molecular_specimen', widthMm: 25.4, heightMm: 12.7, updatedAt: '',
      fields: [{ id: 'f1', fieldKey: 'accessionNumber', xMm: 1, yMm: 1, widthMm: 20, heightMm: 3, fontSizeMm: 1.5 }],
    }]);
    await printVialLabel({ vialId: 'V1', accessionNumber: 'S26-1' }, printer);
    const zpl = (printZplViaQzTray as any).mock.calls[0][1];
    expect(zpl).toContain('^FDS26-1^FS');
    expect(zpl).not.toContain('^BCN');
  });

  it('builds the text lines in priority order, leaving out what is not given', () => {
    const lines = vialLabelLines({ accessionNumber: 'S26-1', volumeUl: 20 });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('S26-1');
    expect(vialLabelLines({})).toEqual([]);
  });
});

describe('printing a rack or batch label (Batch 615, PS-360)', () => {
  beforeEach(() => { vi.clearAllMocks(); setDataMayPersistInBrowserForTests(true); storageSet('label_designer_layouts', []); (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined }); });

  it('goes to the interface engine as a RACK payload with its kind, with no case on it', async () => {
    const r = await printRackLabel({ kind: 'wsi_batch', rackId: 'SCAN-0042', itemCount: 24, title: 'Batch 42' }, engine);
    expect(r.ok).toBe(true);
    const [payload] = (dispatchNetworkPrintJob as any).mock.calls[0];
    expect(payload.templateVersion).toBe('ZPL-RACK-V1');
    expect(payload.labelData.labelType).toBe('RACK');
    expect(payload.labelData.accessionNumber).toBe('');
    expect(payload.labelData.vialRack).toMatchObject({ barcode: 'SCAN-0042', rackKind: 'wsi_batch' });
  });

  it('goes to QZ Tray on the local-bridge route', async () => {
    const r = await printRackLabel({ kind: 'staining_rack', rackId: 'RACK-7' }, printer);
    expect(r.ok).toBe(true);
    expect((printZplViaQzTray as any).mock.calls[0][1]).toContain('^FDRACK-7^FS');
  });

  it('refuses an id too long for the label', async () => {
    const r = await printRackLabel({ kind: 'molecular_rack', rackId: 'R'.repeat(80) }, engine);
    expect(r.ok).toBe(false);
    expect(dispatchNetworkPrintJob).not.toHaveBeenCalled();
  });

  it('a molecular plate layout saved in the label designer is used for plates only', async () => {
    storageSet('label_designer_layouts', [{
      id: 'l3', labelType: 'molecular_plate', widthMm: 50.8, heightMm: 19.05, updatedAt: '',
      fields: [{ id: 'f1', fieldKey: 'assayName', xMm: 1, yMm: 1, widthMm: 20, heightMm: 3, fontSizeMm: 1.5 }],
    }]);
    await printRackLabel({ kind: 'molecular_plate', rackId: 'PLATE-1', title: 'EGFR' }, printer);
    expect((printZplViaQzTray as any).mock.calls[0][1]).toContain('^FDEGFR^FS');
    await printRackLabel({ kind: 'wsi_batch', rackId: 'SCAN-1', title: 'EGFR' }, printer);
    expect((printZplViaQzTray as any).mock.calls[1][1]).toContain('^BCN');
  });

  it('puts the kind first among the text lines', () => {
    const lines = rackLabelLines({ kind: 'molecular_rack', itemCount: 3 });
    expect(lines).toHaveLength(2);
  });
});
