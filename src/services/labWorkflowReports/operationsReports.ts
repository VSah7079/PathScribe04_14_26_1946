// src/services/labWorkflowReports/operationsReports.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730 (Lab Workflow & Batch spec §9): the other built-in reports.
//   • stationVolume: items scanned per station per day or ISO week (own scans
//     only, §10.3; carrier-less items count, §10.1).
//   • addOnReport: add-on orders by type: ordered, cut, median minutes to cut, STAT.
//   • reworkReport: slides cut, recut orders, slide and cassette reprints, and rates.
//   • reconciliationReport: missing and unexpected items and supervisor overrides.
//   • batchDurationReport: Decal and Staining batches, duration against target.
// Pure. Dates are bucketed in the lab's time zone.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { StainOrder } from '@/types/case/Specimen';
import type { Batch } from '../batches/IBatchService';
import type { StationScanEvent } from '../stationScans/IStationScanEventService';
import { TYPE_BY_QUEUE } from '../facilityOpsDashboard/openAddOnOrders';
import { percentile } from './turnaroundReport';
import type { AddOnRow, BatchDurationRow, ReconciliationRow, ReportRange, ReworkRow, VolumeRow } from './labWorkflowReportTypes';

const inRange = (iso: string | undefined, r: ReportRange) => !!iso && iso >= r.from && iso < r.to;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** 'YYYY-MM-DD' of an instant in a time zone. */
export function localDate(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** ISO week 'YYYY-Www' of a 'YYYY-MM-DD' date. */
export function isoWeek(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function stationVolume(events: readonly StationScanEvent[], o: { range: ReportRange; by: 'day' | 'week'; timeZone: string }): VolumeRow[] {
  const groups = new Map<string, { row: VolumeRow; items: Set<string> }>();
  for (const e of events) {
    if (e.inferredFromCarrier || e.materialType === 'carrier' || e.materialType === 'unknown' || !inRange(e.at, o.range)) continue;
    const day = localDate(e.at, o.timeZone);
    const period = o.by === 'week' ? isoWeek(day) : day;
    const key = `${period}|${e.stationId}`;
    const g = groups.get(key) ?? { row: { period, stationName: e.stationName, stage: e.stationWorkflowStage ?? '', items: 0, scans: 0 }, items: new Set<string>() };
    g.row.scans += 1;
    g.items.add(e.itemId);
    groups.set(key, g);
  }
  return [...groups.values()].map(g => ({ ...g.row, items: g.items.size }))
    .sort((a, b) => a.period.localeCompare(b.period) || a.stationName.localeCompare(b.stationName));
}

type Slide = StainOrder & { orderedAt?: string; addOnPriority?: string; printedAt?: string; reprintCount?: number; isControlSlide?: boolean };

/** Every slide of a case (ordinary and matrix blocks). */
export function slidesOf(c: Pick<Case, 'specimens' | 'matrixBlocks'>): Slide[] {
  return [
    ...(c.specimens ?? []).flatMap(sp => (sp.blocks ?? []).flatMap(b => (b.stains ?? []) as Slide[])),
    ...(c.matrixBlocks ?? []).flatMap(m => (m.slides ?? []) as Slide[]),
  ];
}

const isAddOn = (s: Slide) => !!s.orderedAt && !!s.addOnPriority && !s.isControlSlide;
const typeOf = (s: Slide) => (s.routedQueueLabel && TYPE_BY_QUEUE[s.routedQueueLabel]) || 'other';

export function addOnReport(cases: readonly Case[], o: { range: ReportRange }): AddOnRow[] {
  const by = new Map<string, { ordered: number; cut: number; stat: number; minutes: number[] }>();
  for (const c of cases) for (const s of slidesOf(c)) {
    if (!isAddOn(s) || !inRange(s.orderedAt, o.range)) continue;
    const t = typeOf(s);
    const g = by.get(t) ?? { ordered: 0, cut: 0, stat: 0, minutes: [] };
    g.ordered += 1;
    if (s.addOnPriority === 'STAT/Urgent') g.stat += 1;
    if (s.printedAt) {
      g.cut += 1;
      const m = (new Date(s.printedAt).getTime() - new Date(s.orderedAt!).getTime()) / 60_000;
      if (Number.isFinite(m) && m >= 0) g.minutes.push(m);
    }
    by.set(t, g);
  }
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([type, g]) => {
    const med = percentile([...g.minutes].sort((x, y) => x - y), 50);
    return { type, ordered: g.ordered, cut: g.cut, stat: g.stat, medianMinutesToCut: med === null ? null : Math.round(med) };
  });
}

export function reworkReport(cases: readonly Case[], o: { range: ReportRange }): ReworkRow[] {
  let cut = 0, recuts = 0, slideReprints = 0, cassetteReprints = 0;
  for (const c of cases) {
    for (const s of slidesOf(c)) {
      if (s.isControlSlide) continue;
      if (inRange(s.printedAt, o.range)) { cut += 1; slideReprints += s.reprintCount ?? 0; }
      if (isAddOn(s) && typeOf(s) === 'recut' && inRange(s.orderedAt, o.range)) recuts += 1;
    }
    if (inRange(c.accession?.accessionedAt, o.range)) {
      for (const sp of c.specimens ?? []) for (const b of sp.blocks ?? []) cassetteReprints += b.cassetteReprintCount ?? 0;
      for (const m of c.matrixBlocks ?? []) cassetteReprints += m.cassetteReprintCount ?? 0;
    }
  }
  const pct = (n: number) => (cut ? round1((n / cut) * 100) : 0);
  return [
    { measure: 'slidesCut', value: cut },
    { measure: 'recutOrders', value: recuts },
    { measure: 'recutRatePct', value: pct(recuts) },
    { measure: 'slideReprints', value: slideReprints },
    { measure: 'cassetteReprints', value: cassetteReprints },
    { measure: 'reworkRatePct', value: pct(recuts + slideReprints) },
  ];
}

/** The case accession of an item id (S26-4403-A1, S26-4403-A1-L2, S26-4404-M1 → S26-4403 / S26-4404). */
export const accessionOf = (displayId: string) => displayId.replace(/-[A-Z]+\d+(-[A-Z]*\d+)?$/i, '');

export function reconciliationReport(batches: readonly Batch[], o: { range: ReportRange }): ReconciliationRow[] {
  const rows: ReconciliationRow[] = [];
  for (const b of batches) {
    for (const u of b.unexpectedScans ?? []) {
      if (inRange(u.at, o.range)) rows.push({ kind: 'unexpected', carrier: b.masterBarcode, item: u.scannedDisplayId, caseAccession: accessionOf(u.scannedDisplayId), at: u.at, stationName: '', by: u.byUserName, reason: '', reasonCode: '' });
    }
    const closedAt = b.override?.at ?? b.completedAt;
    for (const i of b.items) {
      if (i.reconciliationStatus === 'missing' && inRange(closedAt, o.range)) rows.push({ kind: 'missing', carrier: b.masterBarcode, item: i.displayId ?? '', caseAccession: i.caseAccession ?? '', at: closedAt!, stationName: '', by: b.override?.byUserName ?? '', reason: '', reasonCode: '' });
    }
    if (b.override && inRange(b.override.at, o.range)) rows.push({ kind: 'override', carrier: b.masterBarcode, item: '', caseAccession: '', at: b.override.at, stationName: '', by: b.override.byUserName, reason: b.override.reason, reasonCode: b.override.reasonCode ?? '' });
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at) || a.carrier.localeCompare(b.carrier));
}

