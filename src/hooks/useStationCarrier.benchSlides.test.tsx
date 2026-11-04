// @vitest-environment happy-dom
// Batch 758 (Pete: Scan-First or Scan-Last at the Microtome): a confirmed slide with no staining rack open waits on
// this station's bench; scanning a rack fills it with the bench's slides and seals it; another station's bench is
// never swept; while slides are on the bench, sign-out asks first.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { Batch } from '@/services/batches/IBatchService';
import { benchSlideBuffer } from '@/services/batches/benchSlideBuffer';
import { leaveWarnings } from '@/utils/leaveGuards';

const h = vi.hoisted(() => ({
  svc: {
    getAll: vi.fn(), getByMasterBarcode: vi.fn(), recordCarrierScan: vi.fn(), advanceToNode: vi.fn(), startReconciliation: vi.fn(),
    scanItemOut: vi.fn(), completeReconciliation: vi.fn(), sealManifest: vi.fn(), addItemByScan: vi.fn(), getById: vi.fn(),
  },
}));
vi.mock('@/services', () => ({
  batchService: h.svc,
  printSettingsService: { get: async () => ({ ok: true, data: { disposableBarcodePrefix: 'CONT', rackBarcodePrefix: 'RACK' } }) },
  scanStationService: {
    getAll: async () => ({ ok: true, data: [{ id: 'station-mic-1', facilityId: 'f1' }] }),
    getById: async (id: string) => ({ ok: true, data: { id, name: 'Microtome 1', workflowStage: 'Microtomy', facilityId: 'f1' } }),
  },
  stationScanEventService: { recordMany: vi.fn(async () => ({ ok: true, data: [] })) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Tech A' } }) }));
vi.mock('@/hooks/useEffectiveScanStation', () => ({ useEffectiveScanStation: () => ({ effectiveStationId: 'station-mic-1' }) }));
vi.mock('@/utils/playScanBeep', () => ({ playScanBeep: vi.fn(), playScanErrorTone: vi.fn() }));
vi.mock('@/utils/resolveMaterialFromScan', () => ({
  resolveMaterialFromScan: async (raw: string) => (/^S26-/.test(raw) ? { fullAccession: 'S26-4403', target: { level: /-L\d+$/.test(raw) ? 'slide' : 'block' }, displayId: raw } : null),
}));

import { useStationCarrier } from './useStationCarrier';

const rack = (items: string[] = [], over: Partial<Batch> = {}): Batch => ({
  id: 'r1', masterBarcode: 'RACK-STN-1', processingNode: 'Staining', protocol: 'p', priority: 'Routine', status: 'active',
  items: items.map(d => ({ id: `i-${d}`, materialType: 'slide' as const, displayId: d, caseAccession: 'S26-4403', addedAt: 'x', addedByUserId: 'u', addedByUserName: 'n' })),
  unexpectedScans: [], createdAt: '2026-11-01T01:00:00Z', createdByUserId: 'u', createdByUserName: 'n', ...over,
});
const confirms = (slide: string) => vi.fn(async () => ({ ok: true, labelConfirmed: slide }));

beforeEach(() => {
  localStorage.clear();
  for (const f of Object.values(h.svc)) f.mockReset();
  h.svc.getAll.mockResolvedValue({ ok: true, data: [] });
  let inRack: string[] = [];
  h.svc.addItemByScan.mockImplementation(async (_id: string, scanned: string) => { inRack = [...inRack, scanned]; return { outcome: 'added', batch: rack(inRack), item: {} }; });
  h.svc.sealManifest.mockImplementation(async () => ({ ok: true, data: rack(inRack, { sealedAt: '2026-11-01T02:00:00Z' }) }));
});

async function mount() {
  const r = renderHook(() => useStationCarrier('microtomy'));
  await waitFor(() => expect(r.result.current.station?.id).toBe('station-mic-1'));
  return r;
}

describe('useStationCarrier: the Microtome bench (Batch 758)', () => {
  it('Scan-Last: confirmed slides wait on the bench, then the rack scanned takes them all and is sealed', async () => {
    benchSlideBuffer.add('station-mic-2', { slideId: 'S26-9999-A1-L1', confirmedAt: 'x', userId: 'u2' });
    const { result } = await mount();
    await act(() => result.current.route('S26-4403-A1-L1', confirms('S26-4403-A1-L1')));
    await act(() => result.current.route('S26-4403-A1-L2', confirms('S26-4403-A1-L2')));
    expect(result.current.benchCount).toBe(2);
    expect(result.current.notice).toMatchObject({ key: 'stationCarrier.bench.slideOnBench', values: { item: 'S26-4403-A1-L2', count: 2 } });
    expect(leaveWarnings()).toHaveLength(1);

    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: rack() });
    await act(() => result.current.route('RACK-STN-1', vi.fn()));
    expect(h.svc.addItemByScan.mock.calls.map(c => c[1])).toEqual(['S26-4403-A1-L1', 'S26-4403-A1-L2']);
    expect(h.svc.sealManifest).toHaveBeenCalledWith('r1', 'u1', 'Tech A');
    expect(result.current.benchCount).toBe(0);
    expect(result.current.notice).toMatchObject({ key: 'stationCarrier.notice.outputClosed', values: { barcode: 'RACK-STN-1', count: 2 } });
    expect(result.current.output).toBeNull();
    expect(leaveWarnings()).toHaveLength(0);
    // Another station's bench is never swept.
    expect(benchSlideBuffer.list('station-mic-2').map(s => s.slideId)).toEqual(['S26-9999-A1-L1']);
  });

  it('Scan-First: with no slides on the bench the rack becomes the output tray, and each confirmed slide goes into it', async () => {
    const { result } = await mount();
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: rack() });
    await act(() => result.current.route('RACK-STN-1', vi.fn()));
    expect(result.current.notice?.key).toBe('stationCarrier.notice.outputSet');
    h.svc.getAll.mockResolvedValue({ ok: true, data: [rack()] });
    await act(async () => { await result.current.refresh(); });
    await act(() => result.current.route('S26-4403-A1-L1', confirms('S26-4403-A1-L1')));
    expect(h.svc.addItemByScan).toHaveBeenCalledWith('r1', 'S26-4403-A1-L1', 'u1', 'Tech A', undefined, 'station-mic-1');
    expect(result.current.benchCount).toBe(0);
    expect(h.svc.sealManifest).not.toHaveBeenCalled();
  });

  it('a slide the rack refuses stays on the bench, and the screen says so', async () => {
    const { result } = await mount();
    await act(() => result.current.route('S26-4403-A1-L1', confirms('S26-4403-A1-L1')));
    h.svc.addItemByScan.mockResolvedValueOnce({ outcome: 'slide-too-large', reason: 'x', displayId: 'S26-4403-A1-L1' });
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: rack() });
    await act(() => result.current.route('RACK-STN-1', vi.fn()));
    expect(h.svc.sealManifest).not.toHaveBeenCalled();
    expect(result.current.benchCount).toBe(1);
    expect(result.current.notice).toMatchObject({ key: 'stationCarrier.bench.noneAdded', tone: 'error' });
  });

  it('a label scan that confirms nothing is not put on the bench', async () => {
    const { result } = await mount();
    await act(() => result.current.route('S26-4403-A1-L1', vi.fn(async () => ({ ok: false, message: 'x' }))));
    expect(result.current.benchCount).toBe(0);
  });
});
