// @vitest-environment happy-dom
// Batch 758 (Pete, Nov 1, 2026): the Microtome's Block print mode (all of a block's labels print when it is scanned),
// and the block lockout (moving on while labels of this block are not scanned back), with Recut, Void and Continue.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }), initReactI18next: { type: '3rdParty', init: () => {} } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1', name: 'Lee Tran' } }) }));
vi.mock('@/hooks/useEffectiveScanStation', () => ({ useEffectiveScanStation: () => ({ effectiveStationId: 'st1' }) }));
vi.mock('@/hooks/useFieldRequirements', () => ({ useFieldRequirements: () => [] }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase: async () => h.store.current } }));
vi.mock('@/utils/labels/dispatchSlideLabel', () => ({ wasSlideLabelOutput: () => false, markSlideLabelOutput: () => {} }));
vi.mock('@/services/communications/notificationService', () => ({ sendEmail: (...a: unknown[]) => h.sendEmail(...a) }));
vi.mock('@/utils/labels/printCassetteSlideLabel', () => ({ printSlideLabel: (...a: unknown[]) => h.print(...a) }));
vi.mock('@/utils/resolveMaterialFromScan', () => ({ resolveMaterialFromScan: (...a: unknown[]) => h.resolve(...a) }));
vi.mock('@/services/material/caseMaterialService', () => ({ applyDecantChangeLive: (...a: unknown[]) => h.decantSave(...a) }));
const h = vi.hoisted(() => ({
  store: { current: null as any },
  getCase: vi.fn(), updateCase: vi.fn(), resolve: vi.fn(), print: vi.fn(), sendEmail: vi.fn(), decantSave: vi.fn(),
  enforce: vi.fn(), users: [] as any[], record: vi.fn(), mode: undefined as string | undefined,
}));
vi.mock('@/services/stationScans/recordStationScan', () => ({ recordStationScan: (...a: unknown[]) => h.record(...a) }));
vi.mock('@/services', async () => {
  const write = await vi.importActual<typeof import('@/services/cases/caseWrite')>('@/services/cases/caseWrite');
  const levels = await vi.importActual<typeof import('@/services/material/slideLevels')>('@/services/material/slideLevels');
  return {
    updateCaseWithRetry: write.updateCaseWithRetry,
    slideLevelOf: levels.slideLevelOf,
    caseWriteDeps: { getCase: (...a: unknown[]) => h.getCase(...a), updateCase: (...a: unknown[]) => h.updateCase(...a) },
    authorizationService: { enforce: (...a: unknown[]) => h.enforce(...a) },
    userService: { getById: async (id: string) => { const u = h.users.find(x => x.id === id); return u ? { ok: true, data: u } : { ok: false }; }, getAll: async () => ({ ok: true, data: h.users }) },
    printerProfileService: { getById: async () => ({ ok: true, data: { id: 'p1', printerId: 'P1', model: 'Z' } }) },
    printSettingsService: { get: async () => ({ ok: true, data: { gs1Gtin: 'G1', slideLabelLayout: { faceWidthMm: 20, faceHeightMm: 8 }, defaultPrintBehavior: 'on_demand', microtomePrintBehavior: h.mode } }) },
    scanStationService: { getById: async () => ({ ok: true, data: { supportsPrinting: true, cassetteSlidePrinterProfileId: 'p1' } }) },
    stainTypeService: { getAll: async () => ({ ok: true, data: [] }) },
  };
});

import { useMicrotomyWorkstation } from './useMicrotomyWorkstation';

const stain = (id: string, n: number, block = '1') => ({ id, stainName: 'H&E', status: 'Pending Cut', printStatus: 'Pending', displayId: `S26-0001-A${block}-L${n}` });
const makeCase = () => ({
  id: 'c1', version: 1, accession: { fullAccession: 'S26-0001' }, patient: {}, order: { facilityId: 'f1' },
  specimens: [{ id: 'sp1', label: 'A', blocks: [
    { id: 'b1', label: '1', status: 'Embedded', stains: [stain('s1', 1), stain('s2', 2)] },
    { id: 'b2', label: '2', status: 'Embedded', stains: [stain('t1', 1, '2')] },
  ] }],
});
const scanOf = (raw: string) => {
  const m = /^S26-0001-A(\d)(?:-L(\d))?$/.exec(raw)!;
  return { caseData: h.store.current, specimenLetter: 'A', target: m[2] ? { level: 'slide', blockNumber: m[1] } : { level: 'block', blockNumber: m[1] }, displayId: raw };
};

async function bench(mode?: string) {
  h.mode = mode;
  h.store.current = makeCase();
  h.getCase.mockImplementation(async () => h.store.current);
  h.resolve.mockImplementation(async (raw: string) => scanOf(raw));
  const hook = renderHook(() => useMicrotomyWorkstation({ bench: 'microtome' }));
  await act(async () => { await hook.result.current.loadDefaultPrintMode(); });
  return hook;
}
const scan = async (hook: any, raw: string) => { let r: any; await act(async () => { r = await hook.result.current.resolveScan(raw); }); return r; };
const current = (hook: any) => `${hook.result.current.workItem?.specimen.label}${hook.result.current.workItem?.block?.label}`;

