// src/utils/labels/printCassetteSlideLabel.test.ts
import { storageSet } from '@/services/mockStorage';
import { setDataMayPersistInBrowserForTests } from '@/services/browserData/browserDataPolicy';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./qzTrayBridge', () => ({
  printZplViaQzTray: vi.fn(),
  // PS-55: the dispatcher connects before printing; these tests are about what is printed.
  isQzTrayConnected: vi.fn(() => true),
  connectToQzTray: vi.fn(async () => ({ ok: true, data: undefined })),
}));
// Batch 734: these tests are about the bridges, so the facility allows direct printing (the block is tested in
// services/printing/directDevicePrinting.test.ts).
vi.mock('@/services/printing/directDevicePrintingDeps', () => ({
  directDevicePrintingDeps: { demo: () => false, facilityAllows: async () => true, audit: () => undefined },
}));
vi.mock('./dispatchNetworkPrintJob', async () => {
  const actual = await vi.importActual<typeof import('./dispatchNetworkPrintJob')>('./dispatchNetworkPrintJob');
  return { ...actual, dispatchNetworkPrintJob: vi.fn(actual.dispatchNetworkPrintJob) };
});

import { DEFAULT_CASSETTE_LABEL_LAYOUT } from '@/services/printSettings/IPrintSettingsService';
import { printCassetteLabel, printSlideLabel } from './printCassetteSlideLabel';
import type { PrintCassetteSlideLabelError } from './printCassetteSlideLabel';
import { printZplViaQzTray } from './qzTrayBridge';
import { dispatchNetworkPrintJob } from './dispatchNetworkPrintJob';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';

