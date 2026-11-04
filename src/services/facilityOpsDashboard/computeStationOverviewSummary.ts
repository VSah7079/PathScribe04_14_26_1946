// src/services/facilityOpsDashboard/computeStationOverviewSummary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 727 (Lab Workflow & Batch spec §9, the live minimum set): a sixth wall
// view, Stations. One row per processing step with open carriers: how many
// carriers and items are waiting there and the age of the oldest. Stat tiles:
// STAT waiting, past the time X (Display Profile), add-ons waiting, missing or
// unexpected items in open reconciliations, unacknowledged cold-chain
// excursions and failed instrument runs. Alerts for each of the last three,
// and for Decal batches past their target. Loose add-ons count too (§10.1).
// Batch 729 (§7.5, §10.1): from the station scan log, items with no carrier
// are counted on their step's row, and items not scanned for longer than the
// profile's not-scanned time are listed (tile and alerts, longest first).
// Batch barcodes, accession numbers and counts only; no names or MRNs.
// ─────────────────────────────────────────────────────────────────────────────

import { batchMatchesPurposeFilter } from '../batches/batchPurposes';
import { batchService } from '../batches/batchServiceInstance';
import { BATCH_PROCESSING_NODES } from '../batches/IBatchService';
import { buildFacilityLookupMaps } from './buildFacilityLookupMaps';
import { resolveBatchFacilityId } from './resolveBatchFacilityId';
import { computeSlaCountdown, formatSlaDuration } from './computeSlaCountdown';
import { listOpenAddOnOrders, DEFAULT_ADD_ON_AGE_LIMIT_MINUTES } from './openAddOnOrders';
import { summarizeStations } from './stationOverviewRules';
import { DEFAULT_STALE_SCAN_MINUTES } from './displayProfileRules';
import { stationScanEventService } from '../stationScans/stationScanEventServiceInstance';
import type { StationActivity } from '../stationScans/IStationScanEventService';

/** A step row's detail: with the items held by no carrier when there are any. */
function stationRowDetail(r: { carriers: number; items: number; loose: number }): Pick<DashboardQueueItem, 'detail' | 'detailKey' | 'detailValues'> {
  return r.loose > 0
    ? { detail: `${r.carriers} carrier(s) · ${r.items} item(s) · ${r.loose} without a carrier`, detailKey: 'facilityOpsDashboard.details.stationRowLoose', detailValues: { carriers: r.carriers, items: r.items, loose: r.loose } }
    : { detail: `${r.carriers} carrier(s) · ${r.items} item(s)`, detailKey: 'facilityOpsDashboard.details.stationRow', detailValues: { carriers: r.carriers, items: r.items } };
}

/** Alerts listed for items not scanned recently (the tile carries the full count). */
const STALE_ALERTS_SHOWN = 10;
import type { DashboardSummary, DashboardAlert, DashboardQueueItem, DashboardViewOptions } from './IFacilityOpsDashboardTypes';

