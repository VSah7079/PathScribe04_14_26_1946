// src/services/molecular/dispatchMolecularWorklist.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Batch 405: the batch service now reads the authorization service (supersede permission).
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: async () => ({ allowed: true }) } }));
import { dispatchMolecularWorklist } from './dispatchMolecularWorklist';
import type { MolecularBatch } from './IMolecularBatchService';
import type { SessionUser } from '../auth/caseAccessControl';

const SEEDED_BATCH_UUID = 'e3b0c442-98fc-4c14-963b-944882006122'; // the real, seeded batch from mockMolecularBatchService.ts

function makeBatch(overrides: Partial<MolecularBatch> = {}): MolecularBatch {
  return {
    id: 'mb-001', batchBarcode: 'BATCH-20260906-0042', batchUuid: SEEDED_BATCH_UUID,
    assayCode: 'HPV_HR_PCR', assayName: 'High-Risk HPV Real-Time PCR', targetInstrumentId: 'PANTHER_02',
    deckSlot: 'SLOT_A1', plateUuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', plateBarcode: 'PLT-HPV-20260906-012',
    plateLayout: '96_well', reagentLots: [], wells: [], status: 'active', createdAt: '2026-09-06T16:47:35.000Z',
    createdByUserId: 'u1', createdByUserName: 'Test User',
    ...overrides,
  };
}

const NO_SESSION: SessionUser | null = null;

import { setMockInterfaceEngineSettings, getMockInterfaceEngineSettings } from '../mockInterfaceEngine/mockInterfaceEngineSettings';
import { setDataMayPersistInBrowserForTests } from '../browserData/browserDataPolicy';
import { listSimulatedEngineMessages, resetSimulatedEngineForTests } from '../mockInterfaceEngine/simulatedEngineReceiver';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  // Batch 669 (mol-7): the tests below that check the HTTP call run with the simulated engine switched off (an engine or API server configured).
  setDataMayPersistInBrowserForTests(true);
  resetSimulatedEngineForTests();
  setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), enabled: false, simulatedEngine: false, mode: 'always_succeed' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dispatchMolecularWorklist — real, per §3.4 scan-gated dispatch, now a real HTTP client (PS-239)', () => {
  it('real, a correctly-scanned plate and deck location, with a real, successful backend response, correctly dispatches', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const batch = makeBatch();
    const result = await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION);
    expect(result.dispatched).toBe(true);
    if (result.dispatched) expect(result.payload.event_type).toBe('MOLECULAR_WORKLIST_CREATE');
  });

  it('real, posts to PathScribe\'s own real backend endpoint, not directly to any external interface engine', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const batch = makeBatch();
    await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/events/molecular-worklist', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('real, the real, correct worklist payload is included in the real request body sent to the backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const batch = makeBatch();
    await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION);
    const call = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(call[1].body);
    expect(sentBody.event_type).toBe('MOLECULAR_WORKLIST_CREATE');
    expect(sentBody.batch_info.batch_id).toBe('BATCH-20260906-0042');
  });

  it('a real, mismatched plate scan correctly refuses to dispatch anything — never even attempts the real network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const batch = makeBatch();
    const result = await dispatchMolecularWorklist(batch, 'PLT-WRONG-00000000-999', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION);
    expect(result.dispatched).toBe(false);
    if ('reason' in result) expect(result.reason).toContain('plate barcode');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a real, missing deck location scan correctly refuses to dispatch anything', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const batch = makeBatch();
    const result = await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', undefined, NO_SESSION);
    expect(result.dispatched).toBe(false);
    if ('reason' in result) expect(result.reason).toContain('deck location');
  });

  it('real, a genuine network-level failure (host unreachable) is an honest, specific error — never silently treated as success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));
    const batch = makeBatch();
    const result = await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION);
    expect(result.dispatched).toBe(false);
    if ('reason' in result) expect(result.reason).toContain('Could not reach');
  });

  it('real, a real, non-2xx response from the backend is an honest, specific error — never silently treated as success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const batch = makeBatch();
    const result = await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION);
    expect(result.dispatched).toBe(false);
    if ('reason' in result) expect(result.reason).toContain('500');
  });

  it('real, a successful dispatch correctly updates the real batch\'s own worklistDispatchedAt timestamp', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const batch = makeBatch();
    await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION);
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const updated = await mockMolecularBatchService.getById('mb-001');
    if (updated.ok) expect(updated.data.worklistDispatchedAt).toBeDefined();
  });

  it('Batch 356 (PS-326): refuses when this workstation is not the instrument\'s scan station, and says which check failed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const batch = makeBatch();
    // PANTHER_02 sits at station-molecular-1 in the seeded instrument list.
    const wrong = await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION, 'station-gross-1');
    expect(wrong.dispatched).toBe(false);
    expect('verificationFailures' in wrong && wrong.verificationFailures).toEqual(['station']);
    expect(fetchMock).not.toHaveBeenCalled();
    const right = await dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION, 'station-molecular-1');
    expect(right.dispatched).toBe(true);
  });
});

