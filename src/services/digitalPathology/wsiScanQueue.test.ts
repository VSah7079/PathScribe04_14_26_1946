// Batch 434: the scanning queue and what loading/unloading does to a slide's record (pure).
import { describe, it, expect } from 'vitest';
import { buildScanQueue, planScanLoad, scanBatchActions, scanBatchProgress, stainLoaded, stainUnloaded } from './wsiScanQueue';
import type { StainOrder } from '@/types/case/Specimen';

const stain = (id: string, over: Partial<StainOrder> = {}): StainOrder => ({ id, stainName: 'H&E', status: 'Complete', ...over } as StainOrder);
const digital = (id: string, over: Partial<StainOrder> = {}) => stain(id, { distributionDestination: 'digital', distributionStatus: 'In Scanning Queue', scannerAssignment: { scannerInstrumentId: 'APERIO_GT450_01' }, ...over });

const cases = [
  { id: 'C1', accession: { fullAccession: 'S26-1' }, order: { priority: 'Routine' }, specimens: [{ id: 'sp1', label: 'A', blocks: [{ id: 'b1', label: '1', stains: [
    digital('st1', { distributionEvents: [{ id: 'e', action: 'assigned', timestamp: '2026-10-01T10:00:00Z', techUserId: 't', detail: '' }] }),
    stain('st2', { distributionDestination: 'physical', distributionStatus: 'Assigned' }),
    digital('st3', { wsiScanBatchId: 'batch-x', distributionStatus: 'Loaded on Scanner' }),
  ] }] }] },
  { id: 'C2', accession: { accessionNumber: '2' }, order: { priority: 'STAT' }, specimens: [{ id: 'sp2', label: 'B', blocks: [{ id: 'b2', label: '1', stains: [
    digital('st4', { distributionStatus: 'Loaded on Scanner', scannerAssignment: { scannerInstrumentId: 'APERIO_GT450_01', rackId: 'R7', slotPosition: '3' } }),
  ] }] }] },
];

describe('buildScanQueue', () => {
  it('slides routed to Digital and not in a batch, STAT first', () => {
    const q = buildScanQueue(cases);
    expect(q.map(x => x.stainId)).toEqual(['st4', 'st1']);
    expect(q[1]).toMatchObject({ key: 'C1|b1|st1', accession: 'S26-1', blockLabel: 'A1', stainName: 'H&E', scannerInstrumentId: 'APERIO_GT450_01', routedAt: '2026-10-01T10:00:00Z' });
    expect(q[0]).toMatchObject({ accession: '2', rackId: 'R7', slotPosition: '3' });
  });
});

describe('planScanLoad', () => {
  const q = buildScanQueue(cases);
  it('needs a scanner, slides, and slides still in the queue', () => {
    expect(planScanLoad('', ['C1|b1|st1'], q)).toEqual({ ok: false, error: 'NO_SCANNER' });
    expect(planScanLoad('S', [], q)).toEqual({ ok: false, error: 'NO_SLIDES' });
    expect(planScanLoad('S', ['C1|b1|st3'], q)).toEqual({ ok: false, error: 'NOT_IN_QUEUE' });
  });
  it('positions slides by rack and slot when recorded, otherwise in the order chosen', () => {
    const p = planScanLoad('S', ['C1|b1|st1', 'C2|b2|st4'], q);
    expect(p.ok && p.slides.map(s => [s.slidePosition, s.stainId, s.slideLabel, s.scanStatus])).toEqual([['1', 'st1', 'A1 H&E', 'pending'], ['R7-3', 'st4', 'B1 H&E', 'pending']]);
  });
});

