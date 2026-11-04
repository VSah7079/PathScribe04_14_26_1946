// @vitest-environment happy-dom
// Batch 669 (ws-8): the Slide Distribution station saves through the shared retrying save; a save that fails says
// "Not saved", reloads the queued slides from the stored case and prints nothing for an unsaved reprint reason.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }), initReactI18next: { type: '3rdParty', init: () => {} } }));
vi.mock('@/utils/labels/printCassetteSlideLabel', () => ({ printSlideLabel: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-9', name: 'Lee Tran' } }) }));
vi.mock('@/hooks/useEffectiveScanStation', () => ({ useEffectiveScanStation: () => ({ effectiveStationId: 'st1' }) }));
vi.mock('@/hooks/useFieldRequirements', () => ({ useFieldRequirements: () => [] }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: {} }));
const h = vi.hoisted(() => ({ store: { current: null as any }, getCase: vi.fn(), updateCase: vi.fn(), resolve: vi.fn(), printSlideLabel: vi.fn() }));
vi.mock('@/utils/resolveMaterialFromScan', () => ({ resolveMaterialFromScan: (...a: unknown[]) => h.resolve(...a) }));
vi.mock('@/services', () => ({
  caseWriteDeps: { getCase: (...a: unknown[]) => h.getCase(...a), updateCase: (...a: unknown[]) => h.updateCase(...a) },
  printerProfileService: { getById: async () => ({ ok: true, data: { id: 'p1' } }) },
  printSettingsService: { get: async () => ({ ok: true, data: { gs1Gtin: 'G1', slideLabelLayout: { faceWidthMm: 33, faceHeightMm: 11 } } }) },
  scanStationService: { getById: async () => ({ ok: true, data: { supportsPrinting: true, cassetteSlidePrinterProfileId: 'p1' } }) },
  userService: {}, subspecialtyService: {}, equipmentService: {},
  slideCheckoutMissing: () => [], scannerLoadMissing: () => [], slideExceptionMissing: () => [], slideReprintMissing: () => [],
}));

import { useSlideDistributionStation } from './useSlideDistributionStation';

const makeCase = (version: number, stain: Record<string, unknown> = {}) => ({
  id: 'c1', version, accession: { fullAccession: 'S26-0001' },
  specimens: [{ id: 'sp1', label: 'A', blocks: [{ id: 'b1', label: '1', stains: [{ id: 'st-1', stainName: 'H&E', ...stain }] }] }],
});
const slideTarget = { level: 'slide', blockNumber: '1', slideLevel: 1 };

async function open() {
  const initial = makeCase(1);
  h.store.current = initial;
  h.getCase.mockImplementation(async () => h.store.current);
  h.resolve.mockResolvedValue({ caseData: initial, specimenLetter: 'A', target: slideTarget });
  const hook = renderHook(() => useSlideDistributionStation());
  await act(async () => { await hook.result.current.resolveScan('X'); });
  return hook;
}

beforeEach(() => {
  h.updateCase.mockReset().mockImplementation(async (_id: string, u: any) => { h.store.current = { ...h.store.current, specimens: u.specimens, version: h.store.current.version + 1 }; });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('useSlideDistributionStation — saving (ws-8)', () => {
  it('a saved checkout shows on the queued slide and clears no message', async () => {
    const hook = await open();
    expect(hook.result.current.queue).toHaveLength(1);
    let r: any;
    await act(async () => { r = await hook.result.current.handleAssignPhysical(hook.result.current.queue[0].queueId, { trayNumber: 'T1' }); });
    expect(r.ok).toBe(true);
    expect(hook.result.current.saveError).toBeNull();
    expect(hook.result.current.queue[0].stain.distributionDestination).toBe('physical');
  });

  it('a failed save says "Not saved", is not reported as done, and the queued slide is shown as stored', async () => {
    const hook = await open();
    h.updateCase.mockRejectedValue(new Error('down'));
    let r: any;
    await act(async () => { r = await hook.result.current.handleAssignPhysical(hook.result.current.queue[0].queueId, { trayNumber: 'T1' }); });
    expect(r).toEqual({ ok: false, notSaved: true });
    expect(hook.result.current.saveError).toBe('workstationSave.notApplied');
    expect(hook.result.current.queue[0].stain.distributionDestination).toBeUndefined();
  });

  it('a conflict is retried on the newer case, and shown as saved when it goes through', async () => {
    const hook = await open();
    const { ConcurrencyConflictError } = await import('@/services/cases/ConcurrencyConflictError');
    h.updateCase.mockImplementationOnce(async () => { h.store.current = { ...h.store.current, version: 2 }; throw new ConcurrencyConflictError('c1', 1, 2); });
    let r: any;
    await act(async () => { r = await hook.result.current.handleAssignPhysical(hook.result.current.queue[0].queueId, { trayNumber: 'T1' }); });
    expect(r.ok).toBe(true);
    expect(h.updateCase).toHaveBeenCalledTimes(2);
    expect(hook.result.current.saveError).toBeNull();
  });

  it('a label reprint whose reason was not saved prints nothing', async () => {
    const hook = await open();
    const print = (await import('@/utils/labels/printCassetteSlideLabel')).printSlideLabel as unknown as ReturnType<typeof vi.fn>;
    h.updateCase.mockRejectedValue(new Error('down'));
    let r: any;
    await act(async () => { r = await hook.result.current.handleRequestReprint(hook.result.current.queue[0].queueId, 'Smudged Print'); });
    expect(r.ok).toBe(false);
    expect(r.notSaved).toBe(true);
    expect(print).not.toHaveBeenCalled();
  });

  it('ws-14: the replacement label is printed with the configured slide label layout', async () => {
    const hook = await open();
    const print = (await import('@/utils/labels/printCassetteSlideLabel')).printSlideLabel as unknown as ReturnType<typeof vi.fn>;
    print.mockClear();
    let r: any;
    await act(async () => { r = await hook.result.current.handleRequestReprint(hook.result.current.queue[0].queueId, 'Smudged Print'); });
    expect(r.ok).toBe(true);
    expect(print).toHaveBeenCalledTimes(1);
    const args = print.mock.calls[0];
    expect(args[2]).toBe('G1');
    expect(args[3]).toEqual({ faceWidthMm: 33, faceHeightMm: 11 });
  });
});
