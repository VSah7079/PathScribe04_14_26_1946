// src/services/authorization/labWorkflowReportCapabilities.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730 (Lab Workflow & Batch spec §9, §9.3 item 5): the built-in lab
// workflow reports, one capability to view each and one to export each (PS-355:
// no blanket flags). The reports read from the station scan log need
// station:scan-history:view as well (they expose its data, in totals).
// Checked in services/labWorkflowReports/. Kept in its own file so
// capabilityCatalog.ts stays under 1,000 lines (CLAUDE.md rule 10). Seeds:
// capabilitySeeds.ts (LAB_WORKFLOW_REPORTS), every role with Batch Management.
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityDefinition } from './capabilityCatalog';

export const LAB_WORKFLOW_REPORT_CAPABILITIES = [
  { key: 'report:workflow-turnaround:view',          labelId: 'reportWorkflowTurnaroundView',         group: 'qaOperations', risk: 'standard', requires: ['station:scan-history:view'] },
  { key: 'report:workflow-turnaround:export',        labelId: 'reportWorkflowTurnaroundExport',       group: 'qaOperations', risk: 'high', requires: ['report:workflow-turnaround:view'] },
  { key: 'report:station-volume:view',               labelId: 'reportStationVolumeView',              group: 'qaOperations', risk: 'standard', requires: ['station:scan-history:view'] },
  { key: 'report:station-volume:export',             labelId: 'reportStationVolumeExport',            group: 'qaOperations', risk: 'high', requires: ['report:station-volume:view'] },
  { key: 'report:stat-performance:view',             labelId: 'reportStatPerformanceView',            group: 'qaOperations', risk: 'standard', requires: ['station:scan-history:view'] },
  { key: 'report:stat-performance:export',           labelId: 'reportStatPerformanceExport',          group: 'qaOperations', risk: 'high', requires: ['report:stat-performance:view'] },
  { key: 'report:add-on-volume:view',                labelId: 'reportAddOnVolumeView',                group: 'qaOperations', risk: 'standard', requires: [] },
  { key: 'report:add-on-volume:export',              labelId: 'reportAddOnVolumeExport',              group: 'qaOperations', risk: 'high', requires: ['report:add-on-volume:view'] },
  { key: 'report:recut-rework:view',                 labelId: 'reportRecutReworkView',                group: 'qaOperations', risk: 'standard', requires: [] },
  { key: 'report:recut-rework:export',               labelId: 'reportRecutReworkExport',              group: 'qaOperations', risk: 'high', requires: ['report:recut-rework:view'] },
  { key: 'report:reconciliation-exceptions:view',    labelId: 'reportReconciliationExceptionsView',   group: 'qaOperations', risk: 'standard', requires: [] },
  { key: 'report:reconciliation-exceptions:export',  labelId: 'reportReconciliationExceptionsExport', group: 'qaOperations', risk: 'high', requires: ['report:reconciliation-exceptions:view'] },
  { key: 'report:batch-duration:view',               labelId: 'reportBatchDurationView',              group: 'qaOperations', risk: 'standard', requires: [] },
  { key: 'report:batch-duration:export',             labelId: 'reportBatchDurationExport',            group: 'qaOperations', risk: 'high', requires: ['report:batch-duration:view'] },
] as const satisfies readonly CapabilityDefinition[];
