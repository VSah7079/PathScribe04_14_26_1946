// @vitest-environment happy-dom
// Batch 726 (Lab Workflow & Batch spec, Decision 1, §7.3, §7.6): carriers at a workstation — the five carrier-scan
// outcomes, the hand-off from the step before, and item scans checked against the loaded carrier.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { Batch } from '@/services/batches/IBatchService';

const h = vi.hoisted(() => ({
  stationId: null as string | null,
  batches: [] as Batch[],
  svc: {
    getAll: vi.fn(), getByMasterBarcode: vi.fn(), recordCarrierScan: vi.fn(), advanceToNode: vi.fn(), startReconciliation: vi.fn(),
    scanItemOut: vi.fn(), completeReconciliation: vi.fn(), sealManifest: vi.fn(), addItemByScan: vi.fn(), getById: vi.fn(),
  },
  record: vi.fn(async () => ({ ok: true, data: [] })),
}));
vi.mock('@/services', () => ({
  batchService: h.svc,
  printSettingsService: { get: async () => ({ ok: true, data: { disposableBarcodePrefix: 'CONT', rackBarcodePrefix: 'RACK' } }) },
  scanStationService: {
    getAll: async () => ({ ok: true, data: [{ id: 'station-embed-1', facilityId: 'f1' }] }),
    getById: async (id: string) => ({ ok: true, data: { id, name: 'Embedding 1', workflowStage: 'Embedding', facilityId: 'f1' } }),
  },
  stationScanEventService: { recordMany: h.record },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Tech A' } }) }));
vi.mock('@/hooks/useEffectiveScanStation', () => ({ useEffectiveScanStation: () => ({ effectiveStationId: h.stationId }) }));
vi.mock('@/utils/playScanBeep', () => ({ playScanBeep: vi.fn(), playScanErrorTone: vi.fn() }));
vi.mock('@/utils/resolveMaterialFromScan', () => ({
  resolveMaterialFromScan: async (raw: string) => (/^S26-/.test(raw) ? { fullAccession: raw.split('-').slice(0, 2).join('-'), target: { level: 'block' }, displayId: raw } : null),
}));

import { useStationCarrier } from './useStationCarrier';

const item = (displayId: string, matched = false) => ({ id: `i-${displayId}`, materialType: 'block' as const, displayId, caseAccession: 'S26-4403', addedAt: 'x', addedByUserId: 'u', addedByUserName: 'n', reconciliationStatus: matched ? 'matched' as const : undefined });
const carrier = (over: Partial<Batch> = {}): Batch => ({
  id: 'b1', masterBarcode: 'CONT-PRC-1', processingNode: 'Embedding', protocol: 'p', priority: 'Routine', status: 'active',
  items: [item('S26-4403-A1'), item('S26-4403-A2')], unexpectedScans: [], createdAt: '2026-10-29T01:00:00Z', createdByUserId: 'u', createdByUserName: 'n', ...over,
});

beforeEach(() => {
  h.stationId = 'station-embed-1';
  for (const f of Object.values(h.svc)) f.mockReset();
  h.record.mockClear();
  h.svc.getAll.mockImplementation(async () => ({ ok: true, data: h.batches }));
  // Batch 757: the carrier is read again before an unload.
  h.svc.getById.mockImplementation(async (id: string) => { const b = h.batches.find(x => x.id === id); return b ? { ok: true, data: b } : { ok: false, error: 'batchNotFound' }; });
});

async function mount() {
  const r = renderHook(() => useStationCarrier('embedding'));
  await waitFor(() => expect(r.result.current.station?.id ?? null).toBe(h.stationId));
  return r;
}

describe('useStationCarrier (Batch 726)', () => {
  it('unknown and closed carriers are said plainly', async () => {
    h.batches = [];
    const { result } = await mount();
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: false, error: 'batchNotFound' });
    await act(() => result.current.route('CONT-NOPE-1', vi.fn()));
    expect(result.current.notice?.key).toBe('stationCarrier.notice.unknown');
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: carrier({ status: 'complete', completedAt: '2026-10-28T10:00:00Z' }) });
    await act(() => result.current.route('CONT-PRC-1', vi.fn()));
    expect(result.current.notice).toMatchObject({ key: 'stationCarrier.notice.closedComplete', values: { at: '2026-10-28T10:00:00Z' } });
  });

  it('no station: a carrier is not opened (prompt), and an item scan opens but records nothing (§7.6)', async () => {
    h.stationId = null;
    const { result } = renderHook(() => useStationCarrier('embedding'));
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: carrier() });
    await act(() => result.current.route('CONT-PRC-1', vi.fn()));
    expect(result.current.notice?.key).toBe('stationCarrier.notice.noStation');
    expect(h.svc.recordCarrierScan).not.toHaveBeenCalled();
    const open = vi.fn();
    await act(() => result.current.route('S26-4403-A1', open));
    expect(open).toHaveBeenCalledWith('S26-4403-A1');
    expect(h.record).not.toHaveBeenCalled();
  });

  it('a carrier from the step before moves here (hand-off); one at this step opens and records the station', async () => {
    const { result } = await mount();
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: carrier({ processingNode: 'Processing' }) });
    h.svc.advanceToNode.mockResolvedValueOnce({ ok: true, data: carrier() });
    await act(() => result.current.route('CONT-PRC-1', vi.fn()));
    expect(h.svc.advanceToNode).toHaveBeenCalledWith('b1', 'Embedding', 'u1', 'Tech A', 'station-embed-1');
    expect(result.current.loaded?.id).toBe('b1');
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: carrier({ id: 'b2', masterBarcode: 'CONT-EMB-2' }) });
    h.svc.recordCarrierScan.mockResolvedValueOnce({ ok: true, data: carrier({ id: 'b2', masterBarcode: 'CONT-EMB-2', stationId: 'station-embed-1' }) });
    await act(() => result.current.route('CONT-EMB-2', vi.fn()));
    expect(h.svc.recordCarrierScan).toHaveBeenCalledWith('b2', 'station-embed-1', 'u1', 'Tech A', 'ok');
    expect(result.current.loaded?.id).toBe('b2');
  });

  it('another step\'s carrier waits for a deliberate continue, which is recorded as a mismatch', async () => {
    const { result } = await mount();
    const staining = carrier({ processingNode: 'Staining' });
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: staining });
    await act(() => result.current.route('CONT-PRC-1', vi.fn()));
    expect(result.current.pending?.kind).toBe('mismatch');
    expect(h.svc.recordCarrierScan).not.toHaveBeenCalled();
    h.svc.recordCarrierScan.mockResolvedValueOnce({ ok: true, data: staining });
    await act(() => result.current.continuePending());
    expect(h.svc.recordCarrierScan).toHaveBeenCalledWith('b1', 'station-embed-1', 'u1', 'Tech A', 'mismatch');
    expect(result.current.pending).toBeNull();
  });

  it('with a carrier loaded: an item on it is checked off and opened; an item not on it waits for a deliberate continue', async () => {
    const loaded = carrier();
    h.batches = [loaded];
    const { result } = await mount();
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: loaded });
    h.svc.recordCarrierScan.mockResolvedValueOnce({ ok: true, data: loaded });
    await act(() => result.current.route('CONT-PRC-1', vi.fn()));
    const reconciling = { ...loaded, status: 'reconciling' as const };
    h.svc.startReconciliation.mockResolvedValue({ ok: true, data: reconciling });
    h.svc.scanItemOut.mockResolvedValue({ ok: true, data: { ...reconciling, items: [item('S26-4403-A1', true), item('S26-4403-A2')] } });
    const open = vi.fn();
    await act(() => result.current.route('S26-4403-A1', open));
    expect(h.svc.startReconciliation).toHaveBeenCalledWith('b1', 'u1', 'Tech A');
    expect(h.svc.scanItemOut).toHaveBeenCalledWith('b1', 'S26-4403-A1', 'u1', 'Tech A', 'station-embed-1');
    expect(open).toHaveBeenCalledWith('S26-4403-A1');

    const openWrong = vi.fn();
    await act(() => result.current.route('S26-9999-A1', openWrong));
    expect(result.current.pending).toMatchObject({ kind: 'wrongItem', displayId: 'S26-9999-A1', carrierBarcode: 'CONT-PRC-1' });
    expect(openWrong).not.toHaveBeenCalled();
    await act(() => result.current.continuePending());
    expect(h.svc.scanItemOut).toHaveBeenLastCalledWith('b1', 'S26-9999-A1', 'u1', 'Tech A', 'station-embed-1');
    expect(openWrong).toHaveBeenCalledWith('S26-9999-A1');
  });

  it('with no carrier loaded, an item scan is recorded at the station as received, then opened', async () => {
    const { result } = await mount();
    const open = vi.fn();
    await act(() => result.current.route('S26-4403-A1', open));
    expect(h.record).toHaveBeenCalledWith([expect.objectContaining({ itemId: 'S26-4403-A1', stationId: 'station-embed-1', action: 'received', result: 'ok', node: 'Embedding' })]);
    expect(open).toHaveBeenCalledWith('S26-4403-A1');
  });
});
