// Batch 763: a staining run goes on to distribution (Staining → Checkout) only once its QC is decided.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storageGet, storageSet } from '../mockStorage';

const { openRun } = vi.hoisted(() => ({ openRun: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }) } }));
vi.mock('../stainQc/stainQcServiceInstance', () => ({ stainQcSystem: { openRun: (r: unknown) => openRun(r) } }));

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; }, clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: () => null, length: 0,
  });
  openRun.mockReset();
});

async function stainingBatch() {
  const { mockBatchService: svc } = await import('./mockBatchService');
  const created = await svc.create({ processingNode: 'Staining', protocol: 'H&E', priority: 'Routine', createdByUserId: 'u1', createdByUserName: 'Tech A' } as never);
  if (created.ok !== true) throw new Error('setup');
  const id = created.data.id;
  const batches = storageGet<{ id: string; items: unknown[] }[]>('batches', []);
  storageSet('batches', batches.map(b => (b.id === id ? { ...b, items: [{ id: 'i1', displayId: 'S26-4403-A1-H&E', caseAccession: 'S26-4403', materialType: 'slide', addedAt: 'x', addedByUserId: 'u1', addedByUserName: 'Tech A' }] } : b)));
  return { svc, id, barcode: created.data.masterBarcode };
}

describe('the QC gate on a staining run (Batch 763)', () => {
  it('refuses Checkout while QC is pending, naming the slides it opened the run for', async () => {
    const { svc, id, barcode } = await stainingBatch();
    openRun.mockResolvedValue({ status: 'pending' });
    expect(await svc.advanceToNode(id, 'Checkout', 'u2', 'Tech B')).toEqual({ ok: false, error: 'stainQcPending' });
    expect(openRun).toHaveBeenCalledWith({ batchId: id, masterBarcode: barcode, stainerIdOrCode: null, slides: [{ slideId: 'S26-4403-A1-H&E', caseAccession: 'S26-4403' }] });
  });

  it('lets the run go on once QC is decided, passed or failed', async () => {
    const { svc, id } = await stainingBatch();
    openRun.mockResolvedValue({ status: 'failed' });
    const moved = await svc.advanceToNode(id, 'Checkout', 'u2', 'Tech B');
    expect(moved.ok === true && moved.data.processingNode).toBe('Checkout');
  });
});
