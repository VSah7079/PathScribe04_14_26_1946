// @vitest-environment happy-dom
// Batch 669 (ws-8, ws-10, ws-11): the Embedding station saves through the shared retrying save, says "Not saved" and
// reloads when it fails, stops Confirm while a discrepancy is flagged, clears it with an audit entry, shows the
// flagger's name, and says on screen whether the Tissue Discrepancy item was raised.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }), initReactI18next: { type: '3rdParty', init: () => {} } }));
vi.mock('@/utils/labels/printCassetteSlideLabel', () => ({ printCassetteLabel: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-9', name: 'Lee Tran' } }) }));
vi.mock('@/hooks/useEffectiveScanStation', () => ({ useEffectiveScanStation: () => ({ effectiveStationId: null }) }));
vi.mock('@/hooks/useFieldRequirements', () => ({ useFieldRequirements: () => [] }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: {} }));
const h = vi.hoisted(() => ({
  store: { current: null as any },
  getCase: vi.fn(), updateCase: vi.fn(), raise: vi.fn(), logEvent: vi.fn(), getUser: vi.fn(), resolve: vi.fn(),
}));
vi.mock('@/utils/resolveMaterialFromScan', () => ({ resolveMaterialFromScan: (...a: unknown[]) => h.resolve(...a) }));
vi.mock('@/services', () => ({
  caseWriteDeps: { getCase: (...a: unknown[]) => h.getCase(...a), updateCase: (...a: unknown[]) => h.updateCase(...a) },
  printerProfileService: {}, printSettingsService: {}, scanStationService: {},
  specimenDeficiencyService: { raise: (...a: unknown[]) => h.raise(...a) },
  specimenDictionaryService: { getAll: async () => ({ ok: true, data: [] }) },
  userService: { getById: (...a: unknown[]) => h.getUser(...a) },
  auditService: { logEvent: (...a: unknown[]) => h.logEvent(...a) },
  embeddingCommentMissing: () => [], embeddingConfirmMissing: () => [], embeddingReprintMissing: () => [],
  parseObservedPieceCount: (v: string | number) => (v === '' ? null : Number(v)),
}));

import { useEmbeddingStation } from './useEmbeddingStation';

const makeCase = (version: number, block: Record<string, unknown> = {}) => ({
  id: 'c1', version, accession: { fullAccession: 'S26-0001' }, patient: {},
  specimens: [{ id: 'sp1', label: 'A', blocks: [{ id: 'b1', label: '1', status: 'Grossed', pieceCount: 3, stains: [], ...block }] }],
});
const target = { level: 'block', blockNumber: '1' };

async function open(initial = makeCase(1)) {
  h.store.current = initial;
  h.getCase.mockImplementation(async () => h.store.current);
  h.resolve.mockResolvedValue({ caseData: initial, specimenLetter: 'A', target });
  const hook = renderHook(() => useEmbeddingStation());
  await act(async () => { await hook.result.current.resolveScan('X'); });
  return hook;
}

beforeEach(() => {
  h.updateCase.mockReset().mockImplementation(async (_id: string, u: any) => { h.store.current = { ...h.store.current, specimens: u.specimens, version: h.store.current.version + 1 }; });
  h.raise.mockReset().mockResolvedValue({ ok: true });
  h.logEvent.mockReset().mockResolvedValue({ ok: true });
  h.getUser.mockReset().mockResolvedValue({ ok: true, data: { firstName: 'Ana', lastName: 'Silva' } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('useEmbeddingStation — saving (ws-8)', () => {
  it('a failed save says "Not saved" and reloads the stored block instead of showing the change as saved', async () => {
    const hook = await open();
    h.updateCase.mockRejectedValue(new Error('down'));
    await act(async () => { await hook.result.current.handleSetMoldAndOrientation({ moldSize: '15x15mm' }); });
    expect(hook.result.current.saveError).toBe('workstationSave.notApplied');
    expect(hook.result.current.workItem!.block.moldSize).toBeUndefined();
  });

  it('a successful save shows the stored block and clears an earlier "Not saved"', async () => {
    const hook = await open();
    h.updateCase.mockRejectedValueOnce(new Error('down'));
    await act(async () => { await hook.result.current.handleSetMoldAndOrientation({ moldSize: '15x15mm' }); });
    expect(hook.result.current.saveError).not.toBeNull();
    await act(async () => { await hook.result.current.handleSetMoldAndOrientation({ moldSize: '15x15mm' }); });
    expect(hook.result.current.saveError).toBeNull();
    expect(hook.result.current.workItem!.block.moldSize).toBe('15x15mm');
  });

  it('a count mismatch that was not saved does not seal the block or raise a Tissue Discrepancy', async () => {
    const hook = await open();
    h.updateCase.mockRejectedValue(new Error('down'));
    let r: any;
    await act(async () => { r = await hook.result.current.handleConfirmPieceCount('2'); });
    expect(r.ok).toBe(false);
    expect(h.raise).not.toHaveBeenCalled();
    expect(hook.result.current.workItem!.block.status).toBe('Grossed');
  });

  it('a discrepancy flag that was not saved raises nothing', async () => {
    const hook = await open();
    h.updateCase.mockRejectedValue(new Error('down'));
    await act(async () => { await hook.result.current.handleFlagDiscrepancy('Extra Tissue Found'); });
    expect(h.raise).not.toHaveBeenCalled();
    expect(hook.result.current.workItem!.block.lastDiscrepancyReason).toBeUndefined();
  });
});

describe('useEmbeddingStation — discrepancy (ws-10, ws-11)', () => {
  it('a flagged discrepancy stops Confirm until it is cleared', async () => {
    const hook = await open();
    await act(async () => { await hook.result.current.handleFlagDiscrepancy('Extra Tissue Found'); });
    expect(hook.result.current.workItem!.block.lastDiscrepancyReason).toBe('Extra Tissue Found');
    let r: any;
    await act(async () => { r = await hook.result.current.handleConfirmPieceCount('3'); });
    expect(r).toEqual({ ok: false, message: { key: 'embeddingStation.discrepancy.confirmBlocked' } });
    expect(hook.result.current.workItem!.block.status).toBe('Grossed');
    await act(async () => { await hook.result.current.handleClearDiscrepancy(); });
    await act(async () => { r = await hook.result.current.handleConfirmPieceCount('3'); });
    expect(r.ok).toBe(true);
    expect(hook.result.current.workItem!.block.status).toBe('Embedded');
  });

  it('clearing writes one audit entry and needs no other step', async () => {
    const hook = await open(makeCase(1, { lastDiscrepancyReason: 'Extra Tissue Found', lastDiscrepancyReportedBy: 'u-17' }));
    await act(async () => { await hook.result.current.handleClearDiscrepancy(); });
    expect(hook.result.current.workItem!.block.lastDiscrepancyReason).toBeUndefined();
    expect(h.logEvent).toHaveBeenCalledTimes(1);
    const entry = h.logEvent.mock.calls[0][0];
    expect(entry.event).toBe('Embedding discrepancy cleared');
    expect(entry.detail).toContain('raised by u-17');
    expect(entry.detail).toContain('cleared by u-9');
  });

  it('a clear that was not saved writes no audit entry and leaves the flag showing', async () => {
    const hook = await open(makeCase(1, { lastDiscrepancyReason: 'Extra Tissue Found', lastDiscrepancyReportedBy: 'u-17' }));
    h.updateCase.mockRejectedValue(new Error('down'));
    await act(async () => { await hook.result.current.handleClearDiscrepancy(); });
    expect(h.logEvent).not.toHaveBeenCalled();
    expect(hook.result.current.workItem!.block.lastDiscrepancyReason).toBe('Extra Tissue Found');
  });

  it('looks up the flagger\'s name from the stored user id', async () => {
    const hook = await open(makeCase(1, { lastDiscrepancyReason: 'Extra Tissue Found', lastDiscrepancyReportedBy: 'u-17' }));
    await waitFor(() => expect(hook.result.current.flaggerName).toBe('Ana Silva'));
    expect(h.getUser).toHaveBeenCalledWith('u-17');
  });

  it('says on screen that the Tissue Discrepancy item was raised', async () => {
    const hook = await open();
    await act(async () => { await hook.result.current.handleFlagDiscrepancy('Extra Tissue Found'); });
    expect(h.raise).toHaveBeenCalledTimes(1);
    expect(hook.result.current.discrepancyNotice).toMatchObject({ kind: 'raised', key: 'embeddingStation.discrepancy.raised' });
  });

  it('says on screen when the Tissue Discrepancy item could not be raised, whether it throws or answers not ok', async () => {
    const hook = await open();
    h.raise.mockRejectedValueOnce(new Error('down'));
    await act(async () => { await hook.result.current.handleFlagDiscrepancy('Extra Tissue Found'); });
    expect(hook.result.current.discrepancyNotice).toMatchObject({ kind: 'failed', key: 'embeddingStation.discrepancy.raiseFailed' });
    h.raise.mockResolvedValueOnce({ ok: false, error: 'x' });
    await act(async () => { await hook.result.current.handleFlagDiscrepancy('Damaged Cassette/Broken Hinge'); });
    expect(hook.result.current.discrepancyNotice).toMatchObject({ kind: 'failed' });
  });

  it('a piece-count mismatch raises the item and says so', async () => {
    const hook = await open();
    await act(async () => { await hook.result.current.handleConfirmPieceCount('2'); });
    expect(h.raise).toHaveBeenCalledTimes(1);
    expect(hook.result.current.discrepancyNotice).toMatchObject({ kind: 'raised' });
  });
});
