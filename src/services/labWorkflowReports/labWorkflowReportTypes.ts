// src/services/labWorkflowReports/labWorkflowReportTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730 (Lab Workflow & Batch spec §9, §9.3 item 5): the built-in lab
// workflow reports, for labs with or without Power BI. Built from the station
// scan events (§7.1), the cases and the batches. Only an item's own scans count
// (§10.3): a carrier-wide event never counts as an item reaching a step.
// Carrier-less items are included (§10.1). Research cases are left out (Decision 4).
// No names or MRNs in any row; accession numbers appear only in the exception
// rows, where someone has to find the case.
// ─────────────────────────────────────────────────────────────────────────────

export const LAB_WORKFLOW_REPORT_IDS = ['turnaround', 'stationVolume', 'statPerformance', 'addOns', 'rework', 'reconciliation', 'batchDuration'] as const;
export type LabWorkflowReportId = typeof LAB_WORKFLOW_REPORT_IDS[number];

/** The capability each report needs to view (one per report, PS-355). */
export const LAB_WORKFLOW_REPORT_CAPABILITY: Readonly<Record<LabWorkflowReportId, string>> = {
  turnaround: 'report:workflow-turnaround:view',
  stationVolume: 'report:station-volume:view',
  statPerformance: 'report:stat-performance:view',
  addOns: 'report:add-on-volume:view',
  rework: 'report:recut-rework:view',
  reconciliation: 'report:reconciliation-exceptions:view',
  batchDuration: 'report:batch-duration:view',
};

/** The capability each report needs to export (one per report). */
export const LAB_WORKFLOW_EXPORT_CAPABILITY: Readonly<Record<LabWorkflowReportId, string>> = {
  turnaround: 'report:workflow-turnaround:export',
  stationVolume: 'report:station-volume:export',
  statPerformance: 'report:stat-performance:export',
  addOns: 'report:add-on-volume:export',
  rework: 'report:recut-rework:export',
  reconciliation: 'report:reconciliation-exceptions:export',
  batchDuration: 'report:batch-duration:export',
};

/** The milestones of a case, in order; turnaround is counted from accessioning to each. */
export const TAT_STEPS = ['gross', 'embed', 'cut', 'stain', 'distribute', 'signOut'] as const;
export type TatStep = typeof TAT_STEPS[number];

/** Default targets in hours from accessioning; a lab sets its own on the screen. */
export const DEFAULT_TAT_TARGET_HOURS: Readonly<Record<TatStep, number>> = { gross: 24, embed: 36, cut: 48, stain: 54, distribute: 60, signOut: 72 };

export type TatGrouping = 'none' | 'caseType' | 'priority' | 'facility';

export interface ReportRange {
  /** Inclusive ISO start. */
  from: string;
  /** Exclusive ISO end. */
  to: string;
}

export interface TatRow {
  /** The group's value: a case type, priority or facility id; '' when not grouped. */
  group: string;
  step: TatStep;
  /** Cases that reached the step. */
  cases: number;
  medianHours: number | null;
  /** 90th percentile. */
  p90Hours: number | null;
  targetHours: number;
  late: number;
  /** Late as a percentage of `cases`, one decimal. */
  latePct: number | null;
}

export interface VolumeRow {
  /** 'YYYY-MM-DD' for a day, 'YYYY-Www' (ISO week) for a week. */
  period: string;
  stationName: string;
  stage: string;
  /** Distinct items scanned. */
  items: number;
  /** Own scans (a carrier-wide event is not a scan of the item). */
  scans: number;
}

export interface AddOnRow { type: string; ordered: number; cut: number; medianMinutesToCut: number | null; stat: number }

export interface ReworkRow { measure: 'slidesCut' | 'recutOrders' | 'recutRatePct' | 'slideReprints' | 'cassetteReprints' | 'reworkRatePct'; value: number }

/** Batch 736: `reasonCode` is the override's bench reason code (Reason Dictionary id), so counts survive a lab rewording it. */
export interface ReconciliationRow { kind: 'missing' | 'unexpected' | 'override'; carrier: string; item: string; caseAccession: string; at: string; stationName: string; by: string; reason: string; reasonCode: string }

export interface BatchDurationRow { node: string; carrier: string; startedAt: string; finishedAt: string; minutes: number; targetMinutes: number | null; overTarget: boolean | null }
