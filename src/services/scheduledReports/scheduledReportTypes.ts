// src/services/scheduledReports/scheduledReportTypes.ts
// ─────────────────────────────────────────────────
// Batch 613: scheduling a saved case-search report. The browser sets the schedule up; the API
// server runs it (docs/architecture/SCHEDULED_REPORTS_API.md). In this build a run is Simulated:
// the report is built here and its counts kept, nothing is mailed.
// ─────────────────────────────────────────────────
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export const SCHEDULE_FREQUENCIES: readonly ScheduleFrequency[] = ['daily', 'weekly', 'monthly'];

export const MAX_SCHEDULE_RECIPIENTS = 20;
export const MAX_SCHEDULES_PER_USER = 25;
export const MAX_LOOKBACK_DAYS = 366;

/**
 * What happens for a recipient who cannot see every case in the report as its owner sees it
 * (Pete, Oct 18, 2026: PathScribe never quietly decides what a recipient sees; the person who
 * sets the schedule up chooses, recipient by recipient).
 *  narrow: the recipient's file holds only the cases they may see (the default, pre-selected).
 *  skip:   nothing is built or sent for that recipient.
 */
export type RecipientAccessChoice = 'narrow' | 'skip';
export const RECIPIENT_ACCESS_CHOICES: readonly RecipientAccessChoice[] = ['narrow', 'skip'];
export const DEFAULT_RECIPIENT_ACCESS_CHOICE: RecipientAccessChoice = 'narrow';

/** What a run did for one recipient. */
export type RecipientAccessOutcome = 'full' | 'narrowed' | 'skipped';

/** Whether a recipient can see the whole report, worked out when the schedule is set up. Counts only. */
export interface RecipientAssessment {
  userId: string;
  seesAll: boolean;
  /** Cases in the report (as its owner sees it) that this recipient may see. */
  visibleCount: number;
  /** Cases in the report as its owner sees it. */
  totalCount: number;
}

/** What a run did for one recipient: no names, no case data. */
export interface RecipientRunOutcome {
  userId: string;
  outcome: RecipientAccessOutcome;
  /** Cases in this recipient's file (0 when skipped). */
  caseCount: number;
}

/** What a person sets up. */
export interface ScheduledReportDraft {
  /** The saved report definition this runs. */
  savedReportId: string;
  frequency: ScheduleFrequency;
  /** 0 (Sunday) to 6; used when weekly. */
  dayOfWeek: number;
  /** 1 to 28; used when monthly. */
  dayOfMonth: number;
  /** 24-hour "HH:MM", in `timeZone`. */
  timeOfDay: string;
  /** IANA zone the time is in (the facility's zone). */
  timeZone: string;
  /**
   * Each run covers the last N complete days (ending yesterday, in `timeZone`) instead of the saved report's own
   * dates, so a monthly report is always about the month just gone. Null: the saved dates.
   */
  lookbackDays: number | null;
  /** Users who receive the CSV. */
  recipientUserIds: string[];
  /**
   * For a recipient who cannot see every case in the report: narrow it to what they may see, or skip them.
   * A recipient with no entry is narrowed. The server follows this and records what it did; it never decides.
   */
  recipientChoices?: Record<string, RecipientAccessChoice>;
}

export type ScheduledRunStatus = 'simulated' | 'failed';

/** The last time the schedule ran. */
export interface ScheduledRunRecord {
  ranAt: string;
  status: ScheduledRunStatus;
  /** Always true in this build; carried so no screen can drop the label. */
  simulated: true;
  groupCount: number;
  rowCount: number;
  total: number;
  /** Recipients a file was built for (those not skipped). */
  recipientCount: number;
  /** What happened for each recipient, so the run record says who got the whole report, a narrowed one, or none. */
  recipients?: RecipientRunOutcome[];
  /** Literal English, PHI-free; set when failed. */
  message: string;
}

export interface ScheduledReport extends ScheduledReportDraft {
  id: string;
  ownerId: string;
  ownerName: string;
  /** The saved report's name when the schedule was last saved. */
  savedReportName: string;
  active: boolean;
  createdAt: string;
  nextRunAt: string | null;
  lastRun?: ScheduledRunRecord;
}

export type ScheduledReportError =
  | 'NOT_SIGNED_IN' | 'REPORT_REQUIRED' | 'REPORT_NOT_FOUND' | 'NO_RECIPIENTS' | 'TOO_MANY_RECIPIENTS' | 'BAD_TIME' | 'BAD_DAY'
  | 'BAD_FREQUENCY' | 'BAD_LOOKBACK' | 'BAD_TIME_ZONE' | 'BAD_RECIPIENT_CHOICE' | 'TOO_MANY_SCHEDULES' | 'SCHEDULE_NOT_FOUND' | 'RUN_FAILED';
