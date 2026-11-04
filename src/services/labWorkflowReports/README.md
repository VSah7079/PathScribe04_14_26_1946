**Batch 736:** the Reconciliation exceptions report has a `reasonCode` column (an override's bench reason code), so counts by reason survive a lab rewording it.

# services/labWorkflowReports/

Batch 730 (Lab Workflow & Batch spec §9, §9.3 item 5): the built-in lab workflow reports, for laboratories with or without Power BI. Screen: Batch Management → **Workflow Reports** (`pages/BatchManagement/LabWorkflowReportsPage.tsx`).

## Files

- `labWorkflowReportTypes.ts`: report ids, the view and export capability of each, the turnaround steps and default targets, the row shapes.
- `turnaroundReport.ts` (pure): turnaround by step from accessioning (gross, embed, cut, stain, distribute, sign-out), median, 90th percentile, late against targets, grouped by case type, priority or facility; STAT performance is the same for STAT cases. A step is reached by the case's last item's own scan there (`stepOfEvent`); a carrier-wide event never counts (§10.3).
- `operationsReports.ts` (pure): volume per station per day or ISO week (own scans; carrier-less items count, §10.1), add-on orders by type with minutes to cut, recut and rework, reconciliation exceptions (from the batches), batch time at Decal and Staining against target (from the step history, §10.2).
- `labWorkflowReportService.ts`: `buildLabWorkflowReport(params, deps)`: the view check for the report (`checkReportView`, one literal capability per report), then the data, research cases left out (Decision 4). The event-based reports need `station:scan-history:view` through the scan log service.
- `labWorkflowReportDeps.ts`: the app's services behind it.
- `labWorkflowCsv.ts`: the columns of each report, records for the table, CSV rows, and `exportLabWorkflowReport` (the export check, `checkReportExport`, and an audit entry with the row count).
- `runLabWorkflowExport.ts`: each report's export kind through the one export service (`report.workflow-turnaround` …).
- `reportDates.ts`: the date range from calendar days in the lab's time zone.
- `labWorkflowReports.test.ts`.

## Honest scope

- Embed, cut, stain and distribute come from station scans: work at a computer with no station set, or before Batch 726, is not counted.
- Grossing and sign-out come from the case (`grossCompletedAt`, `finalizedAt`).
- Scheduled e-mail delivery of these reports is not built (the scheduled-report service runs saved case searches only).
- Staff-level productivity is out of scope (spec §9).

- Batch 732: the station-volume report also leaves out scans of research cases' items (Decision 4).
