// src/services/reports/IReportReleasedEventLogService.ts
// Batch 672: the interface of the report-released event log (the unified trail of every release,
// preliminary and final). It had no interface until now; the mock's methods are unchanged.
import type { ReportReleasedEvent } from './publishReportReleasedEvent';

export interface ReportReleasedEventLogEntry extends ReportReleasedEvent {
  id: string;
  recordedAt: string;
}

export interface IReportReleasedEventLogService {
  record(event: ReportReleasedEvent): Promise<ReportReleasedEventLogEntry>;
  /** Oldest first. */
  getByCaseId(caseId: string): Promise<ReportReleasedEventLogEntry[]>;
}
