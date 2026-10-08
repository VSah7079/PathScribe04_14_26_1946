// src/services/molecular/molecularDispatchPanel.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: async () => ({ allowed: true }) } }));
import { canStartMolecularDispatch, canConfirmMolecularDispatch, molecularDispatchFeedback } from './molecularDispatchPanel';
import { dispatchMolecularWorklist } from './dispatchMolecularWorklist';
import type { MolecularBatch } from './IMolecularBatchService';

function makeBatch(overrides: Partial<MolecularBatch> = {}): MolecularBatch {
  return {
    id: 'mb-001', batchBarcode: 'BATCH-20260906-0042', batchUuid: 'e3b0c442-98fc-4c14-963b-944882006122',
    assayCode: 'HPV_HR_PCR', assayName: 'High-Risk HPV Real-Time PCR', targetInstrumentId: 'PANTHER_02',
    deckSlot: 'SLOT_A1', plateUuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', plateBarcode: 'PLT-HPV-20260906-012',
    plateLayout: '96_well', reagentLots: [], wells: [], status: 'active', createdAt: '2026-09-06T16:47:35.000Z',
    createdByUserId: 'u1', createdByUserName: 'Test User',
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
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('molecularDispatchPanel (PS-236) — plate builder scan-to-verify dispatch', () => {
  it('Confirm Dispatch is enabled only after both the plate and deck location scans', () => {
    expect(canConfirmMolecularDispatch(undefined, undefined, false)).toBe(false);
    expect(canConfirmMolecularDispatch('PLT-HPV-20260906-012', undefined, false)).toBe(false);
    expect(canConfirmMolecularDispatch(undefined, 'LOC-INST-PANTHER_02-SLOT_A1', false)).toBe(false);
    expect(canConfirmMolecularDispatch('', 'LOC-INST-PANTHER_02-SLOT_A1', false)).toBe(false);
    expect(canConfirmMolecularDispatch('PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', false)).toBe(true);
  });

  it('Confirm Dispatch is disabled while a dispatch is in progress', () => {
    expect(canConfirmMolecularDispatch('PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', true)).toBe(false);
  });

  it('a mismatched scan blocks the dispatch: nothing is sent and the failed checks are reported', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const batch = makeBatch();
    // both scans present, so Confirm is enabled; the plate scan is the wrong plate
    expect(canConfirmMolecularDispatch('PLT-HPV-20260906-999', 'LOC-INST-PANTHER_02-SLOT_A1', false)).toBe(true);
    const plateMismatch = await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-999', 'LOC-INST-PANTHER_02-SLOT_A1', null);
    expect(molecularDispatchFeedback(plateMismatch)).toEqual({ success: false, verificationFailures: ['plate'] });
    const deckMismatch = await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_B9', null);
    expect(molecularDispatchFeedback(deckMismatch)).toEqual({ success: false, verificationFailures: ['deck'] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a verified dispatch reports success; a backend failure reports its reason', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const ok = await dispatchMolecularWorklist(makeBatch(), 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', null);
    expect(molecularDispatchFeedback(ok)).toEqual({ success: true });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const rejected = await dispatchMolecularWorklist(makeBatch(), 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', null);
    const feedback = molecularDispatchFeedback(rejected);
    expect(feedback).toEqual({ success: false, reason: expect.stringContaining('HTTP 503') });
  });

  it('the Dispatch Worklist action is offered only for an undispatched, non-superseded batch; a dispatched batch shows its timestamp instead', () => {
    expect(canStartMolecularDispatch(makeBatch())).toBe(true);
    expect(canStartMolecularDispatch(makeBatch({ worklistDispatchedAt: '2026-09-07T10:00:00.000Z' }))).toBe(false);
    expect(canStartMolecularDispatch(makeBatch({ status: 'superseded' }))).toBe(false);
  });
});
