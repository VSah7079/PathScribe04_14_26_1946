// src/services/facilityOpsDashboard/stationOverviewRules.ts
// Batch 727 (Lab Workflow & Batch spec §9): the figures behind the Stations wall view. Pure.
//   - per processing step: open carriers, the items in them, the age of the oldest carrier, STAT carriers;
//   - STAT waiting (STAT carriers and STAT add-ons) and past the time X (carriers older than X and add-ons past X);
//   - missing or unexpected items in reconciliations still open, unacknowledged cold-chain excursions,
//     instrument runs reported failed.
// Loose add-ons count in the STAT and past-X figures, so carrier-less work does not drop out (§10.1).
// Batch 729: items at a step with no carrier (from the station scan log) are counted on that step's row
// (`loose`), and a step with only loose items gets a row too.
import type { Batch, BatchProcessingNode } from '../batches/IBatchService';
import type { OpenAddOnOrder } from './openAddOnOrders';

export interface StationRow { node: BatchProcessingNode; carriers: number; items: number; oldestMinutes: number; stat: number; loose: number }

export interface StationOverview {
  rows: StationRow[];
  statWaiting: number;
  pastLimit: number;
  missingOrUnexpected: number;
  reconciliationExceptions: { id: string; barcode: string; missing: number; unexpected: number }[];
  coldChainOpen: { id: string; barcode: string; temperatureCelsius: number }[];
  runFailed: { id: string; barcode: string; node: BatchProcessingNode }[];
}

const ageOf = (iso: string, now: number) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

export function summarizeStations(
  batches: readonly Batch[],
  addOns: readonly OpenAddOnOrder[],
  opts: { limitMinutes: number; nodes: readonly BatchProcessingNode[]; now?: number; looseByNode?: Partial<Record<BatchProcessingNode, number>> },
): StationOverview {
  const now = opts.now ?? Date.now();
  const open = batches.filter(b => b.status === 'active' || b.status === 'reconciling');
  const rows: StationRow[] = [];
  for (const node of opts.nodes) {
    const here = open.filter(b => b.processingNode === node);
    const loose = opts.looseByNode?.[node] ?? 0;
    if (here.length === 0 && loose === 0) continue;
    rows.push({
      node, carriers: here.length, items: here.reduce((n, b) => n + b.items.length, 0),
      oldestMinutes: here.length ? Math.max(...here.map(b => ageOf(b.createdAt, now))) : 0, stat: here.filter(b => b.priority === 'STAT').length, loose,
    });
  }
  rows.sort((a, b) => b.oldestMinutes - a.oldestMinutes);
  const reconciliationExceptions = open
    .filter(b => b.status === 'reconciling')
    .map(b => ({ id: b.id, barcode: b.masterBarcode, missing: b.items.filter(i => i.reconciliationStatus !== 'matched').length, unexpected: b.unexpectedScans.length }))
    .filter(r => r.missing > 0 || r.unexpected > 0);
  return {
    rows,
    statWaiting: open.filter(b => b.priority === 'STAT').length + addOns.filter(a => a.isStat).length,
    pastLimit: open.filter(b => ageOf(b.createdAt, now) > opts.limitMinutes).length + addOns.filter(a => a.state === 'overdue').length,
    missingOrUnexpected: reconciliationExceptions.reduce((n, r) => n + r.missing + r.unexpected, 0),
    reconciliationExceptions,
    coldChainOpen: batches.filter(b => b.coldChainExcursion && !b.coldChainExcursion.acknowledgedAt && b.status !== 'aborted')
      .map(b => ({ id: b.id, barcode: b.masterBarcode, temperatureCelsius: b.coldChainExcursion!.temperatureCelsius })),
    runFailed: open.filter(b => b.stainingInstrumentStatus === 'Run Failed').map(b => ({ id: b.id, barcode: b.masterBarcode, node: b.processingNode })),
  };
}