const basePrinter: PrinterProfile = {
  id: 'printer-1', printerId: 'ZEBRA-TEST', model: 'ZT411', dpi: 300,
  supportsDataMatrix: true, supportsGS1: true, zplVersion: '7.0',
  maxPrintDensity: 300, moduleSize: 4, vendor: 'ZEBRA_ZPL', bridgeType: 'qz_tray',
  ipAddress: '192.168.1.50', port: 9100, active: true,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

const cassetteInput = {
  fullAccession: 'S26-4403', specimenLabel: 'A', blockLabel: '1', cassetteId: 'A1', patientName: 'DOE, JOHN',
};
const slideInput = {
  fullAccession: 'S26-4403', specimenLabel: 'A', blockLabel: '1', level: 'L1', stainName: 'H&E', slideId: 'A1L1',
};

describe('printCassetteSlideLabel — real, parallel printed path alongside engraving (per direct follow-up: "support both slide engraving and printed labels")', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('printCassetteLabel', () => {
    it('refuses cleanly, with a real, specific message, when no GTIN is configured — never encodes a fabricated value', async () => {
      const result = await printCassetteLabel(cassetteInput, basePrinter, '', DEFAULT_CASSETTE_LABEL_LAYOUT);
      expect(result.ok).toBe(false);
      if (!result.ok) expect((result as PrintCassetteSlideLabelError).message).toContain('No GS1 GTIN configured');
      expect(printZplViaQzTray).not.toHaveBeenCalled();
    });

    it('refuses cleanly on invalid GS1 fields (e.g. an illegal character) before ever attempting dispatch', async () => {
      const result = await printCassetteLabel({ ...cassetteInput, cassetteId: 'A_1' }, basePrinter, '00850000000000', DEFAULT_CASSETTE_LABEL_LAYOUT);
      expect(result.ok).toBe(false);
      expect(printZplViaQzTray).not.toHaveBeenCalled();
    });

    it('real, working qz_tray dispatch — the already-built ZPL template is passed straight through', async () => {
      (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined });
      const result = await printCassetteLabel(cassetteInput, basePrinter, '00850000000000', DEFAULT_CASSETTE_LABEL_LAYOUT);
      expect(result.ok).toBe(true);
      expect(printZplViaQzTray).toHaveBeenCalledTimes(1);
      const [printerId, zpl] = (printZplViaQzTray as any).mock.calls[0];
      expect(printerId).toBe('ZEBRA-TEST');
      expect(zpl).toContain('^XA');
      expect(zpl).toContain('^BXN,3,200,,,1'); // real, corrected ECC200 level; module dots now computed from the real, admin-configured layout
    });

    it('a real qz_tray dispatch failure is reported, not swallowed', async () => {
      (printZplViaQzTray as any).mockResolvedValue({ ok: false, message: 'QZ Tray does not appear to be running.' });
      const result = await printCassetteLabel(cassetteInput, basePrinter, '00850000000000', DEFAULT_CASSETTE_LABEL_LAYOUT);
      expect(result.ok).toBe(false);
      if (!result.ok) expect((result as PrintCassetteSlideLabelError).message).toContain('does not appear to be running');
    });

    it('real, working direct_interface_engine dispatch — routes through the real, already-tested NetworkPrintPayload contract', async () => {
      const printer: PrinterProfile = { ...basePrinter, bridgeType: 'direct_interface_engine' };
      const result = await printCassetteLabel(cassetteInput, printer, '00850000000000', DEFAULT_CASSETTE_LABEL_LAYOUT);
      expect(result.ok).toBe(true);
      expect(dispatchNetworkPrintJob).toHaveBeenCalledTimes(1);
      expect(printZplViaQzTray).not.toHaveBeenCalled();
    });

    it('real, honest refusal for a bridge type with no implementation yet — never silently no-ops', async () => {
      // Batch 606: in the demo this route answers Simulated; with an API server it is a real refusal.
      setDataMayPersistInBrowserForTests(false);
      const printer: PrinterProfile = { ...basePrinter, bridgeType: 'zebra_browser_print' };
      const result = await printCassetteLabel(cassetteInput, printer, '00850000000000', DEFAULT_CASSETTE_LABEL_LAYOUT);
      setDataMayPersistInBrowserForTests(null);
      expect(result.ok).toBe(false);
      if (!result.ok) expect((result as PrintCassetteSlideLabelError).message).toContain('zebra_browser_print');
    });

    it('real feature, per direct follow-up (cell block spec): a real cellBlockNumber applies the -CB{n} suffix (not the spec\'s own literal underscore) to both the GS1-encoded id and the visible label text', async () => {
      (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined });
      const result = await printCassetteLabel({ ...cassetteInput, cellBlockNumber: 1 }, basePrinter, '00850000000000', DEFAULT_CASSETTE_LABEL_LAYOUT);
      expect(result.ok).toBe(true);
      const [, zpl] = (printZplViaQzTray as any).mock.calls[0];
      expect(zpl).toContain('1-CB1'); // suffixed block label, visible text
      expect(zpl).not.toContain('_CB1'); // never the spec's own illegal underscore form
    });

    it('with no cellBlockNumber, an ordinary tissue block cassette is never suffixed', async () => {
      (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined });
      await printCassetteLabel(cassetteInput, basePrinter, '00850000000000', DEFAULT_CASSETTE_LABEL_LAYOUT);
      const [, zpl] = (printZplViaQzTray as any).mock.calls[0];
      expect(zpl).not.toContain('-CB');
    });
  });

  describe('printSlideLabel', () => {
    it('refuses cleanly when no GTIN is configured', async () => {
      const result = await printSlideLabel(slideInput, basePrinter, '');
      expect(result.ok).toBe(false);
    });

    it('real, working qz_tray dispatch using the real, compact slide template — not the cassette one', async () => {
      (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined });
      const result = await printSlideLabel(slideInput, basePrinter, '00850000000000');
      expect(result.ok).toBe(true);
      const [, zpl] = (printZplViaQzTray as any).mock.calls[0];
      expect(zpl).toContain('^BXN,2,200,,,1'); // the slide template's own, smaller module size; columns/rows blank (auto), not 0
    });

    it('direct_interface_engine sends a slide with its own payload: labelType SLIDE, level and stain (Batch 347; it used to refuse)', async () => {
      const printer: PrinterProfile = { ...basePrinter, bridgeType: 'direct_interface_engine' };
      const result = await printSlideLabel(slideInput, printer, '00850000000000');
      expect(result.ok).toBe(true);
      expect(dispatchNetworkPrintJob).toHaveBeenCalledTimes(1);
      const [payload] = (dispatchNetworkPrintJob as any).mock.calls[0];
      expect(payload.labelData).toMatchObject({ labelType: 'SLIDE', slide: { level: slideInput.level, stainName: slideInput.stainName } });
    });

    // Batch 715: the slide setting changes the printed level text only; the barcode keeps the L1 code.
    it('slide numbers print the level as L1 (as always); slide letters print La, with the barcode unchanged', async () => {
      (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined });
      await printSlideLabel({ ...slideInput, slideDesignation: 'numbers' }, basePrinter, '00850000000000');
      const numbers = (printZplViaQzTray as any).mock.calls[0][1] as string;
      expect(numbers).toContain('^FDA1 L1^FS');
      vi.clearAllMocks();
      (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined });
      await printSlideLabel({ ...slideInput, level: 'L2', slideDesignation: 'letters' }, basePrinter, '00850000000000');
      const letters = (printZplViaQzTray as any).mock.calls[0][1] as string;
      expect(letters).toContain('^FDA1 Lb^FS');
      expect(letters).not.toContain('A1 L2');
      expect(letters).toContain('A1L1'); // the slide id inside the barcode is the one given, untouched
    });

    it('real feature, per direct follow-up: a real cellBlockNumber applies the -CB{n} suffix to a slide cut from a cell block too', async () => {
      (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined });
      await printSlideLabel({ ...slideInput, cellBlockNumber: 2 }, basePrinter, '00850000000000');
      const [, zpl] = (printZplViaQzTray as any).mock.calls[0];
      expect(zpl).toContain('1-CB2');
    });
  });
});

