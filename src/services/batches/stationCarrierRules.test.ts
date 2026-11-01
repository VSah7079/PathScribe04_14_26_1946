// Batch 726 (Lab Workflow & Batch spec, Decision 1, §2, §4, §7.1): the carrier rules at the workstations.
import { describe, it, expect } from 'vitest';
import type { Batch, BatchItem } from './IBatchService';
import {
  advanceBatch, advanceProblem, acceptsItems, carrierItemEvents, carriersForStation, decideItemScan, isCarrierBarcode,
  manifestProgress, nodesForStationStage, resolveCarrierScan, sealBatch, sealProblem,
} from './stationCarrierRules';
import { deriveNodeFromStation } from './batchFormHelpers';

const item = (displayId: string, matched = false): BatchItem => ({
  id: `i-${displayId}`, materialType: 'block', displayId, caseAccession: displayId.split('-').slice(0, 2).join('-'),
  addedAt: '2026-10-29T08:00:00Z', addedByUserId: 'u1', addedByUserName: 'Tech A', reconciliationStatus: matched ? 'matched' : undefined,
});
const batch = (over: Partial<Batch> = {}): Batch => ({
  id: 'b1', masterBarcode: 'CONT-PROC-20261029-123456', processingNode: 'Processing', protocol: 'Overnight', priority: 'Routine',
  status: 'active', items: [item('S26-4403-A1'), item('S26-4403-A2')], unexpectedScans: [], createdAt: '2026-10-29T06:00:00Z',
  createdByUserId: 'u1', createdByUserName: 'Tech A', ...over,
});

describe('which steps a station works on', () => {
  it('maps station stages to processing steps; Slide Distribution works on Checkout and External Referral', () => {
    expect(nodesForStationStage('Embedding')).toEqual(['Embedding']);
    expect(nodesForStationStage('Slide Distribution')).toEqual(['Checkout', 'External Referral']);
    expect(nodesForStationStage('Grossing')).toEqual([]);
    expect(nodesForStationStage(undefined)).toEqual([]);
  });
  it('the New Container dialog still derives one node from a station, and none from Slide Distribution', () => {
    expect(deriveNodeFromStation({ workflowStage: 'Staining' })).toBe('Staining');
    expect(deriveNodeFromStation({ workflowStage: 'Slide Distribution' })).toBeNull();
  });
});

describe('a carrier scan at a station (Decision 1)', () => {
  const at = (b: Batch | null, extra: { hasStation?: boolean; outputNodes?: Batch['processingNode'][] } = {}) =>
    resolveCarrierScan({ batch: b, stationNodes: ['Embedding'], hasStation: extra.hasStation ?? true, outputNodes: extra.outputNodes });

  it('unknown carrier: says so', () => expect(at(null)).toEqual({ kind: 'unknown' }));
  it('closed carrier: says so, with when, even with no station', () => {
    expect(at(batch({ status: 'complete', completedAt: '2026-10-28T12:00:00Z' }), { hasStation: false })).toEqual({ kind: 'closed', status: 'complete', at: '2026-10-28T12:00:00Z' });
    expect(at(batch({ status: 'aborted', abortedAt: '2026-10-28T13:00:00Z' }))).toEqual({ kind: 'closed', status: 'aborted', at: '2026-10-28T13:00:00Z' });
  });
  it('no station set: prompt, do not guess', () => expect(at(batch({ processingNode: 'Embedding' }), { hasStation: false })).toEqual({ kind: 'noStation' }));
  it('carrier at this step: open', () => expect(at(batch({ processingNode: 'Embedding' }))).toEqual({ kind: 'open', adHoc: false }));
  it('carrier from the step just before: hand-off (moves here)', () => expect(at(batch())).toEqual({ kind: 'handoff', toNode: 'Embedding' }));
  it('an empty carrier from the step before is a mismatch, not a hand-off', () => expect(at(batch({ items: [] }))).toEqual({ kind: 'mismatch', batchNode: 'Processing' }));
  it('carrier for another step: mismatch', () => expect(at(batch({ processingNode: 'Staining' }))).toEqual({ kind: 'mismatch', batchNode: 'Staining' }));
  it('ad-hoc carrier with no Target Workstation: open wherever it is scanned', () => {
    expect(at(batch({ processingNode: 'Staining', containerType: 'Ad-Hoc Batch' }))).toEqual({ kind: 'open', adHoc: true });
    expect(at(batch({ processingNode: 'Staining', containerType: 'Ad-Hoc Batch', stationId: 'st-2' }))).toEqual({ kind: 'mismatch', batchNode: 'Staining' });
  });
  it('an active carrier for a step this station fills is its output tray', () => {
    expect(at(batch({ processingNode: 'Staining' }), { outputNodes: ['Staining'] })).toEqual({ kind: 'output' });
  });
});

describe('carriers on a station\'s list (§4 hub and default queues)', () => {
  it('lists open carriers routed to the station or at its step, routed first, then STAT, then oldest; leaves out other facilities and closed ones', () => {
    const list = carriersForStation([
      batch({ id: 'old-emb', processingNode: 'Embedding', createdAt: '2026-10-29T01:00:00Z' }),
      batch({ id: 'stat-emb', processingNode: 'Embedding', priority: 'STAT', createdAt: '2026-10-29T05:00:00Z' }),
      batch({ id: 'routed', processingNode: 'Processing', stationId: 'st-emb' }),
      batch({ id: 'closed', processingNode: 'Embedding', status: 'complete' }),
      batch({ id: 'other-site', processingNode: 'Embedding', stationId: 'st-far' }),
      batch({ id: 'staining', processingNode: 'Staining' }),
    ], { nodes: ['Embedding'], stationId: 'st-emb', stationFacilityId: 'f1', facilityOfStation: new Map([['st-emb', 'f1'], ['st-far', 'f2']]) });
    expect(list.map(b => b.id)).toEqual(['routed', 'stat-emb', 'old-emb']);
  });
});

