# services/scheduledReports/

**Batch 613: schedules for saved case-search reports.** The browser sets them up; the API server runs them (`docs/architecture/SCHEDULED_REPORTS_API.md`). **Here a run is Simulated**: the report is built through the case search service as the user, its counts are kept as the schedule's last run, and nothing is sent.

- **`scheduledReportTypes.ts`**: `ScheduledReport`, `ScheduledReportDraft` (frequency daily/weekly/monthly, day, time and IANA zone, optional last-N-days window, recipients as user ids, up to 20), the last-run record (always `simulated: true`), limits (25 schedules per person, 366 days).
- **`scheduledReportRules.ts`**: pure. Validation, `nextRunAfter` (computed in the schedule's own time zone, follows clock changes), `lookbackRange` (the last N complete days, ending yesterday), `isDue`.
- **`createScheduledReportService.ts`**: list, create, update, pause/resume, delete, run now, run what came due. Private to the owner (another person's id gives `SCHEDULE_NOT_FOUND`). A failed run is recorded and the schedule stays.
- **`mockScheduledReportService.ts`**: wired to browser storage (`pathscribe_scheduledReports`, cleared by Demo Reset), the audit log, saved reports and the case search service. Every change and run is checked against `search:report-schedule:manage` (`guardConfigWrites`).
- **`scheduledReportAudit.ts`**: audit text, literal English and PHI-free: report name, frequency, counts; never recipients.

Tests: `scheduledReports.test.ts`.

## Recipient access (Batch 613 follow-up)

When a recipient cannot see every case in a report, the **owner chooses, per recipient, to narrow (default) or skip** when setting up the schedule. PathScribe does not decide. `assessRecipients` tells the owner who is affected; `outcomeForRecipient` and `recipientAccess.ts` apply the stored choice; each run record lists `recipients` with `full`, `narrowed` or `skipped`. If access cannot be worked out the run fails (`RECIPIENT_ACCESS_UNKNOWN`) and builds nothing.

## Batch 617 (part C): server versions (PS-514)

The scheduled report service here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/SEARCH_REPORTING_API.md`. The mocks are unchanged.
