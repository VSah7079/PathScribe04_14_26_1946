// src/services/facilityOpsDashboard/computeStainingIhcSummary.ts
// PS-288 — Staining & IHC department dashboard. Real, active
// 'Staining'/'Cytology Staining' batches, plus a real, per-status
// breakdown of every StainOrder currently in this facility's own
// cases (QC Failed / Recut Requested / Ready for Review counts) —
// real, existing StainOrderStatus values, never a new one.
//
// Honest, deliberate scope cut: StainOrder.stainName is documented
// (types/case/Specimen.ts) as a real display-name string, NOT yet a
// real foreign key into the Stain Dictionary (StainType.id) — an
// already-known, separate gap, not something this ticket fixes. A
// reliable Routine/Special-Stain/IHC/Molecular category breakdown
// would need that real FK to be trustworthy; this dashboard reports
// by StainOrderStatus instead (a real, clean, already-reliable field)
// rather than building a name-matching heuristic on top of a known,
// unreliable join.

import { batchMatchesPurposeFilter } from '../batches/batchPurposes';
import { batchService } from '../batches/batchServiceInstance';
import { buildFacilityLookupMaps } from './buildFacilityLookupMaps';
import { resolveBatchFacilityId } from './resolveBatchFacilityId';
import type { DashboardSummary, DashboardAlert, DashboardQueueItem, DashboardViewOptions } from './IFacilityOpsDashboardTypes';

const NODES = new Set(['Staining', 'Cytology Staining']);