export async function computeStationOverviewSummary(facilityId: string | undefined, options: DashboardViewOptions = {}): Promise<DashboardSummary> {
  const [batchesRes, maps] = await Promise.all([batchService.getAll(), buildFacilityLookupMaps()]);
  const limit = options.addOnAgeLimitMinutes ?? DEFAULT_ADD_ON_AGE_LIMIT_MINUTES;
  const batches = (batchesRes.ok ? batchesRes.data : [])
    .filter(b => !facilityId || resolveBatchFacilityId(b, maps.accessionToFacilityId, maps.stationToFacilityId) === facilityId)
    .filter(b => batchMatchesPurposeFilter(b, options.batchPurposeIds));
  const addOns = listOpenAddOnOrders(maps.casesById.values(), { facilityId, accessionToFacilityId: maps.accessionToFacilityId, limitMinutes: limit });
  const staleMinutes = options.staleScanMinutes ?? DEFAULT_STALE_SCAN_MINUTES;
  const activityRes = await stationScanEventService.activitySummary({ facilityId, staleMinutes }).catch(() => null);
  const activity: StationActivity = activityRes && activityRes.ok === true ? activityRes.data : { stale: [], looseByNode: {} };
  const s = summarizeStations(batches, addOns, { limitMinutes: limit, nodes: BATCH_PROCESSING_NODES, looseByNode: activity.looseByNode });

  const queue: DashboardQueueItem[] = s.rows.map(r => ({
    id: `node-${r.node}`, label: r.node, labelKey: `batchManagement.nodes.${r.node}`,
    ...stationRowDetail(r),
    ageMinutes: r.oldestMinutes, isStat: r.stat > 0,
    slaState: r.oldestMinutes > limit ? 'overdue' : undefined, remainingMinutes: r.oldestMinutes > limit ? limit - r.oldestMinutes : undefined,
  }));

  const alerts: DashboardAlert[] = [];
  for (const b of s.reconciliationExceptions) {
    alerts.push({ id: `recon-${b.id}`, severity: 'warning', kind: 'Reconciliation', kindKey: 'facilityOpsDashboard.alertKinds.reconciliation', title: b.barcode, detail: `Missing ${b.missing} · unexpected ${b.unexpected}`, detailKey: 'facilityOpsDashboard.details.reconciliation', detailValues: { missing: b.missing, unexpected: b.unexpected } });
  }
  for (const b of s.coldChainOpen) {
    alerts.push({ id: `cold-${b.id}`, severity: 'critical', kind: 'Cold-Chain Excursion', kindKey: 'facilityOpsDashboard.alertKinds.coldChainExcursion', title: b.barcode, detail: `${b.temperatureCelsius}°C`, detailKey: 'facilityOpsDashboard.details.temperature', detailValues: { temp: b.temperatureCelsius } });
  }
  for (const b of s.runFailed) {
    alerts.push({ id: `run-${b.id}`, severity: 'critical', kind: 'Run Failed', kindKey: 'facilityOpsDashboard.alertKinds.runFailed', title: b.barcode, detail: b.node, detailKey: 'facilityOpsDashboard.details.node', detailValues: { node: b.node } });
  }
  for (const item of activity.stale.slice(0, STALE_ALERTS_SHOWN)) {
    alerts.push({ id: `stale-${item.itemId}`, severity: 'warning', kind: 'Not scanned', kindKey: 'facilityOpsDashboard.alertKinds.notScanned', title: item.itemId, detail: `${item.stationName} · ${formatSlaDuration(item.minutes)}`, detailKey: 'facilityOpsDashboard.details.lastSeenAt', detailValues: { station: item.stationName, duration: formatSlaDuration(item.minutes) }, ageMinutes: item.minutes });
  }
  for (const b of batches) {
    if (b.status !== 'active' || b.processingNode !== 'Decal / Special Processing' || b.targetDurationMinutes == null) continue;
    const sla = computeSlaCountdown(b.createdAt, b.targetDurationMinutes);
    if (sla.state === 'overdue') alerts.push({ id: `decal-${b.id}`, severity: 'critical', kind: 'Decal Overdue', kindKey: 'facilityOpsDashboard.alertKinds.decalOverdue', title: b.masterBarcode, detail: b.protocol, ageMinutes: sla.elapsedMinutes });
  }

  return {
    asOf: new Date().toISOString(),
    facilityId,
    stats: [
      { id: 'stat-waiting', label: 'STAT waiting', labelKey: 'facilityOpsDashboard.stats.statWaiting', value: s.statWaiting, state: s.statWaiting > 0 ? 'overdue' : 'normal' },
      { id: 'past-limit', label: 'Past the time limit', labelKey: 'facilityOpsDashboard.stats.pastLimit', value: s.pastLimit, state: s.pastLimit > 0 ? 'overdue' : 'normal' },
      { id: 'add-ons-waiting', label: 'Add-Ons waiting', labelKey: 'facilityOpsDashboard.stats.addOnsWaiting', value: addOns.length, state: addOns.some(a => a.state === 'overdue') ? 'overdue' : addOns.some(a => a.state === 'warning') ? 'warning' : undefined },
      { id: 'reconciliation', label: 'Missing or unexpected', labelKey: 'facilityOpsDashboard.stats.reconciliationExceptions', value: s.missingOrUnexpected, state: s.missingOrUnexpected > 0 ? 'warning' : 'normal' },
      { id: 'cold-chain-open', label: 'Cold-chain excursions', labelKey: 'facilityOpsDashboard.stats.coldChainOpen', value: s.coldChainOpen.length, state: s.coldChainOpen.length > 0 ? 'overdue' : 'normal' },
      { id: 'not-scanned', label: 'Not scanned recently', labelKey: 'facilityOpsDashboard.stats.notScanned', value: activity.stale.length, state: activity.stale.length > 0 ? 'warning' : 'normal' },
      { id: 'run-failed', label: 'Instrument runs failed', labelKey: 'facilityOpsDashboard.stats.runFailed', value: s.runFailed.length, state: s.runFailed.length > 0 ? 'overdue' : 'normal' },
    ],
    queue,
    alerts,
  };
}