beforeEach(() => {
  h.updateCase.mockReset().mockImplementation(async (_id: string, u: any) => { h.store.current = { ...h.store.current, ...u, version: h.store.current.version + 1 }; });
  h.print.mockReset().mockResolvedValue({ ok: true });
  h.record.mockReset().mockReturnValue(true);
  h.enforce.mockReset().mockResolvedValue({ allowed: true });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('the Microtome print mode (Batch 758)', () => {
  it('comes from the Microtome setting, or the Grossing default when there is none', async () => {
    expect((await bench('block')).result.current.printMode).toBe('block');
    cleanup();
    expect((await bench(undefined)).result.current.printMode).toBe('on_demand');
  });
});

describe('Block mode: scanning a block prints all of its labels (Batch 758)', () => {
  it('prints every label at once, and they are scanned back in any order', async () => {
    const hook = await bench('block');
    await scan(hook, 'S26-0001-A1');
    expect(h.print).toHaveBeenCalledTimes(2);
    expect(hook.result.current.labelsToScan).toEqual(['S26-0001-A1-L1', 'S26-0001-A1-L2']);
    expect(await scan(hook, 'S26-0001-A1-L2')).toEqual({ ok: true, labelConfirmed: 'S26-0001-A1-L2' });
    expect(hook.result.current.labelsToScan).toEqual(['S26-0001-A1-L1']);
    await scan(hook, 'S26-0001-A1-L1');
    expect(hook.result.current.labelsToScan).toEqual([]);
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'S26-0001-A1-L1', action: 'sectioned' }));
  });

  it('On-Demand mode prints nothing on the block scan (Batch 757 unchanged)', async () => {
    const hook = await bench('on_demand');
    await scan(hook, 'S26-0001-A1');
    expect(h.print).not.toHaveBeenCalled();
  });
});

describe('the block lockout (Batch 758)', () => {
  it('the next block waits while labels of this one are not scanned; once they are, it opens (and prints in Block mode)', async () => {
    const hook = await bench('block');
    await scan(hook, 'S26-0001-A1');
    expect(await scan(hook, 'S26-0001-A2')).toEqual({ ok: false, message: 'microtomyWorkstation.lockout.held' });
    expect(current(hook)).toBe('A1');
    expect(hook.result.current.lockout).not.toBeNull();
    expect(hook.result.current.lockoutLabels.map((l: any) => l.slideId)).toEqual(['S26-0001-A1-L1', 'S26-0001-A1-L2']);
    await scan(hook, 'S26-0001-A1-L1');
    expect(hook.result.current.lockout).not.toBeNull();
    await scan(hook, 'S26-0001-A1-L2');
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(hook.result.current.lockout).toBeNull();
    expect(current(hook)).toBe('A2');
    expect(h.print).toHaveBeenCalledTimes(3);
  });

  it('Void cancels the slide, Recut prints a new label that is scanned back, and Continue logs the rest as not scanned', async () => {
    const hook = await bench('block');
    await scan(hook, 'S26-0001-A1');
    await scan(hook, 'S26-0001-A2');
    await act(async () => { await hook.result.current.voidWaitingSlide('s1'); });
    expect((hook.result.current.workItem as any).block.stains[0]).toMatchObject({ printStatus: 'Canceled', printFailureReason: 'Damaged Section' });
    expect(hook.result.current.lockoutLabels.map((l: any) => l.stainId)).toEqual(['s2']);
    await act(async () => { await hook.result.current.recutWaitingSlide('s2'); });
    expect(h.print).toHaveBeenCalledTimes(3);
    expect((hook.result.current.workItem as any).block.stains[1]).toMatchObject({ lastReprintReason: 'Damaged Section', printStatus: 'Printed' });
    expect(hook.result.current.lockoutLabels).toHaveLength(1);
    act(() => hook.result.current.continuePastLockout());
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'S26-0001-A1-L2', action: 'missing', note: 'Label not scanned before the next block' }));
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(current(hook)).toBe('A2');
  });

  it('Scan next is held too, and Stay on this block keeps the block open', async () => {
    const hook = await bench('block');
    await scan(hook, 'S26-0001-A1');
    act(() => hook.result.current.clearWorkItem());
    expect(hook.result.current.lockout).toEqual({ next: null });
    expect(current(hook)).toBe('A1');
    act(() => hook.result.current.stayOnBlock());
    expect(hook.result.current.lockout).toBeNull();
    expect(current(hook)).toBe('A1');
  });

  it('scanning the same block again is never held', async () => {
    const hook = await bench('block');
    await scan(hook, 'S26-0001-A1');
    expect(await scan(hook, 'S26-0001-A1')).toEqual({ ok: true });
    expect(hook.result.current.lockout).toBeNull();
  });
});