describe('Batch 669 (mol-6, mol-7): Active is not seed-only, and the demo dispatch uses the simulated engine', () => {
  const dispatch = (batch = makeBatch()) => dispatchMolecularWorklist(batch, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', NO_SESSION);
  const useSimulatedEngine = (mode: 'always_succeed' | 'always_fail' | 'timeout' = 'always_succeed') =>
    setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), enabled: false, simulatedEngine: true, mode, failureStatus: 503 });

  it('(mol-6) a dispatched Draft batch becomes Active (the Workcenter\'s Active tab), not only the seeded ones', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    // The demo baseline's draft EGFR plate, with a deck slot so the scan check can pass.
    const draft = makeBatch({ status: 'draft', batchUuid: '4f6b2c1e-8a3d-4e57-9b02-467000000001', id: 'mb-demo-467-egfr' });
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const before = await mockMolecularBatchService.getById('mb-demo-467-egfr');
    expect(before.ok && before.data.status).toBe('draft');
    const r = await dispatch(draft);
    expect(r.dispatched).toBe(true);
    const after = await mockMolecularBatchService.getById('mb-demo-467-egfr');
    expect(after.ok && after.data.status).toBe('active');
    expect(after.ok && after.data.worklistDispatchedAt).toBeTruthy();
  });

  it('(mol-6) the seeded Active batch keeps its status when dispatched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    await dispatch();
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const after = await mockMolecularBatchService.getById('mb-001');
    expect(after.ok && after.data.status).toBe('active');
  });

  it('(mol-7) in the demo the worklist goes to the simulated engine receiver, not to the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    useSimulatedEngine();
    const r = await dispatch();
    expect(r.dispatched).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(listSimulatedEngineMessages()[0]).toMatchObject({ transactionType: 'MOLECULAR_WORKLIST', outcome: 'accepted' });
    expect(JSON.parse(listSimulatedEngineMessages()[0].envelopeJson).payload.event_type).toBe('MOLECULAR_WORKLIST_CREATE');
  });

  it('(mol-7) a refusal by the simulated engine is a coded failure (rejected, with its HTTP status), and nothing is marked dispatched', async () => {
    useSimulatedEngine('always_fail');
    const r = await dispatch();
    expect(r.dispatched).toBe(false);
    expect('failure' in r && r.failure).toMatchObject({ code: 'rejected', status: 503 });
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const after = await mockMolecularBatchService.getById('mb-001');
    expect(after.ok && after.data.worklistDispatchedAt).toBeUndefined();
  });

  it('(mol-7) a simulated time-out is a coded timeout; the HTTP path keeps its codes too', async () => {
    useSimulatedEngine('timeout');
    const timeout = await dispatch();
    expect('failure' in timeout && timeout.failure).toMatchObject({ code: 'timeout' });
    useSimulatedEngine('always_succeed');
    setMockInterfaceEngineSettings({ ...getMockInterfaceEngineSettings(), simulatedEngine: false });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));
    expect('failure' in (await dispatch()) && ((await dispatch()) as { failure?: unknown }).failure).toMatchObject({ code: 'unreachable' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const rejected = await dispatch();
    expect('failure' in rejected && rejected.failure).toMatchObject({ code: 'rejected', status: 500 });
  });
});