export async function computeStainingIhcSummary(facilityId: string | undefined, options: DashboardViewOptions = {}): Promise<DashboardSummary> {
  const [batchesRes, maps] = await Promise.all([batchService.getAll(), buildFacilityLookupMaps()]);

  const batches = (batchesRes.ok ? batchesRes.data : [])
    .filter(b => b.status === 'active' && NODES.has(b.processingNode))
    .filter(b => !facilityId || resolveBatchFacilityId(b, maps.accessionToFacilityId, maps.stationToFacilityId) === facilityId)
    .filter(b => batchMatchesPurposeFilter(b, options.batchPurposeIds));

  const alerts: DashboardAlert[] = [];
  const queue: DashboardQueueItem[] = batches.map(b => {
    const ageMinutes = Math.max(0, Math.round((Date.now() - new Date(b.createdAt).getTime()) / 60000));
    if (b.priority === 'STAT') {
      alerts.push({ id: `stat-batch-${b.id}`, severity: 'critical', kind: 'STAT', kindKey: 'facilityOpsDashboard.alertKinds.stat', title: b.masterBarcode, detail: `${b.processingNode} · ${b.items.length} item(s)`, detailKey: 'facilityOpsDashboard.details.nodeItems', detailValues: { node: b.processingNode, count: b.items.length }, ageMinutes });
    }
    // Batch 727 (spec §9): the instrument status reported through the interface engine, and a failed run as an alert.
    const instrument = b.stainingInstrumentStatus ?? b.cytologyInstrumentStatus;
    if (b.stainingInstrumentStatus === 'Run Failed') {
      alerts.push({ id: `run-failed-${b.id}`, severity: 'critical', kind: 'Run Failed', kindKey: 'facilityOpsDashboard.alertKinds.runFailed', title: b.masterBarcode, detail: b.processingNode, detailKey: 'facilityOpsDashboard.details.node', detailValues: { node: b.processingNode }, ageMinutes });
    }
    if (b.qcVisualReadConfirmation === undefined && b.processingNode === 'Staining') {
      // Real, informational only — not every batch needs the visual
      // QC gate (StainType.qcEnforcementMode / WorkstationGroup's own
      // default may leave it not-applicable), so this stays out of
      // `alerts` and is left for the batch's own dedicated QC gate
      // page (resolveStainQcGate.ts) to actually adjudicate.
    }
    return {
      id: b.id, label: b.masterBarcode, detail: `${b.processingNode} · ${b.items.length} item(s)`,
      detailKey: instrument ? 'facilityOpsDashboard.details.instrument' : 'facilityOpsDashboard.details.nodeItems',
      detailValues: (instrument ? { node: b.processingNode, count: b.items.length, instrument } : { node: b.processingNode, count: b.items.length }) as Record<string, string | number>,
      ageMinutes, isStat: b.priority === 'STAT',
    };
  }).sort((a, b) => (b.ageMinutes ?? 0) - (a.ageMinutes ?? 0));

  let readyForReview = 0, qcFailed = 0, recutRequested = 0, staining = 0, stainQcWaiting = 0;
  for (const c of maps.casesById.values()) {
    if (facilityId && maps.caseFacilityById.get(c.id) !== facilityId) continue;
    for (const specimen of c.specimens ?? []) {
      for (const block of specimen.blocks ?? []) {
        for (const stain of block.stains ?? []) {
          if (stain.status === 'Ready for Review') readyForReview++;
          else if (stain.status === 'QC Failed') {
            qcFailed++;
            alerts.push({
              id: `qc-failed-${c.id}-${stain.id}`, severity: 'critical', kind: 'QC Failed', kindKey: 'facilityOpsDashboard.alertKinds.qcFailed',
              title: c.accession?.fullAccession ?? c.id, detail: `${specimen.label}${block.label} — ${stain.stainName}`,
              detailKey: 'facilityOpsDashboard.details.blockStain', detailValues: { block: `${specimen.label}${block.label}`, stain: stain.stainName },
            });
          } else if (stain.status === 'Recut Requested') {
            recutRequested++;
            alerts.push({
              id: `recut-${c.id}-${stain.id}`, severity: 'warning', kind: 'Recut Requested', kindKey: 'facilityOpsDashboard.alertKinds.recutRequested',
              title: c.accession?.fullAccession ?? c.id, detail: `${specimen.label}${block.label} — ${stain.stainName}`,
              detailKey: 'facilityOpsDashboard.details.blockStain', detailValues: { block: `${specimen.label}${block.label}`, stain: stain.stainName },
            });
          } else if (stain.status === 'Staining') staining++;
          else if (stain.status === 'QC Pending') stainQcWaiting++; // Batch 763: stained, waiting for QC sign-off
        }
      }
    }
  }

  return {
    asOf: new Date().toISOString(),
    facilityId,
    stats: [
      { id: 'staining-active', label: 'Active Staining Batches', labelKey: 'facilityOpsDashboard.stats.stainingActive', value: batches.filter(b => b.processingNode === 'Staining').length },
      { id: 'cytology-staining-active', label: 'Cytology Staining Batches', labelKey: 'facilityOpsDashboard.stats.cytologyStainingActive', value: batches.filter(b => b.processingNode === 'Cytology Staining').length },
      { id: 'in-staining', label: 'Slides In Staining', labelKey: 'facilityOpsDashboard.stats.inStaining', value: staining },
      { id: 'stain-qc-pending', label: 'Waiting for QC', labelKey: 'facilityOpsDashboard.stats.stainQcPending', value: stainQcWaiting, state: stainQcWaiting > 0 ? 'warning' : 'normal' }, // Batch 763
      { id: 'ready-for-review', label: 'Ready for Review', labelKey: 'facilityOpsDashboard.stats.readyForReview', value: readyForReview },
      { id: 'recut-requested', label: 'Recut Requested', labelKey: 'facilityOpsDashboard.stats.recutRequested', value: recutRequested, state: recutRequested > 0 ? 'warning' : 'normal' },
      { id: 'qc-failed', label: 'QC Failed', labelKey: 'facilityOpsDashboard.stats.qcFailed', value: qcFailed, state: qcFailed > 0 ? 'overdue' : 'normal' },
    ],
    queue,
    alerts,
  };
}
