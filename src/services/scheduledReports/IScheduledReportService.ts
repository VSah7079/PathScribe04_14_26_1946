// src/services/scheduledReports/IScheduledReportService.ts
// Batch 613: schedules for saved case-search reports. Contract: docs/architecture/SCHEDULED_REPORTS_API.md.
import type { ServiceResult } from '../types';
import type { RecipientAssessment, ScheduledReport, ScheduledReportDraft } from './scheduledReportTypes';

export interface IScheduledReportService {
  /**
   * Which of these people cannot see every case in the saved report as its owner sees it, with counts only.
   * The screen shows it when recipients are picked, so the owner can choose to narrow or skip each of them.
   * Needs search:report-schedule:manage.
   */
  assessRecipients(savedReportId: string, recipientUserIds: string[]): Promise<ServiceResult<RecipientAssessment[]>>;
  /** The signed-in user's schedules. */
  list(): Promise<ServiceResult<ScheduledReport[]>>;
  /** Needs search:report-schedule:manage. */
  create(draft: ScheduledReportDraft): Promise<ServiceResult<ScheduledReport>>;
  update(id: string, draft: ScheduledReportDraft): Promise<ServiceResult<ScheduledReport>>;
  setActive(id: string, active: boolean): Promise<ServiceResult<ScheduledReport>>;
  remove(id: string): Promise<ServiceResult<void>>;
  /** Simulated: builds the report now and keeps its counts as the last run. Nothing is sent. */
  runNow(id: string): Promise<ServiceResult<ScheduledReport>>;
  /** Simulated: runs any of the user's schedules that came due while the app was closed. */
  runDue(): Promise<ServiceResult<ScheduledReport[]>>;
}