describe('sealing and moving a carrier (§2 rows 1 and 2)', () => {
  it('seals only an active, unsealed manifest; a sealed or closed one takes no items', () => {
    expect(sealProblem(batch())).toBeNull();
    expect(sealProblem(batch({ sealedAt: 'x' }))).toBe('alreadySealed');
    expect(sealProblem(batch({ status: 'reconciling' }))).toBe('notActive');
    expect(acceptsItems(batch())).toBe(true);
    expect(acceptsItems(sealBatch(batch(), { id: 'u2', name: 'Tech B' }, 'now'))).toBe(false);
    expect(acceptsItems(batch({ status: 'reconciling' }))).toBe(false);
  });
  it('moves only to the defined next step, only an active carrier with items', () => {
    expect(advanceProblem(batch(), 'Embedding')).toBeNull();
    expect(advanceProblem(batch(), 'Staining')).toBe('cannotAdvance');
    expect(advanceProblem(batch({ processingNode: 'Microtomy / Sectioning' }), 'Staining')).toBe('cannotAdvance');
    expect(advanceProblem(batch({ processingNode: 'Decal / Special Processing' }), 'Processing')).toBeNull(); // Decision 9: same batch
    expect(advanceProblem(batch({ status: 'reconciling' }), 'Embedding')).toBe('notActive');
    expect(advanceProblem(batch({ items: [] }), 'Embedding')).toBe('noItemsToTransfer');
  });
  it('moving seals the manifest and keeps the history', () => {
    const moved = advanceBatch(batch(), 'Embedding', { id: 'u2', name: 'Tech B' }, '2026-10-29T09:00:00Z', 'st-emb');
    expect(moved.processingNode).toBe('Embedding');
    expect(moved.sealedAt).toBe('2026-10-29T09:00:00Z');
    expect(moved.nodeHistory).toEqual([{ fromNode: 'Processing', toNode: 'Embedding', at: '2026-10-29T09:00:00Z', byUserId: 'u2', byUserName: 'Tech B', stationId: 'st-emb' }]);
    const again = advanceBatch(moved, 'Microtomy / Sectioning', { id: 'u3', name: 'Tech C' }, '2026-10-29T11:00:00Z');
    expect(again.sealedAt).toBe('2026-10-29T09:00:00Z');
    expect(again.nodeHistory).toHaveLength(2);
  });
});

describe('item scans and progress against the loaded carrier', () => {
  it('in the manifest, already matched, not in it, or not resolved', () => {
    const b = batch({ items: [item('S26-4403-A1', true), item('S26-4403-A2')] });
    expect(decideItemScan(b, 's26-4403-a2')).toBe('in-manifest');
    expect(decideItemScan(b, 'S26-4403-A1')).toBe('already-matched');
    expect(decideItemScan(b, 'S26-9999-A1')).toBe('not-in-manifest');
    expect(decideItemScan(b, null)).toBe('not-resolved');
    expect(manifestProgress({ ...b, unexpectedScans: [{ id: 'x', scannedDisplayId: 'y', at: 'z', byUserId: 'u', byUserName: 'n' }] }))
      .toMatchObject({ total: 2, matched: 1, unexpected: 1 });
  });
});

describe('carrier barcodes and per-item events', () => {
  it('recognises the configured disposable and rack prefixes', () => {
    expect(isCarrierBarcode('CONT-PROC-20261029-1')).toBe(true);
    expect(isCarrierBarcode(' rack-stain-04 ')).toBe(true);
    expect(isCarrierBarcode('S26-4403-A1')).toBe(false);
    expect(isCarrierBarcode('BOX-STAIN-1', { disposable: 'BOX' })).toBe(true);
    expect(isCarrierBarcode('CONT-STAIN-1', { disposable: 'BOX' })).toBe(false);
  });
  it('writes one event per item, marked as inferred from the carrier', () => {
    const events = carrierItemEvents(batch(), { stationId: 'st-emb', userId: 'u2', userName: 'Tech B', action: 'received', result: 'mismatch' });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ itemId: 'S26-4403-A1', caseAccession: 'S26-4403', carrierId: 'CONT-PROC-20261029-123456', stationId: 'st-emb', action: 'received', result: 'mismatch', inferredFromCarrier: true, node: 'Processing' });
  });
});

describe('Batch 734 (Pete): an ad-hoc carrier moves between stations without asking', () => {
  it('is a move only for an ad-hoc carrier last opened at another station', async () => {
    const { carrierMovesHere } = await import('./stationCarrierRules');
    expect(carrierMovesHere({ containerType: 'Ad-Hoc Batch', stationId: 'st1' }, 'st2')).toBe(true);
    expect(carrierMovesHere({ containerType: 'Ad-Hoc Batch', stationId: 'st1' }, 'st1')).toBe(false);
    expect(carrierMovesHere({ containerType: 'Ad-Hoc Batch', stationId: undefined }, 'st2')).toBe(false);
    expect(carrierMovesHere({ containerType: 'Staining Rack', stationId: 'st1' }, 'st2')).toBe(false);
  });
});
