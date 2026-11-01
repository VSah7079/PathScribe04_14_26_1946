// Batch 726 (Lab Workflow & Batch spec, Decisions 1, 8, 9; §2 rows 1-2; §7.1; §10.2-10.3): the carrier operations in
// the demo batch service — sealing, moving a carrier on as the same batch (Decal included), the carrier scan at a
// station, and the station scan events they write.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { enforce } = vi.hoisted(() => ({ enforce: vi.fn(async (_key: string) => ({ allowed: true })) }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (k: string) => enforce(k) } }));
vi.mock('@/utils/resolveMaterialFromScan', () => ({
  resolveMaterialFromScan: vi.fn(async (raw: string) => (/^S26-\d+-A\d$/.test(raw.trim())
    ? { caseData: { id: 'S26-1' }, fullAccession: raw.trim().split('-').slice(0, 2).join('-'), specimenLetter: 'A', target: { level: 'block' }, displayId: raw.trim() }
    : null)),
}));

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; }, clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: () => null, length: 0,
  });
  enforce.mockImplementation(async () => ({ allowed: true }));
});

async function setup(node: 'Processing' | 'Decal / Special Processing' = 'Processing') {
  const { mockBatchService: svc } = await import('./mockBatchService');
  const { mockStationScanEventService: events } = await import('../stationScans/mockStationScanEventService');
  const created = await svc.create({ processingNode: node, protocol: 'Overnight', priority: 'Routine', createdByUserId: 'u1', createdByUserName: 'Tech A', solutionType: 'EDTA', targetDurationMinutes: 240 } as never);
  if (created.ok !== true) throw new Error('setup');
  await svc.addItemByScan(created.data.id, 'S26-5501-A1', 'u1', 'Tech A', undefined, 'station-gross-1');
  await svc.addItemByScan(created.data.id, 'S26-5501-A2', 'u1', 'Tech A');
  return { svc, events, id: created.data.id };
}

