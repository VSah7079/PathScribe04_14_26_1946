// src/services/labWorkflowReports/runLabWorkflowExport.ts
// Batch 730: every lab workflow report export goes through the one export service (Batch 550): with the API server
// the server builds the file from the parameters; in the demo `build` makes it here. One export kind per report.
import { runExport } from '../exports/runExport';
import type { LabWorkflowReportId } from './labWorkflowReportTypes';

export function runLabWorkflowExport(id: LabWorkflowReportId, filename: string, parameters: Record<string, unknown>, build: () => Promise<unknown>) {
  switch (id) {
    case 'turnaround': return runExport('report.workflow-turnaround', filename, parameters, build);
    case 'stationVolume': return runExport('report.station-volume', filename, parameters, build);
    case 'statPerformance': return runExport('report.stat-performance', filename, parameters, build);
    case 'addOns': return runExport('report.add-on-volume', filename, parameters, build);
    case 'rework': return runExport('report.recut-rework', filename, parameters, build);
    case 'reconciliation': return runExport('report.reconciliation-exceptions', filename, parameters, build);
    case 'batchDuration': return runExport('report.batch-duration', filename, parameters, build);
  }
}