describe('slide and block labels follow the admin layouts (Batch 606, PS-15 / PS-165 / PS-26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (printZplViaQzTray as any).mockResolvedValue({ ok: true, data: undefined });
    storageSet('label_designer_layouts', []);
  });

  it('the slide layout sets the module size and text position of the printed ZPL', async () => {
    await printSlideLabel(slideInput, basePrinter, '00850000000000', { faceWidthMm: 25, faceHeightMm: 10, moduleSizeMm: 0.3, fontHeightMm: 1.6 });
    const [, zpl] = (printZplViaQzTray as any).mock.calls[0];
    expect(zpl).toContain('^BXN,4,');
    expect(zpl).toContain('^A0N,19,19');
  });

  it('without a layout argument the saved Print settings layout (default) is used: the original ZPL', async () => {
    await printSlideLabel(slideInput, basePrinter, '00850000000000');
    const [, zpl] = (printZplViaQzTray as any).mock.calls[0];
    expect(zpl).toContain('^FO70,10^A0N,14,14');
  });

  it('a slide layout saved in the label designer replaces the built-in slide ZPL', async () => {
    storageSet('label_designer_layouts', [{
      id: 'l1', labelType: 'slide', widthMm: 25.4, heightMm: 9.5, updatedAt: '',
      fields: [{ id: 'f1', fieldKey: 'stainName', xMm: 1, yMm: 1, widthMm: 10, heightMm: 3, fontSizeMm: 1.5 }],
    }]);
    await printSlideLabel(slideInput, basePrinter, '00850000000000');
    const [, zpl] = (printZplViaQzTray as any).mock.calls[0];
    expect(zpl).toContain('^FDH&E^FS');
    expect(zpl).not.toContain('^BXN');
  });

  it('a block layout saved in the label designer replaces the built-in cassette ZPL, and the built-in one is used when none is saved', async () => {
    await printCassetteLabel(cassetteInput, basePrinter, '00850000000000', DEFAULT_CASSETTE_LABEL_LAYOUT);
    expect((printZplViaQzTray as any).mock.calls[0][1]).toContain('^BXN');
    storageSet('label_designer_layouts', [{
      id: 'l2', labelType: 'block', widthMm: 25.4, heightMm: 12.7, updatedAt: '',
      fields: [{ id: 'f1', fieldKey: 'patientName', xMm: 1, yMm: 1, widthMm: 20, heightMm: 3, fontSizeMm: 1.5 }],
    }]);
    await printCassetteLabel(cassetteInput, basePrinter, '00850000000000', DEFAULT_CASSETTE_LABEL_LAYOUT);
    const zpl = (printZplViaQzTray as any).mock.calls[1][1];
    expect(zpl).toContain('^FDDOE, JOHN^FS');
    expect(zpl).not.toContain('^BXN');
  });
});
