// @vitest-environment happy-dom
// Batch 434: load, send and unload a WSI scan batch (permissions, the slide
// records, the interface engine).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { StainOrder } from '@/types/case/Specimen';

const h = vi.hoisted(() => ({
  allowed: { current: true },
  asked: [] as Array<[string, unknown]>,
  sendOk: { current: true },
  sent: [] as Array<[string, string, unknown]>,
  cases: {} as Record<string, any>,
  audit: [] as Array<{ event: string; detail: string }>,
  /** PS-71: runs before a save lands, so a test can slip in someone else's save. */
  beforeSave: [] as Array<(id: string) => void>,
  saves: [] as Array<[string, number | undefined]>,
}));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: vi.fn(async (capability: string, context: unknown) => {
      h.asked.push([capability, context]);
      return { capability, allowed: h.allowed.current, grantedBy: [], missingRequirements: [], context: {} };
    }),
  },
}));
vi.mock('../cases/CaseRouter', () => ({
  caseRouter: {
    getCase: vi.fn(async (id: string) => h.cases[id]),
    getAll: vi.fn(async () => ({ ok: true, data: Object.values(h.cases) })),
    // PS-71 (Batch 458): a versioned store, like mockCaseService.
    updateCase: vi.fn(async (id: string, updates: any, expectedVersion?: number) => {
      h.saves.push([id, expectedVersion]);
      h.beforeSave.splice(0).forEach(f => f(id));
      const v = h.cases[id].version ?? 0;
      if (expectedVersion !== v) {
        const { ConcurrencyConflictError } = await import('../cases/ConcurrencyConflictError');
        throw new ConcurrencyConflictError(id, expectedVersion ?? -1, v);
      }
      h.cases[id] = { ...h.cases[id], ...updates, version: v + 1 };
    }),
  },
}));
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: 'tech-1', firstName: 'Hana', lastName: 'Histo' }) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn(async (e: { event: string; detail: string }) => { h.audit.push(e); }) } }));
vi.mock('../interfaceDispatch/dispatchInterfaceMessage', () => ({
  dispatchInterfaceMessage: vi.fn(async (id: string, type: string, payload: unknown) => {
    h.sent.push([id, type, payload]);
    return h.sendOk.current ? { ok: true } : { ok: false, errorCode: 'DISPATCH_UNREACHABLE', error: 'Interface engine unreachable' };
  }),
}));

import { loadScanBatch, loadScanQueue, sendScanBatch, unloadScanBatch } from './wsiScanBatchWorkflow';
import { mockWsiScanBatchService } from './mockWsiScanBatchService';

const st = (id: string): StainOrder => ({ id, stainName: 'H&E', status: 'Complete', distributionDestination: 'digital', distributionStatus: 'In Scanning Queue', scannerAssignment: { scannerInstrumentId: 'APERIO_GT450_01' } } as unknown as StainOrder);
const stainOf = (caseId: string, id: string): StainOrder => h.cases[caseId].specimens[0].blocks[0].stains.find((s: StainOrder) => s.id === id);

