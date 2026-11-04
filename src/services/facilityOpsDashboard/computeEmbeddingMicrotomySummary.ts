// src/services/facilityOpsDashboard/computeEmbeddingMicrotomySummary.ts
// PS-288 — Embedding & Microtome department dashboard. Real, active
// 'Embedding'/'Microtomy / Sectioning' batches for this facility.
// Honest scope: unlike Decal, this app has no real, existing
// per-batch target-duration field for either node, so batches show
// their own real elapsed age, uncolored, rather than inventing an
// SLA target this app has no real source for — see
// IFacilityOpsDashboardTypes.ts's own header.
//
// Batch 727 (Lab Workflow & Batch spec, Decisions 2 and 3, §6.4): add-on orders
// waiting at the microtome are on this view too, read from the slides
// (openAddOnOrders.ts), because an add-on creates slides and no batch. Each
// add-on row carries an ADD-ON tag with its order type beneath it; it is
// coloured against the profile's time X (amber before, red past it) and pinned
// to the top when STAT or past X. An "Add-Ons waiting" tile counts them.
// Labels carry locale keys (the wall display shows them in its language).

import { batchMatchesPurposeFilter } from '../batches/batchPurposes';
import { batchService } from '../batches/batchServiceInstance';
import { buildFacilityLookupMaps } from './buildFacilityLookupMaps';
import { resolveBatchFacilityId } from './resolveBatchFacilityId';
import { listOpenAddOnOrders, DEFAULT_ADD_ON_AGE_LIMIT_MINUTES } from './openAddOnOrders';
import type { DashboardSummary, DashboardAlert, DashboardQueueItem, DashboardViewOptions } from './IFacilityOpsDashboardTypes';

const NODES = new Set(['Embedding', 'Microtomy / Sectioning']);

export async function computeEmbeddingMicrotomySummary(facilityId: string | undefined, options: DashboardViewOptions = {}): Promise<DashboardSummary> {
  const [batchesRes, maps] = await Promise.all([batchService.getAll(), buildFacilityLookupMaps()]);
  const limit = options.addOnAgeLimitMinutes ?? DEFAULT_ADD_ON_AGE_LIMIT_MINUTES;

  const batches = (batchesRes.ok ? batchesRes.data : [])
    .filter(b => b.status === 'active' && NODES.has(b.processingNode))
    .filter(b => !facilityId || resolveBatchFacilityId(b, maps.accessionToFacilityId, maps.stationToFacilityId) === facilityId)
    .filter(b => batchMatchesPurposeFilter(b, options.batchPurposeIds));

  const alerts: DashboardAlert[] = [];
  const batchRows: DashboardQueueItem[] = batches.map(b => {
    const ageMinutes = Math.max(0, Math.round((Date.now() - new Date(b.createdAt).getTime()) / 60000));
    const detail = { detail: `${b.processingNode} · ${b.items.length} item(s)`, detailKey: 'facilityOpsDashboard.details.nodeItems', detailValues: { node: b.processingNode, count: b.items.length } };
    if (b.priority === 'STAT') {
      alerts.push({ id: `stat-batch-${b.id}`, severity: 'critical', kind: 'STAT', kindKey: 'facilityOpsDashboard.alertKinds.stat', title: b.masterBarcode, ...detail, ageMinutes });
    }
    return { id: b.id, label: b.masterBarcode, ...detail, ageMinutes, isStat: b.priority === 'STAT' };
  });

  const addOns = listOpenAddOnOrders(maps.casesById.values(), { facilityId, accessionToFacilityId: maps.accessionToFacilityId, limitMinutes: limit });
  const addOnRows: DashboardQueueItem[] = addOns.map(a => ({
    id: `addon-${a.key}`, label: a.accession, isStat: a.isStat, ageMinutes: a.ageMinutes,
    detail: `${a.block} · ${a.stainName}`, detailKey: 'facilityOpsDashboard.details.blockStain', detailValues: { block: a.block, stain: a.stainName },
    tags: ['addOn'], subLabelKey: `facilityOpsDashboard.addOnTypes.${a.type}`,
    slaState: a.state, remainingMinutes: a.remainingMinutes, pinned: a.pinned,
  }));
  for (const a of addOns.filter(x => x.isStat)) {
    alerts.push({ id: `stat-addon-${a.key}`, severity: 'critical', kind: 'STAT', kindKey: 'facilityOpsDashboard.alertKinds.statAddOn', title: a.accession, detail: `${a.block} · ${a.stainName}`, detailKey: 'facilityOpsDashboard.details.blockStain', detailValues: { block: a.block, stain: a.stainName }, ageMinutes: a.ageMinutes });
  }

  // Age order, oldest first; pinned add-ons (STAT or past X) on top (Decision 3).
  const queue = [...batchRows, ...addOnRows]
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.ageMinutes ?? 0) - (a.ageMinutes ?? 0));

  const embeddingCount = batches.filter(b => b.processingNode === 'Embedding').length;
  const microtomyCount = batches.filter(b => b.processingNode === 'Microtomy / Sectioning').length;
  const totalItems = batches.reduce((sum, b) => sum + b.items.length, 0);
  const statBatches = batches.filter(b => b.priority === 'STAT').length;

  return {
    asOf: new Date().toISOString(),
    facilityId,
    stats: [
      { id: 'embedding-active', label: 'Embedding Batches', labelKey: 'facilityOpsDashboard.stats.embeddingActive', value: embeddingCount },
      { id: 'microtomy-active', label: 'Microtome Batches', labelKey: 'facilityOpsDashboard.stats.microtomyActive', value: microtomyCount },
      { id: 'stat-batches', label: 'STAT Batches', labelKey: 'facilityOpsDashboard.stats.statBatches', value: statBatches, state: statBatches > 0 ? 'overdue' : 'normal' },
      { id: 'total-items', label: 'Cassettes/Slides In Process', labelKey: 'facilityOpsDashboard.stats.totalItems', value: totalItems },
      { id: 'add-ons-waiting', label: 'Add-Ons waiting', labelKey: 'facilityOpsDashboard.stats.addOnsWaiting', value: addOns.length,
        state: addOns.some(a => a.state === 'overdue') ? 'overdue' : addOns.some(a => a.state === 'warning') ? 'warning' : 'normal' },
    ],
    queue,
    alerts,
  };
}
