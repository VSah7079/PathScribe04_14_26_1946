// @vitest-environment happy-dom
//
// src/utils/labels/printMolecularLabels.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Batch 428: these tests are about the service, not who may use it, so Configuration
// changes are allowed here (the check itself: authorization/guardConfigWrites.test.ts).
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import type { MolecularBatch } from '@/services/molecular/IMolecularBatchService';

vi.mock('qz-tray', () => ({
  websocket: { isActive: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
  printers: { find: vi.fn() },
  configs: { create: vi.fn() },
  print: vi.fn(),
  security: { setCertificatePromise: vi.fn(), setSignaturePromise: vi.fn() },
}));

function makeBatch(overrides: Partial<MolecularBatch> = {}): MolecularBatch {
  return {
    id: 'mb-001', batchBarcode: 'BATCH-20260906-0042', batchUuid: 'e3b0c442-98fc-4c14-963b-944882006122',
    assayCode: 'HPV_HR_PCR', assayName: 'High-Risk HPV Real-Time PCR', targetInstrumentId: 'PANTHER_02',
    deckSlot: 'SLOT_A1', plateUuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', plateBarcode: 'PLT-HPV-20260906-012',
    plateLayout: '96_well', reagentLots: [], status: 'active', createdAt: '2026-09-06T16:47:35.000Z',
    createdByUserId: 'u1', createdByUserName: 'Test User',
    wells: [
      { wellPosition: 'A01', sampleType: 'CONTROL_NTC' },
      { wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-20260906-8831', accessionNumber: 'PS26-100452', aliquotVolumeUl: 200 },
      { wellPosition: 'A04', sampleType: 'PATIENT_SPECIMEN' }, // real, not-yet-scanned well — no containerBarcode
    ],
    ...overrides,
  };
}

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  vi.stubGlobal('open', vi.fn(() => ({
    document: { write: vi.fn(), close: vi.fn() },
    focus: vi.fn(),
    print: vi.fn(),
  })));
});

describe('printMolecularSpecimenLabels — real, per the given specification\'s own §3.1 (no real hardware bridge configured — the real, established window.print() fallback)', () => {
  it('prints one real label per real, scanned-in patient specimen well', async () => {
    const { printMolecularSpecimenLabels } = await import('./printMolecularLabels');
    expect(await printMolecularSpecimenLabels(makeBatch())).toBe(true);
  });

  it('a real batch with no real, scanned specimen wells yet is an honest no-op, never a fabricated blank label', async () => {
    const { printMolecularSpecimenLabels } = await import('./printMolecularLabels');
    const batch = makeBatch({ wells: [{ wellPosition: 'A01', sampleType: 'CONTROL_NTC' }] });
    expect(await printMolecularSpecimenLabels(batch)).toBe(false);
  });
});

describe('printMolecularPlateLabel — real, per the given specification\'s own §2.3', () => {
  it('prints the real plate label', async () => {
    const { printMolecularPlateLabel } = await import('./printMolecularLabels');
    expect(await printMolecularPlateLabel(makeBatch())).toBe(true);
  });
});

describe('printMolecularRackLabel — real, per the given specification\'s own §2.2', () => {
  it('prints a real rack label using the real, given sequence number', async () => {
    const { printMolecularRackLabel } = await import('./printMolecularLabels');
    expect(await printMolecularRackLabel(7)).toBe(true);
  });

  it('real, direct bug fix verified: the real, dispatched ZPL carries the rack\'s own real, human-readable barcode text — not just the scannable barcode itself, matching every sibling molecular label', async () => {
    const qz = await import('qz-tray');
    (qz.websocket.isActive as any).mockReturnValue(true);
    (qz.print as any).mockResolvedValue(undefined);

    const { mockPrintSettingsService: printSettingsService } = await import('@/services/printSettings/mockPrintSettingsService');
    const { mockPrinterProfileService: printerProfileService } = await import('@/services/printerProfiles/mockPrinterProfileService');
    const profileRes = await printerProfileService.add({
      printerId: 'Zebra ZT411', model: 'ZT411', dpi: 300, supportsDataMatrix: true, supportsGS1: false,
      zplVersion: 'II', maxPrintDensity: 8, moduleSize: 4, vendor: 'zebra', bridgeType: 'qz_tray',
    } as any);
    if (!profileRes.ok) throw new Error('setup failed');
    await printSettingsService.update({ molecularLabelPrinterProfileId: profileRes.data.id });

    vi.stubGlobal('open', vi.fn());

    const { printMolecularRackLabel } = await import('./printMolecularLabels');
    const result = await printMolecularRackLabel(7);
    expect(result).toBe(true);
    expect(qz.print).toHaveBeenCalled();
    const [, zplLines] = (qz.print as any).mock.calls[0];
    const zpl = zplLines[0] as string;
    // Real, per generateExtractionRackBarcode's own real, deterministic
    // format for sequence 7 — confirms the real rack barcode appears
    // as real, printed ^FD text, not only inside the barcode command.
    expect(zpl).toMatch(/RACK-MOLE-\d+/);
    const barcodeFieldCount = (zpl.match(/\^FD/g) ?? []).length;
    expect(barcodeFieldCount).toBeGreaterThanOrEqual(2); // one for the scannable payload, one for the real, human-readable text line
  });
});