describe('the slide record through load and unload', () => {
  const batch = { id: 'wb1', batchBarcode: 'WSI-1', scannerInstrumentId: 'APERIO_GT450_01' };
  it('loading links the slide to the batch with a chain-of-custody line', () => {
    const s = stainLoaded(digital('st1'), batch, '1', 'tech', '2026-10-02T10:00:00Z');
    expect(s).toMatchObject({ distributionStatus: 'Loaded on Scanner', wsiScanBatchId: 'wb1' });
    expect(s.distributionEvents?.[s.distributionEvents.length - 1]).toMatchObject({ action: 'loaded_on_scanner', detail: 'loaded in scan batch WSI-1 on APERIO_GT450_01, position 1' });
  });
  it('unloading: scanned and passed QC → Scanned; otherwise back in the queue', () => {
    const loaded = stainLoaded(digital('st1'), batch, '1', 'tech', '2026-10-02T10:00:00Z');
    const base = { slidePosition: '1', caseId: 'C1', specimenId: 'sp1' };
    expect(stainUnloaded(loaded, batch, { ...base, scanStatus: 'completed', qcPassed: true }, 'tech', '2026-10-02T11:00:00Z')).toMatchObject({ distributionStatus: 'Scanned', wsiScanBatchId: 'wb1' });
    const qc = stainUnloaded(loaded, batch, { ...base, scanStatus: 'completed', qcPassed: false, failureReason: 'Out-of-focus' }, 'tech', '2026-10-02T11:00:00Z');
    expect(qc).toMatchObject({ distributionStatus: 'In Scanning Queue', wsiScanBatchId: undefined });
    expect(qc.distributionEvents?.[qc.distributionEvents.length - 1]?.detail).toBe('unloaded from scan batch WSI-1: image QC failed: Out-of-focus; back in the scanning queue');
    expect(stainUnloaded(loaded, batch, { ...base, scanStatus: 'pending' }, 'tech', '2026-10-02T11:00:00Z').distributionStatus).toBe('In Scanning Queue');
  });

  it('records what the unload found, for the slide image state (Batch 750)', () => {
    const at = '2026-10-02T11:00:00Z';
    const loaded = stainLoaded(digital('st1'), batch, '1', 'tech', '2026-10-02T10:00:00Z');
    const base = { slidePosition: '1', caseId: 'C1', specimenId: 'sp1' };
    expect(stainUnloaded(loaded, batch, { ...base, scanStatus: 'completed', qcPassed: true }, 'tech', at).lastScanOutcome).toBe('scanned');
    expect(stainUnloaded(loaded, batch, { ...base, scanStatus: 'completed', qcPassed: false }, 'tech', at).lastScanOutcome).toBe('imageQcFailed');
    expect(stainUnloaded(loaded, batch, { ...base, scanStatus: 'failed' }, 'tech', at).lastScanOutcome).toBe('scanFailed');
    expect(stainUnloaded(loaded, batch, { ...base, scanStatus: 'pending' }, 'tech', at).lastScanOutcome).toBe('notScanned');
  });
});

describe('batch progress and actions', () => {
  const slides = [
    { slidePosition: '1', caseId: 'c', specimenId: 's', scanStatus: 'completed' as const, qcPassed: true },
    { slidePosition: '2', caseId: 'c', specimenId: 's', scanStatus: 'completed' as const, qcPassed: false },
    { slidePosition: '3', caseId: 'c', specimenId: 's', scanStatus: 'scanning' as const },
  ];
  it('counts', () => {
    expect(scanBatchProgress({ slides })).toEqual({ total: 3, scanned: 1, failed: 1, pending: 1 });
  });
  it('send while loaded; unload when unsent or every slide has an outcome', () => {
    expect(scanBatchActions({ status: 'loaded', slides })).toEqual({ canSend: true, canUnload: true });
    expect(scanBatchActions({ status: 'scanning', slides })).toEqual({ canSend: false, canUnload: false });
    expect(scanBatchActions({ status: 'completed', slides: slides.slice(0, 2) })).toEqual({ canSend: false, canUnload: true });
    expect(scanBatchActions({ status: 'unloaded', slides: slides.slice(0, 2) })).toEqual({ canSend: false, canUnload: false });
  });
});
