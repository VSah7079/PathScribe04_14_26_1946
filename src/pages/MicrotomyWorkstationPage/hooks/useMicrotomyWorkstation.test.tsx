// @vitest-environment happy-dom
// Batch 669 (ws-2 decant comment and Reprint, ws-3 / ws-19 Block exhausted notice and permission, ws-4 print refusals
// shown, ws-5 Accept suggestion twice, ws-6 quick Undo): the Microtomy workstation hook.
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
  enforce: vi.fn(), users: [] as any[],
}));
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
    printSettingsService: { get: async () => ({ ok: true, data: { gs1Gtin: 'G1', slideLabelLayout: { faceWidthMm: 20, faceHeightMm: 8 }, defaultPrintBehavior: 'on_demand' } }) },
    scanStationService: { getById: async () => ({ ok: true, data: { supportsPrinting: true, cassetteSlidePrinterProfileId: 'p1' } }) },
    stainTypeService: { getAll: async () => ({ ok: true, data: [] }) },
  };
});

import { useMicrotomyWorkstation } from './useMicrotomyWorkstation';
import { MICROTOMY_UNDO_WINDOW_MS } from '@/utils/microtomyOperations';

const exhaustedBlock = { reason: 'Block exhausted', status: 'pending_pathologist_review', flaggedBy: 'u9', flaggedByName: 'X', flaggedAt: 'T' };
const makeCase = (version = 1, over: { blockStains?: any[]; decantStains?: any[]; blockStatus?: string } = {}) => ({
  id: 'c1', version, accession: { fullAccession: 'S26-0001' }, patient: {}, order: { facilityId: 'f1', assignedTo: 'path-1' },
  specimens: [{
    id: 'sp1', label: 'A',
    blocks: [{ id: 'b1', label: '1', status: over.blockStatus ?? 'Embedded', stains: over.blockStains ?? [
      { id: 's1', stainName: 'H&E', status: 'Pending Cut', printStatus: 'Pending', displayId: 'S26-0001-A1-L1' },
      { id: 's2', stainName: 'PAS', status: 'Pending Cut', printStatus: 'Printed', displayId: 'S26-0001-A1-L2' },
    ] }],
    decants: [{ id: 'd1', label: 'D1', totalVolumeMl: 30, yieldPelletSize: 'High', stains: over.decantStains ?? [
      { id: 'ds1', stainName: 'Pap', status: 'Pending Cut', printStatus: 'Printed', displayId: 'S26-0001-AD1-L1' },
    ] }],
  }],
});

async function open(kind: 'block' | 'decant', initial: any = makeCase()) {
  h.store.current = initial;
  h.getCase.mockImplementation(async () => h.store.current);
  h.resolve.mockResolvedValue({ caseData: initial, specimenLetter: 'A', target: kind === 'block' ? { level: 'block', blockNumber: '1' } : { level: 'decant', decantLabel: 'D1' } });
  const hook = renderHook(() => useMicrotomyWorkstation());
  await act(async () => { await hook.result.current.resolveScan('X'); });
  return hook;
}
const blockStains = (hook: any) => hook.result.current.workItem.block.stains;
const decantStains = (hook: any) => hook.result.current.workItem.decant.stains;