describe('printMolecularDeckLocationLabel — real, per the given specification\'s own §3.1', () => {
  it('prints the real deck location label when a real deck slot is assigned', async () => {
    const { printMolecularDeckLocationLabel } = await import('./printMolecularLabels');
    expect(await printMolecularDeckLocationLabel(makeBatch())).toBe(true);
  });

  it('a real batch with no real deck slot assigned yet is an honest no-op', async () => {
    const { printMolecularDeckLocationLabel } = await import('./printMolecularLabels');
    expect(await printMolecularDeckLocationLabel(makeBatch({ deckSlot: undefined }))).toBe(false);
  });
});

describe('printMolecularPlateLabel — real, per direct follow-up ("should we update the req and container labels as well"): the real QZ Tray hardware-bridge path, when configured', () => {
  it('dispatches via the real, configured QZ Tray bridge instead of window.print() when a real printer profile is set', async () => {
    const qz = await import('qz-tray');
    (qz.websocket.isActive as any).mockReturnValue(true);
    (qz.print as any).mockResolvedValue(undefined);

    const { mockPrintSettingsService: printSettingsService } = await import('@/services/printSettings/mockPrintSettingsService');
    const { mockPrinterProfileService: printerProfileService } = await import('@/services/printerProfiles/mockPrinterProfileService');
    const profileRes = await printerProfileService.add({
      printerId: 'Zebra ZT411', model: 'ZT411', dpi: 300, supportsDataMatrix: true, supportsGS1: false,
      zplVersion: 'II', maxPrintDensity: 8, moduleSize: 4, vendor: 'zebra', bridgeType: 'qz_tray',
    } as any);
    if (!profileRes.ok) throw new Error('setup failed');
    await printSettingsService.update({ molecularLabelPrinterProfileId: profileRes.data.id });

    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);

    const { printMolecularPlateLabel } = await import('./printMolecularLabels');
    const result = await printMolecularPlateLabel(makeBatch());
    expect(result).toBe(true);
    expect(qz.print).toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled(); // real, honest confirmation — the browser print dialog was never opened
  });
});