describe('carrier operations (Batch 726)', () => {
  it('loading with a station writes a "loaded" event; without a station, none (§7.6)', async () => {
    const { events } = await setup();
    const all = await events.query({});
    expect(all.ok === true && all.data.map(e => [e.itemId, e.action, e.stationId, e.inferredFromCarrier ?? false])).toEqual([['S26-5501-A1', 'loaded', 'station-gross-1', false]]);
  });

  it('a sealed manifest takes nothing and gives nothing back; sealing needs batch:manifest:seal', async () => {
    const { svc, id } = await setup();
    enforce.mockImplementation(async () => ({ allowed: false }));
    expect(await svc.sealManifest(id, 'u2', 'Tech B')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    enforce.mockImplementation(async () => ({ allowed: true }));
    const sealed = await svc.sealManifest(id, 'u2', 'Tech B');
    expect(sealed.ok === true && sealed.data.sealedByUserName).toBe('Tech B');
    expect(await svc.sealManifest(id, 'u2', 'Tech B')).toEqual({ ok: false, error: 'alreadySealed' });
    const add = await svc.addItemByScan(id, 'S26-4404-A1', 'u2', 'Tech B');
    expect(add.outcome).toBe('not-accepting');
    const item = sealed.ok === true ? sealed.data.items[0] : null;
    expect(await svc.removeItem(id, item!.id, 'u2', 'Tech B')).toEqual({ ok: false, error: 'batchSealed' });
  });

  it('a carrier moves to its next step as the same batch, sealed, with history and one "from carrier" event per item', async () => {
    const { svc, events, id } = await setup();
    expect(await svc.advanceToNode(id, 'Staining', 'u2', 'Tech B', 'station-embed-1')).toEqual({ ok: false, error: 'cannotAdvance' });
    const moved = await svc.advanceToNode(id, 'Embedding', 'u2', 'Tech B', 'station-embed-1');
    expect(moved.ok).toBe(true);
    if (moved.ok !== true) return;
    expect(moved.data.id).toBe(id);
    expect(moved.data.processingNode).toBe('Embedding');
    expect(moved.data.sealedAt).toBeTruthy();
    expect(moved.data.nodeHistory?.[0]).toMatchObject({ fromNode: 'Processing', toNode: 'Embedding', stationId: 'station-embed-1' });
    const fromCarrier = await events.query({ stationId: 'station-embed-1' });
    expect(fromCarrier.ok === true && fromCarrier.data.map(e => [e.itemId, e.action, e.inferredFromCarrier, e.node])).toEqual([
      ['S26-5501-A1', 'loaded', true, 'Embedding'], ['S26-5501-A2', 'loaded', true, 'Embedding'],
    ]);
  });

  it('moving a carrier needs batch:carrier:advance', async () => {
    const { svc, id } = await setup();
    enforce.mockImplementation(async () => ({ allowed: false }));
    expect(await svc.advanceToNode(id, 'Embedding', 'u2', 'Tech B')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });

  it('Decision 9: Decal "Transfer to Processing" keeps the same batch and barcode instead of making a new one', async () => {
    const { svc, id } = await setup('Decal / Special Processing');
    const before = await svc.getById(id);
    const res = await svc.transferToProcessing(id, 'u2', 'Tech B');
    expect(res.ok).toBe(true);
    if (res.ok !== true || before.ok !== true) return;
    expect(res.data.fromBatch.id).toBe(id);
    expect(res.data.toBatch.id).toBe(id);
    expect(res.data.toBatch.masterBarcode).toBe(before.data.masterBarcode);
    expect(res.data.toBatch.processingNode).toBe('Processing');
    expect(res.data.toBatch.items).toHaveLength(2);
    expect(res.data.toBatch.status).toBe('active');
    const all = await svc.getAll();
    expect(all.ok === true && all.data.filter(b => b.createdByUserName === 'Tech A' && b.protocol.includes('transferred'))).toEqual([]);
  });

  it('a carrier scan at a station records the station on a carrier that had none, and one "received" event per item', async () => {
    const { svc, events, id } = await setup();
    expect(await svc.recordCarrierScan(id, '', 'u2', 'Tech B', 'ok')).toEqual({ ok: false, error: 'stationRequired' });
    const res = await svc.recordCarrierScan(id, 'station-proc-1', 'u2', 'Tech B', 'ok');
    expect(res.ok === true && res.data.stationId).toBe('station-proc-1');
    const got = await events.query({ stationId: 'station-proc-1' });
    expect(got.ok === true && got.data.every(e => e.action === 'received' && e.inferredFromCarrier === true && e.result === 'ok')).toBe(true);
  });

  it('opening another step\'s carrier needs station:scan-mismatch:continue and is recorded as a mismatch', async () => {
    const { svc, events, id } = await setup();
    enforce.mockImplementation(async (k: string) => ({ allowed: k !== 'station:scan-mismatch:continue' }));
    expect(await svc.recordCarrierScan(id, 'station-stain-1', 'u2', 'Tech B', 'mismatch')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    enforce.mockImplementation(async () => ({ allowed: true }));
    await svc.recordCarrierScan(id, 'station-stain-1', 'u2', 'Tech B', 'mismatch');
    const got = await events.query({ stationId: 'station-stain-1' });
    expect(got.ok === true && got.data.map(e => e.result)).toEqual(['mismatch', 'mismatch']);
  });

  it('unloading at a station records matched and unexpected scans with the station', async () => {
    const { svc, events, id } = await setup();
    await svc.startReconciliation(id, 'u2', 'Tech B');
    await svc.scanItemOut(id, 'S26-5501-A1', 'u2', 'Tech B', 'station-embed-1');
    await svc.scanItemOut(id, 'S26-9999-A1', 'u2', 'Tech B', 'station-embed-1');
    const got = await events.query({ stationId: 'station-embed-1' });
    expect(got.ok === true && got.data.map(e => [e.itemId, e.action, e.result])).toEqual([
      ['S26-5501-A1', 'matched', 'ok'], ['S26-9999-A1', 'unexpected', 'wrong-item'],
    ]);
  });
});
