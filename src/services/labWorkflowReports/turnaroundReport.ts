// src/services/labWorkflowReports/turnaroundReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730 (Lab Workflow & Batch spec §9): turnaround time by step, from
// accessioning to gross, embed, cut, stain, distribute and sign-out, with the
// median, the 90th percentile and the late percentage against the lab's targets,
// optionally by case type, priority or facility. STAT performance is the same
// report for STAT cases only. A case is counted for the cases accessioned in the
// range; it reaches a step when its last item does (the latest own scan there).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { StationScanEvent } from '../stationScans/IStationScanEventService';
import { TAT_STEPS, DEFAULT_TAT_TARGET_HOURS, type TatStep, type TatGrouping, type TatRow, type ReportRange } from './labWorkflowReportTypes';

/** A value at a percentile (nearest rank) of sorted numbers; null when there are none. */
export function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const inRange = (iso: string | undefined, r: ReportRange) => !!iso && iso >= r.from && iso < r.to;

/** Which step an own scan marks, if any. */
export function stepOfEvent(e: Pick<StationScanEvent, 'action' | 'node' | 'stationWorkflowStage' | 'inferredFromCarrier'>): TatStep | null {
  if (e.inferredFromCarrier) return null; // §10.3: a carrier-wide event is not an item reaching a step
  const at = (n: string) => e.node === n || e.stationWorkflowStage === n;
  if (e.action === 'completed' && at('Embedding')) return 'embed';
  if (e.action === 'completed' && at('Microtomy / Sectioning')) return 'cut';
  if (at('Staining') && (e.action === 'matched' || e.action === 'completed' || e.action === 'unloaded')) return 'stain';
  if (e.action === 'completed' && (at('Slide Distribution') || at('Checkout'))) return 'distribute';
  return null;
}

/** When each step was reached, per case accession (the latest own scan for that step). */
export function stepTimesByAccession(events: readonly StationScanEvent[]): Map<string, Partial<Record<TatStep, string>>> {
  const out = new Map<string, Partial<Record<TatStep, string>>>();
  for (const e of events) {
    const step = stepOfEvent(e);
    if (!step || !e.caseAccession) continue;
    const key = e.caseAccession.trim().toUpperCase();
    const times = out.get(key) ?? {};
    if (!times[step] || e.at > times[step]!) times[step] = e.at;
    out.set(key, times);
  }
  return out;
}

export interface TatOptions {
  range: ReportRange;
  grouping: TatGrouping;
  targets?: Partial<Record<TatStep, number>>;
  statOnly?: boolean;
  /** The case's type for grouping (surgical, cytology, autopsy). */
  caseTypeOf: (c: Case) => string;
}

/** The milestone times of one case, in hours from accessioning. */
export function caseStepHours(c: Case, times: Partial<Record<TatStep, string>> | undefined): Partial<Record<TatStep, number>> {
  const start = c.accession?.accessionedAt;
  if (!start) return {};
  const t0 = new Date(start).getTime();
  const at: Partial<Record<TatStep, string | undefined>> = {
    gross: c.grossCompletedAt, embed: times?.embed, cut: times?.cut, stain: times?.stain, distribute: times?.distribute, signOut: c.finalizedAt,
  };
  const out: Partial<Record<TatStep, number>> = {};
  for (const step of TAT_STEPS) {
    const iso = at[step];
    if (!iso) continue;
    const h = (new Date(iso).getTime() - t0) / 3_600_000;
    if (Number.isFinite(h) && h >= 0) out[step] = h;
  }
  return out;
}

export function turnaroundReport(cases: readonly Case[], events: readonly StationScanEvent[], o: TatOptions): TatRow[] {
  const times = stepTimesByAccession(events);
  const targets = { ...DEFAULT_TAT_TARGET_HOURS, ...(o.targets ?? {}) };
  const groupOf = (c: Case): string =>
    o.grouping === 'caseType' ? o.caseTypeOf(c)
      : o.grouping === 'priority' ? (c.order?.priority ?? 'Routine')
        : o.grouping === 'facility' ? (c.originHospitalId ?? '')
          : '';
  const buckets = new Map<string, Record<TatStep, number[]>>();
  for (const c of cases) {
    if (!inRange(c.accession?.accessionedAt, o.range)) continue;
    if (o.statOnly && c.order?.priority !== 'STAT') continue;
    const key = groupOf(c);
    const b = buckets.get(key) ?? { gross: [], embed: [], cut: [], stain: [], distribute: [], signOut: [] };
    const acc = (c.accession?.fullAccession ?? c.id).trim().toUpperCase();
    const hours = caseStepHours(c, times.get(acc));
    for (const step of TAT_STEPS) if (hours[step] !== undefined) b[step].push(hours[step]!);
    buckets.set(key, b);
  }
  const rows: TatRow[] = [];
  for (const group of [...buckets.keys()].sort()) {
    const b = buckets.get(group)!;
    for (const step of TAT_STEPS) {
      const sorted = [...b[step]].sort((x, y) => x - y);
      const late = sorted.filter(h => h > targets[step]).length;
      const med = percentile(sorted, 50);
      const p90 = percentile(sorted, 90);
      rows.push({
        group, step, cases: sorted.length, targetHours: targets[step], late,
        medianHours: med === null ? null : round1(med), p90Hours: p90 === null ? null : round1(p90),
        latePct: sorted.length ? round1((late / sorted.length) * 100) : null,
      });
    }
  }
  return rows;
}