// PS-231 (Batch 450): the browser-print path, checked by what is actually
// written to the print window — label count and content — not only the
// true/false return.
function capturePrintWindow(): { writes: string[]; openSpy: ReturnType<typeof vi.fn> } {
  const writes: string[] = [];
  const openSpy = vi.fn(() => ({
    document: { write: (html: string) => { writes.push(html); }, close: vi.fn() },
    focus: vi.fn(),
    print: vi.fn(),
  }));
  vi.stubGlobal('open', openSpy);
  return { writes, openSpy };
}
const labelCount = (html: string) => (html.match(/class="ps-label ps-label--/g) ?? []).length;

describe('molecular label printing (PS-231) — what reaches the print window', () => {
  it('specimen labels: one label per scanned-in patient specimen well, each carrying its own container barcode and accession', async () => {
    const { writes, openSpy } = capturePrintWindow();
    const { printMolecularSpecimenLabels } = await import('./printMolecularLabels');
    const batch = makeBatch({ wells: [
      { wellPosition: 'A01', sampleType: 'CONTROL_NTC', containerBarcode: 'CTRL-NTC-001' },
      { wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-20260906-00008831', accessionNumber: 'PS26-100452' },
      { wellPosition: 'A04', sampleType: 'PATIENT_SPECIMEN' },
      { wellPosition: 'A05', sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-20260906-00008832', accessionNumber: 'PS26-100453' },
    ] });
    expect(await printMolecularSpecimenLabels(batch)).toBe(true);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(1);
    const html = writes[0];
    expect(labelCount(html)).toBe(2);
    expect(html).toContain('SPEC-20260906-00008831');
    expect(html).toContain('PS26-100452');
    expect(html).toContain('SPEC-20260906-00008832');
    expect(html).toContain('PS26-100453');
    expect(html).not.toContain('CTRL-NTC-001');
  });

  it('specimen labels: a batch with no scanned patient specimen wells opens no print window at all', async () => {
    const { writes, openSpy } = capturePrintWindow();
    const { printMolecularSpecimenLabels } = await import('./printMolecularLabels');
    expect(await printMolecularSpecimenLabels(makeBatch({ wells: [{ wellPosition: 'A01', sampleType: 'CONTROL_NTC' }, { wellPosition: 'A02', sampleType: 'PATIENT_SPECIMEN' }] }))).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });

  it('plate label: one label with the plate barcode, assay and instrument', async () => {
    const { writes } = capturePrintWindow();
    const { printMolecularPlateLabel } = await import('./printMolecularLabels');
    expect(await printMolecularPlateLabel(makeBatch())).toBe(true);
    expect(labelCount(writes[0])).toBe(1);
    expect(writes[0]).toContain('PLT-HPV-20260906-012');
    expect(writes[0]).toContain('High-Risk HPV Real-Time PCR');
    expect(writes[0]).toContain('PANTHER_02');
  });

  it('extraction rack label: one label whose barcode uses the supplied sequence number', async () => {
    const { writes } = capturePrintWindow();
    const { printMolecularRackLabel } = await import('./printMolecularLabels');
    expect(await printMolecularRackLabel(42)).toBe(true);
    expect(labelCount(writes[0])).toBe(1);
    expect(writes[0]).toContain('RACK-MOLE-00042');
  });

  it('deck location label: one label for the assigned deck slot; no print window when there is no slot', async () => {
    const { writes, openSpy } = capturePrintWindow();
    const { printMolecularDeckLocationLabel } = await import('./printMolecularLabels');
    expect(await printMolecularDeckLocationLabel(makeBatch({ deckSlot: 'SLOT_B2' }))).toBe(true);
    expect(labelCount(writes[0])).toBe(1);
    expect(writes[0]).toContain('LOC-INST-PANTHER_02-SLOT_B2');
    expect(writes[0]).toContain('SLOT_B2');

    openSpy.mockClear();
    expect(await printMolecularDeckLocationLabel(makeBatch({ deckSlot: undefined }))).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
    expect(writes).toHaveLength(1);
  });
});

describe('molecular labels via Direct via Interface Engine (Batch 606, PS-63)', () => {
  it('each label goes to the simulated engine route in the demo and none opens the print dialog', async () => {
    const { listSimulatedPrints, resetSimulatedPrintForTests } = await import('@/services/printing/simulatedPrint');
    resetSimulatedPrintForTests();
    const { mockPrinterProfileService } = await import('@/services/printerProfiles/mockPrinterProfileService');
    const { mockPrintSettingsService } = await import('@/services/printSettings/mockPrintSettingsService');
    const profile = await mockPrinterProfileService.add({
      printerId: 'IE-MOL-1', model: 'ZT411', dpi: 203, supportsDataMatrix: true, supportsGS1: false,
      zplVersion: 'II', maxPrintDensity: 8, moduleSize: 4, vendor: 'zebra', bridgeType: 'direct_interface_engine',
    } as any);
    if (!profile.ok) throw new Error('setup failed');
    await mockPrintSettingsService.update({ molecularLabelPrinterProfileId: profile.data.id });
    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
    const { printMolecularSpecimenLabels, printMolecularPlateLabel, printMolecularRackLabel, printMolecularDeckLocationLabel } = await import('./printMolecularLabels');
    expect(await printMolecularSpecimenLabels(makeBatch())).toBe(true);
    expect(await printMolecularPlateLabel(makeBatch())).toBe(true);
    expect(await printMolecularRackLabel(7)).toBe(true);
    expect(await printMolecularDeckLocationLabel(makeBatch())).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
    expect(listSimulatedPrints()).toHaveLength(4);
    expect(listSimulatedPrints().every(r => r.transport === 'direct_interface_engine' && r.destination === 'IE-MOL-1')).toBe(true);
  });
});
