// src/services/labWorkflowReports/labWorkflowReportService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730 (Lab Workflow & Batch spec §9, §9.3 item 5): builds one built-in lab
// workflow report after checking its capability (one per report), and exports
// it as CSV after checking its export capability. The data comes in through
// `deps` (cases, batches, station scan events), so the rules stay testable; the
// screen passes the app's services (labWorkflowReportDeps.ts). Research cases
// are left out (Decision 4). With the API server, the export is built there
// from the same parameters (ASYNC_EXPORT_API.md).
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { Batch } from '../batches/IBatchService';
import type { StationScanEvent } from '../stationScans/IStationScanEventService';
import { type LabWorkflowReportId, type ReportRange, type TatGrouping, type TatStep, type TatRow, type VolumeRow, type AddOnRow, type ReworkRow, type ReconciliationRow, type BatchDurationRow } from './labWorkflowReportTypes';
import { turnaroundReport } from './turnaroundReport';
import { stationVolume, addOnReport, reworkReport, reconciliationReport, batchDurationReport } from './operationsReports';

export interface LabWorkflowReportParams {
  id: LabWorkflowReportId;
  range: ReportRange;
  timeZone: string;
  grouping?: TatGrouping;
  targets?: Partial<Record<TatStep, number>>;
  by?: 'day' | 'week';
  stainingTargetMinutes?: number;
}

export type LabWorkflowReportOutput =
  | { id: 'turnaround' | 'statPerformance'; rows: TatRow[] }
  | { id: 'stationVolume'; rows: VolumeRow[] }
  | { id: 'addOns'; rows: AddOnRow[] }
  | { id: 'rework'; rows: ReworkRow[] }
  | { id: 'reconciliation'; rows: ReconciliationRow[] }
  | { id: 'batchDuration'; rows: BatchDurationRow[] };

export interface LabWorkflowReportDeps {
  enforce: (capability: string) => Promise<{ allowed: boolean }>;
  loadCases: () => Promise<Case[]>;
  loadBatches: () => Promise<Batch[]>;
  /** Station scan events in the range (reading them needs station:scan-history:view, checked by that service). */
  loadEvents: (range: ReportRange) => Promise<StationScanEvent[] | null>;
  caseTypeOf: (c: Case) => string;
  /** Leaves research cases out (Decision 4). */
  withoutResearch: (cases: Case[]) => Case[];
}

export type LabWorkflowReportResult = { ok: true; data: LabWorkflowReportOutput } | { ok: false; error: 'NOT_PERMITTED' | 'LOAD_FAILED' };

const EVENT_REPORTS: readonly LabWorkflowReportId[] = ['turnaround', 'statPerformance', 'stationVolume'];

type Enforce = LabWorkflowReportDeps['enforce'];

/** The view check, one capability per report (named literally so the capability guard sees each check). */
export function checkReportView(id: LabWorkflowReportId, enforce: Enforce): Promise<{ allowed: boolean }> {
  switch (id) {
    case 'turnaround': return enforce('report:workflow-turnaround:view');
    case 'stationVolume': return enforce('report:station-volume:view');
    case 'statPerformance': return enforce('report:stat-performance:view');
    case 'addOns': return enforce('report:add-on-volume:view');
    case 'rework': return enforce('report:recut-rework:view');
    case 'reconciliation': return enforce('report:reconciliation-exceptions:view');
    case 'batchDuration': return enforce('report:batch-duration:view');
  }
}

/** The export check, one capability per report. */
export function checkReportExport(id: LabWorkflowReportId, enforce: Enforce): Promise<{ allowed: boolean }> {
  switch (id) {
    case 'turnaround': return enforce('report:workflow-turnaround:export');
    case 'stationVolume': return enforce('report:station-volume:export');
    case 'statPerformance': return enforce('report:stat-performance:export');
    case 'addOns': return enforce('report:add-on-volume:export');
    case 'rework': return enforce('report:recut-rework:export');
    case 'reconciliation': return enforce('report:reconciliation-exceptions:export');
    case 'batchDuration': return enforce('report:batch-duration:export');
  }
}

export async function buildLabWorkflowReport(p: LabWorkflowReportParams, deps: LabWorkflowReportDeps): Promise<LabWorkflowReportResult> {
  if (!(await checkReportView(p.id, deps.enforce)).allowed) return { ok: false, error: 'NOT_PERMITTED' };
  try {
    const events = EVENT_REPORTS.includes(p.id) ? await deps.loadEvents(p.range) : [];
    if (events === null) return { ok: false, error: 'NOT_PERMITTED' };
    switch (p.id) {
      case 'turnaround':
      case 'statPerformance': {
        const cases = deps.withoutResearch(await deps.loadCases());
        return { ok: true, data: { id: p.id, rows: turnaroundReport(cases, events, { range: p.range, grouping: p.grouping ?? 'none', targets: p.targets, statOnly: p.id === 'statPerformance', caseTypeOf: deps.caseTypeOf }) } };
      }
      case 'stationVolume': {
        // Batch 732 (spec check of Decision 4): scans of research cases' items are left out, like every other report.
        const all = await deps.loadCases();
        const kept = new Set(deps.withoutResearch(all).map(c => c.id));
        const research = new Set(all.filter(c => !kept.has(c.id)).map(c => c.accession?.fullAccession ?? c.accession?.accessionNumber ?? c.id));
        const clinical = events.filter(e => !e.caseAccession || !research.has(e.caseAccession));
        return { ok: true, data: { id: p.id, rows: stationVolume(clinical, { range: p.range, by: p.by ?? 'day', timeZone: p.timeZone }) } };
      }
      case 'addOns':
        return { ok: true, data: { id: p.id, rows: addOnReport(deps.withoutResearch(await deps.loadCases()), { range: p.range }) } };
      case 'rework':
        return { ok: true, data: { id: p.id, rows: reworkReport(deps.withoutResearch(await deps.loadCases()), { range: p.range }) } };
      case 'reconciliation':
        return { ok: true, data: { id: p.id, rows: reconciliationReport(await deps.loadBatches(), { range: p.range }) } };
      case 'batchDuration':
        return { ok: true, data: { id: p.id, rows: batchDurationReport(await deps.loadBatches(), { range: p.range, stainingTargetMinutes: p.stainingTargetMinutes }) } };
    }
  } catch (e) {
    console.error('[labWorkflowReports] The report could not be built:', e);
    return { ok: false, error: 'LOAD_FAILED' };
  }
  return { ok: false, error: 'LOAD_FAILED' };
}