beforeEach(() => {
  h.updateCase.mockReset().mockImplementation(async (_id: string, u: any) => { h.store.current = { ...h.store.current, ...u, version: h.store.current.version + 1 }; });
  h.decantSave.mockReset().mockImplementation(async (_id: string, _c: unknown, v: number) => ({ ok: true, version: v + 1, change: {}, event: {} }));
  h.print.mockReset().mockResolvedValue({ ok: true });
  h.sendEmail.mockReset().mockResolvedValue(true);
  h.enforce.mockReset().mockResolvedValue({ allowed: true });
  h.users = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('ws-2: a decant slide takes a comment and a Reprint', () => {
  it('saves a comment on a decant slide through the decant save', async () => {
    const hook = await open('decant');
    await act(async () => { await hook.result.current.handleAddStainComment('ds1', 'thin smear', true); });
    expect(h.decantSave).toHaveBeenCalledTimes(1);
    expect(decantStains(hook)[0].comments[0]).toMatchObject({ text: 'thin smear', authorId: 'u-1' });
    expect(decantStains(hook)[0].commentPrintsOnLabel).toBe(true);
  });

  it('a Reprint of a decant slide records the reason and prints a duplicate label', async () => {
    const hook = await open('decant');
    await act(async () => { await hook.result.current.handleReprint('ds1', 'Jam'); });
    expect(h.print).toHaveBeenCalledTimes(1);
    expect(decantStains(hook)[0]).toMatchObject({ lastReprintReason: 'Jam', reprintCount: 1, printStatus: 'Printed' });
    expect(hook.result.current.printNotice).toBeNull();
  });
});

describe('ws-4: Print/Etch Next says why it did not print', () => {
  it('a block flagged as exhausted shows the refusal on screen', async () => {
    const hook = await open('block', makeCase(1, { blockStains: [{ id: 's1', stainName: 'H&E', status: 'Pending Cut', printStatus: 'Pending', exception: exhaustedBlock }], blockStatus: 'Exhausted' }));
    await act(async () => { await hook.result.current.handlePrintNext(); });
    expect(h.print).not.toHaveBeenCalled();
    expect(hook.result.current.printNotice).toBe('microtomyWorkstation.exhausted.cuttingBlocked');
  });

  it('a printer failure shows its message, and the next successful print clears it', async () => {
    const hook = await open('block');
    h.print.mockResolvedValueOnce({ ok: false, message: 'Printer offline' });
    await act(async () => { await hook.result.current.handlePrintNext(); });
    expect(hook.result.current.printNotice).toBe('Printer offline');
    expect(blockStains(hook)[0].printStatus).toBe('Failed');
    await act(async () => { await hook.result.current.handlePrintNext(); });
    expect(hook.result.current.printNotice).toBeNull();
    expect(blockStains(hook)[0].printStatus).toBe('Printed');
  });

  it('scanning the next block clears the notice', async () => {
    const hook = await open('block', makeCase(1, { blockStains: [{ id: 's1', stainName: 'H&E', status: 'Pending Cut', printStatus: 'Pending', exception: exhaustedBlock }], blockStatus: 'Exhausted' }));
    await act(async () => { await hook.result.current.handlePrintNext(); });
    expect(hook.result.current.printNotice).not.toBeNull();
    act(() => hook.result.current.clearWorkItem());
    expect(hook.result.current.printNotice).toBeNull();
  });
});

describe('ws-5: Accept suggestion twice', () => {
  const high = [{ preparationMethod: 'ThinPrep/Liquid-Based' as const, count: 2 }, { preparationMethod: 'Cell Block' as const, count: 1 }];
  it('the second press adds no slides and saves nothing', async () => {
    const hook = await open('decant');
    await act(async () => { await hook.result.current.handleApplyPrepSuggestions(high); });
    expect(decantStains(hook)).toHaveLength(4);
    expect(h.decantSave).toHaveBeenCalledTimes(1);
    await act(async () => { await hook.result.current.handleApplyPrepSuggestions(high); });
    expect(decantStains(hook)).toHaveLength(4);
    expect(h.decantSave).toHaveBeenCalledTimes(1);
  });
});

describe('ws-6: Remove and Reprint have a quick Undo instead of a confirmation', () => {
  it('Remove of an unprinted slide acts at once, offers Undo, and Undo puts it back', async () => {
    const hook = await open('block');
    await act(async () => { hook.result.current.requestRemoveStain('s1'); });
    await vi.waitFor(() => expect(blockStains(hook).map((s: any) => s.id)).toEqual(['s2']));
    expect(hook.result.current.undoNotice).toMatchObject({ kind: 'removed', stainName: 'H&E' });
    await act(async () => { await hook.result.current.undoLast(); });
    expect(blockStains(hook).map((s: any) => s.id)).toEqual(['s1', 's2']);
    expect(hook.result.current.undoNotice).toMatchObject({ kind: 'removedUndone' });
    expect(h.store.current.specimens[0].blocks[0].stains.map((s: any) => s.id)).toEqual(['s1', 's2']);
  });

  it('removing a printed slide with a reason can be undone', async () => {
    const hook = await open('block');
    await act(async () => { hook.result.current.requestRemoveStain('s2'); });
    expect(hook.result.current.pendingRemoval).not.toBeNull();
    await act(async () => { await hook.result.current.confirmPendingRemoval('Damaged Section'); });
    expect(blockStains(hook)[1].printStatus).toBe('Canceled');
    expect(hook.result.current.undoNotice).toMatchObject({ kind: 'removed', reason: 'Damaged Section' });
    await act(async () => { await hook.result.current.undoLast(); });
    expect(blockStains(hook)[1]).toMatchObject({ printStatus: 'Printed', status: 'Pending Cut' });
  });

  it('a Reprint offers Undo, and Undo puts the slide record back', async () => {
    const hook = await open('block');
    await act(async () => { await hook.result.current.handleReprint('s2', 'Misprint'); });
    expect(blockStains(hook)[1].reprintCount).toBe(1);
    expect(hook.result.current.undoNotice).toMatchObject({ kind: 'reprinted', reason: 'Misprint' });
    await act(async () => { await hook.result.current.undoLast(); });
    expect(blockStains(hook)[1].reprintCount).toBeUndefined();
    expect(blockStains(hook)[1].printStatus).toBe('Printed');
    expect(hook.result.current.undoNotice).toMatchObject({ kind: 'reprintedUndone' });
  });

  it('the Undo toast goes away after the window and Undo is then no longer possible', async () => {
    vi.useFakeTimers();
    const hook = await open('block');
    await act(async () => { hook.result.current.requestRemoveStain('s1'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(hook.result.current.undoNotice).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(MICROTOMY_UNDO_WINDOW_MS + 10); });
    expect(hook.result.current.undoNotice).toBeNull();
    await act(async () => { await hook.result.current.undoLast(); });
    expect(blockStains(hook).map((s: any) => s.id)).toEqual(['s2']);
  });

  it('a new Remove replaces the earlier Undo, and scanning on forgets it', async () => {
    const hook = await open('block');
    await act(async () => { hook.result.current.requestRemoveStain('s1'); });
    await vi.waitFor(() => expect(hook.result.current.undoNotice?.stainName).toBe('H&E'));
    act(() => hook.result.current.clearWorkItem());
    expect(hook.result.current.undoNotice).toBeNull();
  });
});

describe('ws-19 / ws-3: Block exhausted', () => {
  it('is refused without add-on:exception:flag, and nothing is saved or sent', async () => {
    h.enforce.mockResolvedValue({ allowed: false });
    const hook = await open('block');
    let r: any;
    await act(async () => { r = await hook.result.current.handleFlagBlockExhausted('nothing left'); });
    expect(r).toMatchObject({ ok: false, notPermitted: true });
    expect(h.enforce).toHaveBeenCalledWith('add-on:exception:flag', { caseId: 'c1' });
    expect(h.updateCase).not.toHaveBeenCalled();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('with no ordering pathologist on the slide, the notice goes to the Supervisor / Accessioning Desk', async () => {
    h.users = [
      { id: 'ld', status: 'Active', roles: ['lab-director'], email: 'director@lab.org', firstName: 'Dee', lastName: 'Rector' },
      { id: 'ac', status: 'Active', roles: ['accessioner'], email: 'desk@lab.org', firstName: 'Ann', lastName: 'Desk', facilityIds: ['f1'] },
      { id: 'ot', status: 'Active', roles: ['accessioner'], email: 'other-site@lab.org', firstName: 'Oz', lastName: 'Site', facilityIds: ['f2'] },
      { id: 'path-1', status: 'Active', roles: ['pathologist'], email: 'path@lab.org', firstName: 'Pat', lastName: 'Ho' },
    ];
    const hook = await open('block');
    let r: any;
    await act(async () => { r = await hook.result.current.handleFlagBlockExhausted('nothing left'); });
    expect(r).toMatchObject({ ok: true, noticeToDesk: true });
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    const mail = h.sendEmail.mock.calls[0][0];
    expect(mail.to).toEqual(['desk@lab.org', 'director@lab.org']);
    expect(mail.bodyText).toContain('No ordering pathologist is recorded');
    expect(mail.bodyText).toContain('Pat Ho');
    expect(mail.metadata).toMatchObject({ routedTo: 'supervisor-desk' });
  });

  it('with an ordering pathologist, the notice goes to them and not to the desk', async () => {
    h.users = [
      { id: 'p9', status: 'Active', roles: ['pathologist'], email: 'orderer@lab.org', firstName: 'Or', lastName: 'Derer' },
      { id: 'ld', status: 'Active', roles: ['lab-director'], email: 'director@lab.org', firstName: 'Dee', lastName: 'Rector' },
    ];
    const hook = await open('block', makeCase(1, { blockStains: [{ id: 's1', stainName: 'IHC', status: 'Pending Cut', printStatus: 'Pending', orderedByPathologistId: 'p9' }] }));
    let r: any;
    await act(async () => { r = await hook.result.current.handleFlagBlockExhausted('nothing left'); });
    expect(r).toMatchObject({ ok: true });
    expect(r.noticeToDesk).toBeUndefined();
    expect(h.sendEmail.mock.calls[0][0].to).toEqual(['orderer@lab.org']);
  });

  it('says so when nobody at all can be told', async () => {
    const hook = await open('block');
    let r: any;
    await act(async () => { r = await hook.result.current.handleFlagBlockExhausted('nothing left'); });
    expect(r).toMatchObject({ ok: true, noticeNotSent: true });
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});