/** When a batch arrived at and left a step: it may be created there or moved there, and moves on as the same batch (§10.2). */
export function timeAtStep(b: Batch, node: Batch['processingNode']): { from: string; to: string } | null {
  const history = b.nodeHistory ?? [];
  const arrived = history.find(h => h.toNode === node)?.at ?? (history.length === 0 ? (b.processingNode === node ? b.createdAt : undefined) : (history[0].fromNode === node ? b.createdAt : undefined));
  if (!arrived) return null;
  const left = history.find(h => h.fromNode === node && h.at >= arrived)?.at ?? (b.processingNode === node ? b.completedAt : undefined);
  return left ? { from: arrived, to: left } : null;
}

export function batchDurationReport(batches: readonly Batch[], o: { range: ReportRange; stainingTargetMinutes?: number }): BatchDurationRow[] {
  const rows: BatchDurationRow[] = [];
  for (const b of batches) {
    for (const node of ['Decal / Special Processing', 'Staining'] as const) {
      const span = timeAtStep(b, node);
      if (!span || !inRange(span.to, o.range)) continue;
      const minutes = Math.round((new Date(span.to).getTime() - new Date(span.from).getTime()) / 60_000);
      const target = node === 'Staining' ? (o.stainingTargetMinutes ?? null) : (b.targetDurationMinutes ?? null);
      rows.push({ node, carrier: b.masterBarcode, startedAt: span.from, finishedAt: span.to, minutes, targetMinutes: target, overTarget: target === null ? null : minutes > target });
    }
  }
  return rows.sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
}