describe('wsiScanBatchWorkflow', () => {
  beforeEach(() => {
    h.beforeSave.length = 0; h.saves.length = 0;
    h.allowed.current = true; h.asked.length = 0; h.sendOk.current = true; h.sent.length = 0; h.audit.length = 0;
    h.cases = { CW: { id: 'CW', accession: { fullAccession: 'S26-9001' }, specimens: [{ id: 'sp', label: 'A', blocks: [{ id: 'b', label: '1', stains: [st('s1'), st('s2')] }] }] } };
  });

  it('load needs wsi:scan-batch:load for the scanner’s lab; refused, nothing changes', async () => {
    h.allowed.current = false;
    expect(await loadScanBatch('APERIO_GT450_01', ['CW|b|s1'])).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(h.asked).toEqual([['wsi:scan-batch:load', { facilityId: 'c-ent-dvmc' }]]);
    expect(stainOf('CW', 's1').wsiScanBatchId).toBeUndefined();
  });

  it('only a slide scanner from the register', async () => {
    expect(await loadScanBatch('PANTHER_01', ['CW|b|s1'])).toEqual({ ok: false, error: 'SCANNER_NOT_FOUND' });
    expect(await loadScanBatch('NOPE', ['CW|b|s1'])).toEqual({ ok: false, error: 'SCANNER_NOT_FOUND' });
  });

  it('load → send → (scanner reports) → unload; a slide that failed QC goes back to the queue', async () => {
    expect((await loadScanQueue()).map(q => q.key)).toEqual(['CW|b|s1', 'CW|b|s2']);
    const loaded = await loadScanBatch('APERIO_GT450_01', ['CW|b|s1', 'CW|b|s2']);
    if (loaded.ok === false) throw new Error(loaded.error);
    const batch = loaded.data;
    expect(batch).toMatchObject({ status: 'loaded', scannerInstrumentId: 'APERIO_GT450_01', facilityId: 'c-ent-dvmc', loadedBy: 'tech-1' });
    expect(stainOf('CW', 's1')).toMatchObject({ distributionStatus: 'Loaded on Scanner', wsiScanBatchId: batch.id });
    expect(await loadScanQueue()).toEqual([]);

    const sent = await sendScanBatch(batch.id);
    expect(sent.ok && sent.data.status).toBe('scanning');
    expect(h.sent[0][1]).toBe('WSI_SCAN_MANIFEST');
    expect((h.sent[0][2] as { slides: unknown[] }).slides).toEqual([
      { slidePosition: '1', caseId: 'CW', specimenId: 'sp', blockId: 'b', stainId: 's1', slideLabel: 'A1 H&E' },
      { slidePosition: '2', caseId: 'CW', specimenId: 'sp', blockId: 'b', stainId: 's2', slideLabel: 'A1 H&E' },
    ]);

    expect(await unloadScanBatch(batch.id)).toEqual({ ok: false, error: 'STILL_SCANNING' });
    await mockWsiScanBatchService.updateSlideStatus(batch.id, '1', { scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-10-02T10:00:00Z' });
    await mockWsiScanBatchService.updateSlideStatus(batch.id, '2', { scanStatus: 'completed', qcPassed: false, failureReason: 'Out-of-focus' });
    const unloaded = await unloadScanBatch(batch.id);
    expect(unloaded.ok && unloaded.data.status).toBe('unloaded');
    expect(unloaded.ok && unloaded.returnedToQueue).toBe(1);
    expect(stainOf('CW', 's1')).toMatchObject({ distributionStatus: 'Scanned', wsiScanBatchId: batch.id });
    expect(stainOf('CW', 's2')).toMatchObject({ distributionStatus: 'In Scanning Queue', wsiScanBatchId: undefined });
    expect((await loadScanQueue()).map(q => q.key)).toEqual(['CW|b|s2']);
    expect(h.audit.map(a => a.event)).toEqual(['WSI scan batch loaded', 'WSI scan batch sent', 'WSI scan batch unloaded']);
    expect(h.asked.map(a => a[0])).toEqual(['wsi:scan-batch:load', 'wsi:scan-batch:send', 'wsi:scan-batch:unload', 'wsi:scan-batch:unload']);
  });

  it('a failed send keeps the batch loaded with the reason; it can be sent again', async () => {
    const loaded = await loadScanBatch('APERIO_GT450_01', ['CW|b|s1']);
    if (loaded.ok === false) throw new Error(loaded.error);
    h.sendOk.current = false;
    expect(await sendScanBatch(loaded.data.id)).toEqual({ ok: false, error: 'SEND_FAILED', message: 'DISPATCH_UNREACHABLE' });
    const stored = await mockWsiScanBatchService.getById(loaded.data.id);
    expect(stored.ok && stored.data).toMatchObject({ status: 'loaded', sendError: { code: 'DISPATCH_UNREACHABLE' } });
    h.sendOk.current = true;
    const again = await sendScanBatch(loaded.data.id);
    expect(again.ok && again.data).toMatchObject({ status: 'scanning', sendError: undefined });
  });

  it('send and unload need their own permissions', async () => {
    const loaded = await loadScanBatch('APERIO_GT450_01', ['CW|b|s1']);
    if (loaded.ok === false) throw new Error(loaded.error);
    h.allowed.current = false;
    expect(await sendScanBatch(loaded.data.id)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await unloadScanBatch(loaded.data.id)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(h.sent).toEqual([]);
  });

  it('an unsent batch can be unloaded; its slides go back to the queue', async () => {
    const loaded = await loadScanBatch('APERIO_GT450_01', ['CW|b|s1']);
    if (loaded.ok === false) throw new Error(loaded.error);
    const res = await unloadScanBatch(loaded.data.id);
    expect(res.ok && res.returnedToQueue).toBe(1);
    expect(stainOf('CW', 's1')).toMatchObject({ distributionStatus: 'In Scanning Queue', wsiScanBatchId: undefined });
  });

  it('PS-71 (Batch 458): a slide changed by someone else while loading is kept; every save carries a version', async () => {
    h.beforeSave.push(id => {
      const c = h.cases[id];
      const stains = c.specimens[0].blocks[0].stains.map((x: any) => (x.id === 's2' ? { ...x, note: 'recut requested' } : x));
      h.cases[id] = { ...c, specimens: [{ ...c.specimens[0], blocks: [{ ...c.specimens[0].blocks[0], stains }] }], version: (c.version ?? 0) + 1 };
    });
    const loaded = await loadScanBatch('APERIO_GT450_01', ['CW|b|s1']);
    expect(loaded.ok).toBe(true);
    expect(stainOf('CW', 's1')).toMatchObject({ distributionStatus: 'Loaded on Scanner' });
    expect((stainOf('CW', 's2') as any).note).toBe('recut requested');
    expect(h.saves).toEqual([['CW', 0], ['CW', 1]]);
  });
});
