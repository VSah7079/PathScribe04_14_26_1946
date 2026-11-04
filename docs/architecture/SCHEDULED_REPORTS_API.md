# Scheduled reports: running a saved case-search report on a schedule (Batch 613)

**Status:** the browser side is complete and runs against a mock (`src/services/scheduledReports/`). The API server side is not built; this is its contract. In this build a run is **Simulated**: the report is built in the browser through the case search service, its counts are kept as the schedule's last run, and **nothing is sent**.

Related: `CASE_SEARCH_API.md` (reports and synoptic answers), `ASYNC_EXPORT_API.md` (export kind `search.case-report`), `AUTHORIZATION_API.md` (`search:report-schedule:manage`), `MESSAGE_BUS_API.md` (jobs).

## 1. What a person can do

On the Search page, under Report, **Schedules**: choose one of their saved reports, how often (daily, weekly on a day, monthly on a day 1 to 28), the time (in the facility's time zone), who receives it (users of the organisation, up to 20), and optionally to cover **the last N complete days** each run instead of the saved report's own dates (1 to 366). The file is a CSV, the same one the **Export report CSV** button makes. They can pause, resume, delete, and see each schedule's **last run** (when, cases matched, groups, rows). Up to 25 schedules per person.

## 2. The schedule

`ScheduledReport` (`scheduledReportTypes.ts`):

| Field | Meaning |
|---|---|
| `id`, `ownerId`, `ownerName`, `createdAt` | Set by the server. A schedule belongs to the person who made it and is private to them. |
| `savedReportId` | A saved report definition (`context: caseReport`) the owner holds. |
| `frequency`, `dayOfWeek` (0 = Sunday), `dayOfMonth` (1 to 28), `timeOfDay` ("HH:MM"), `timeZone` (IANA) | When it runs. The next run is computed in `timeZone`, so it follows clock changes (`scheduledReportRules.ts`: `nextRunAfter`). |
| `lookbackDays` | null: run the saved report as saved. N: replace its dates with the last N complete days ending yesterday in `timeZone` (`lookbackRange`). |
| `recipientUserIds` | Active users who receive the CSV. Unknown or inactive users are dropped; none left is refused (`NO_RECIPIENTS`). |
| `recipientChoices` | Per recipient, only where the owner chose `skip`; any other recipient is narrowed. The browser shows the owner, when setting up, which recipients cannot see every case (`assessRecipients`) and asks. Unknown values are refused (`BAD_RECIPIENT_CHOICE`). |
| `active`, `nextRunAt` | Paused schedules have no next run. |
| `lastRun` | `{ ranAt, status: simulated | failed (sent, in the real server), groupCount, rowCount, total, recipientCount, message, recipients: [{ userId, outcome: full | narrowed | skipped, caseCount }] }`. |

## 3. Endpoints

All need `search:report-schedule:manage` (reads need only a signed-in user and return the caller's own schedules). Refusal: 403, nothing changes.

| Endpoint | Does |
|---|---|
| `GET /api/report-schedules` | The caller's schedules. |
| `POST /api/report-schedules` | Create from a `ScheduledReportDraft`. Errors: `REPORT_REQUIRED`, `REPORT_NOT_FOUND`, `NO_RECIPIENTS`, `TOO_MANY_RECIPIENTS`, `BAD_TIME`, `BAD_DAY`, `BAD_FREQUENCY`, `BAD_LOOKBACK`, `BAD_TIME_ZONE`, `TOO_MANY_SCHEDULES`. |
| `PUT /api/report-schedules/{id}` | Replace the draft's fields. |
| `POST /api/report-schedules/{id}/pause`, `/resume` | Set `active`; resuming recomputes `nextRunAt`. |
| `DELETE /api/report-schedules/{id}` | Remove. |
| `POST /api/report-schedules/{id}/run` | Run now (the browser's "Run now"). Returns the schedule with its new `lastRun`. |

## 4. How the server runs a schedule

1. A scheduler job (message bus) wakes each minute and picks active schedules whose `nextRunAt` has passed; it moves `nextRunAt` on **before** running so a restart never runs one twice.
2. It runs the saved report **as the schedule's owner**: the owner's access rules apply, evaluated at run time (a person who has since lost access to a case no longer has it counted; a person who has lost `search:case-report:export` or been deactivated has their schedules paused, with `lastRun.status = failed` and a message).
3. It builds the CSV exactly as `search.case-report` does and sends it to each recipient. **Each recipient receives the file only if the recipient may see every case in it** (the owner's view is not the recipient's): otherwise the server does what the **owner chose for that recipient** when setting up the schedule: **narrow** (default; the recipient gets only the cases they may see) or **skip** (the recipient gets nothing). The server never decides this itself and never sends more than the recipient may see. The outcome for each recipient (`full`, `narrowed` or `skipped`, with the case count) is written to the run record. If the server cannot work out a recipient's access, the run fails with `RECIPIENT_ACCESS_UNKNOWN` and builds nothing.
4. The CSV is sent by the secure email path, never as a plain attachment of patient data (the server mail service, `TEMPLATE_NOTIFICATIONS_API.md`); a grouped report holds no patient names.
5. It writes the run record and the audit entries below.

## 5. Audit

Literal English, no patient data, no recipient names or addresses (`scheduledReportAudit.ts`): *Report Schedule Created / Changed / Paused / Resumed / Deleted* (report name, frequency, recipient count) and *Report Schedule Run / Failed* (cases matched, groups, rows, recipient count, and how many recipients were narrowed or skipped, as counts only). In this build the run entries say "Simulated: … Nothing was sent."

## 6. Acceptance tests

1. Next run is strictly after now, in the schedule's own time zone, across a daylight-saving change (`scheduledReports.test.ts`).
2. A schedule is private to its owner (list, pause, delete and run by someone else: `SCHEDULE_NOT_FOUND`).
3. A paused schedule never runs; resuming sets a next run.
4. A failed run is recorded and does not delete the schedule.
5. Audit entries hold no recipient identifiers.
6. A recipient never receives a case they may not see. With `narrow` the file holds only their cases; with `skip` they receive nothing, and the run record says which (`recipientAccess.test.ts`, `scheduledReports.test.ts`).
7. The owner's choice is stored with the schedule and followed on every run; a run never changes it.
