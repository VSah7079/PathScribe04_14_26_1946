// @vitest-environment happy-dom
// Batch 761 (Pete: a staining rack is reused run after run): at the Microtome a registered rack whose last run is closed
// starts a new run when scanned; a rack whose last run was never closed is held with a warning, and closing it (a
// supervisor override) lets the rack start a new run.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { Batch } from '@/services/batches/IBatchService';

const h = vi.hoisted(() => ({
  svc: {
    getAll: vi.fn(), getByMasterBarcode: vi.fn(), recordCarrierScan: vi.fn(), advanceToNode: vi.fn(), startReconciliation: vi.fn(),
    scanItemOut: vi.fn(), completeReconciliation: vi.fn(), sealManifest: vi.fn(), addItemByScan: vi.fn(), getById: vi.fn(),
    create: vi.fn(), overrideAndComplete: vi.fn(),
  },
  getRack: vi.fn(),
}));
vi.mock('@/services', () => ({
  batchService: h.svc,
  printSettingsService: { get: async () => ({ ok: true, data: { disposableBarcodePrefix: 'CONT', rackBarcodePrefix: 'RACK' } }) },
  scanStationService: {
    getAll: async () => ({ ok: true, data: [{ id: 'station-mic-1', facilityId: 'f1' }] }),
    getById: async (id: string) => ({ ok: true, data: { id, name: 'Microtome 1', workflowStage: 'Microtomy', facilityId: 'f1' } }),
  },
  stationScanEventService: { recordMany: vi.fn(async () => ({ ok: true, data: [] })) },
  hardwareContainerRegistryService: { getByRackId: (...a: unknown[]) => h.getRack(...a) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Tech A' } }) }));
vi.mock('@/hooks/useEffectiveScanStation', () => ({ useEffectiveScanStation: () => ({ effectiveStationId: 'station-mic-1' }) }));
vi.mock('@/utils/playScanBeep', () => ({ playScanBeep: vi.fn(), playScanErrorTone: vi.fn() }));
vi.mock('@/utils/resolveMaterialFromScan', () => ({
  resolveMaterialFromScan: async (raw: string) => (/^S26-/.test(raw) ? { fullAccession: 'S26-4403', target: { level: /-L\d+$/.test(raw) ? 'slide' : 'block' }, displayId: raw } : null),
}));

import { useStationCarrier } from './useStationCarrier';

const run = (over: Partial<Batch> = {}): Batch => ({
  id: 'r-old', masterBarcode: 'RACK-STAIN-04', processingNode: 'Staining', protocol: '', priority: 'Routine', status: 'complete',
  identifierMode: 'semi_permanent', linkedRackId: 'RACK-STAIN-04', items: [], unexpectedScans: [], createdAt: '2026-11-01T01:00:00Z',
  createdByUserId: 'u', createdByUserName: 'n', ...over,
} as Batch);
const rack = { id: 'hwc-1', rackId: 'RACK-STAIN-04', containerType: 'Staining Rack', status: 'Available', createdAt: 'x' };

beforeEach(() => {
  localStorage.clear();
  for (const f of Object.values(h.svc)) f.mockReset();
  h.getRack.mockReset();
  h.svc.getAll.mockResolvedValue({ ok: true, data: [] });
});

async function mount() {
  const r = renderHook(() => useStationCarrier('microtomy'));
  await waitFor(() => expect(r.result.current.station?.id).toBe('station-mic-1'));
  return r;
}

describe('useStationCarrier: reusable staining racks (Batch 761)', () => {
  it('a rack whose last run is closed starts a new run on scan, with no form, and becomes the output tray', async () => {
    const { result } = await mount();
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: run() });
    h.getRack.mockResolvedValueOnce({ ok: true, data: rack });
    h.svc.create.mockResolvedValueOnce({ ok: true, data: run({ id: 'r-new', status: 'active' }) });
    await act(() => result.current.route('RACK-STAIN-04', vi.fn()));
    expect(h.svc.create).toHaveBeenCalledWith(expect.objectContaining({ processingNode: 'Staining', identifierMode: 'semi_permanent', rackId: 'RACK-STAIN-04', stationId: 'station-mic-1' }));
    expect(result.current.output?.id).toBe('r-new');
    expect(result.current.notice).toMatchObject({ key: 'stationCarrier.rack.newRun', values: { barcode: 'RACK-STAIN-04' } });
  });

  it('a rack whose last run was sealed but never closed is held with a warning; closing it starts a new run', async () => {
    const { result } = await mount();
    const forgotten = run({ id: 'r-open', status: 'active', sealedAt: '2026-11-01T09:00:00Z', items: [{ id: 'i1' } as never] });
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: forgotten });
    await act(() => result.current.route('RACK-STAIN-04', vi.fn()));
    expect(result.current.pending).toMatchObject({ kind: 'rackNotClosed', batch: { id: 'r-open' } });
    expect(h.svc.create).not.toHaveBeenCalled();

    h.svc.startReconciliation.mockResolvedValueOnce({ ok: true, data: { ...forgotten, status: 'reconciling' } });
    h.svc.overrideAndComplete.mockResolvedValueOnce({ ok: true, data: { ...forgotten, status: 'complete' } });
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: { ...forgotten, status: 'complete' } });
    h.getRack.mockResolvedValueOnce({ ok: true, data: rack });
    h.svc.create.mockResolvedValueOnce({ ok: true, data: run({ id: 'r-new', status: 'active' }) });
    await act(() => result.current.closeLastRun());
    expect(h.svc.overrideAndComplete).toHaveBeenCalledWith('r-open', 'u1', 'Tech A', expect.stringContaining('never closed'), 'station-mic-1');
    expect(result.current.output?.id).toBe('r-new');
  });

  it('a refused close (no override permission) says so and starts nothing', async () => {
    const { result } = await mount();
    const forgotten = run({ id: 'r-open', status: 'reconciling' });
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: forgotten });
    await act(() => result.current.route('RACK-STAIN-04', vi.fn()));
    h.svc.overrideAndComplete.mockResolvedValueOnce({ ok: false, error: 'NOT_PERMITTED' });
    await act(() => result.current.closeLastRun());
    expect(result.current.notice?.tone).toBe('error');
    expect(h.svc.create).not.toHaveBeenCalled();
  });

  it('a rack still being loaded (open, not sealed) carries on as the output tray', async () => {
    const { result } = await mount();
    h.svc.getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: run({ id: 'r-load', status: 'active' }) });
    await act(() => result.current.route('RACK-STAIN-04', vi.fn()));
    expect(h.getRack).not.toHaveBeenCalled();
    expect(result.current.output?.id).toBe('r-load');
  });
});
