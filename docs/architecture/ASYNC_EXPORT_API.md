# Asynchronous exports: request it, get notified, download it (PS-539 phase 2c)

**Decision D7** (Pete, Oct 13, 2026; `DEPLOYMENT_READINESS_REVIEW.md` §13): large QA, audit and disposal exports would time out as one download, so every export becomes a job: the user asks for it, is told when it is ready, and downloads it.

**Pete's check before it is relied on:** a large mock export runs as a job, and the user gets a notification and a secure download link when it finishes (§9, test 1).

**Source of truth for the wire contract:** `src/services/exports/asyncExportContract.ts` (types, export kinds, limits, status rules). This document explains it; where they differ, the TypeScript file wins and this document is corrected.

## 1. What exists today

- Every export is built in the browser from what the screen has loaded, and downloaded at once (`src/utils/csv.ts`).
- Each export of case, audit or QA data has its own capability (Pete: one per report), checked before any file is made: the Audit Log's five logs, case search and My Contributions in `src/services/printing/exportGate.ts`; the QA reports in `src/services/qualityAssurance/qaExport.ts`; disposal in `src/services/retentionPolicy/exportDisposalReport.ts`; a case's change history in `src/services/reportChangeLog/exportChangeLog.ts`.
- Configuration exports (dictionaries, crosswalks, the physician list) have no capability of their own: they sit behind their Configuration section and are only audited (`recordExport`, `exportGate.ts`). They are small and stay in the browser; this contract doesn't cover them.
- These exports are audited as `DOCUMENT_EXPORTED` with their row count (`src/services/printing/documentOutputAudit.ts`), including the disposal report since Batch 543 (it wrote none before: finding F9). On the server, every export kind is audited (§4).
- Case search export stops at 5,000 rows and says so (`CASE_SEARCH_API.md`).

With the API server, the browser no longer holds the whole data set, so it can't build these files. The server builds them, as jobs on the bus (`MESSAGE_BUS_API.md`, job kind `export.build`).

## 2. Export kinds

There are 29, one per export capability (`EXPORT_KINDS`). A kind is named after its capability: `qa:deficiencies:export` → `qa.deficiencies`. The guard test `phase2cContracts.guard.test.ts` fails if a capability ending in `:export` is added to the catalog without a kind here.

How each is scoped (`ExportScope`), as it is checked today:
- **facility:** the QA reports and the disposal report. The request names one facility or "all" (which needs an assignment covering every facility). Pete, Oct 13, 2026: QA exports can be for a single facility rather than always "all facilities". Since Batch 544 every QA report with rows that belong to a facility has the scope picker: follow-up, FPPE (facilities only, as an FPPE assignment has a facility but no case), inspection evidence, the activity dashboard, deficiencies and billing deficiencies joined the six tabs that had it. Someone assigned to exactly one facility opens on it. Choosing an organisation filters the rows by organisation, but the export is still checked as "all facilities" (`qaScopeContext`, `src/services/qualityAssurance/qaExport.ts`). The rows are chosen by the case's origin hospital (the legacy map in `organisationService.ts`), and the facility tree doesn't agree with it on which facilities belong to an organisation. Checking against the tree could pass rows from facilities the person isn't assigned to. This waits for the Organisation-to-Facility migration (PS-610; tried and taken out in Batch 549). For a facility scope, a row is placed by its own facility, or by its case's ordering facility. A row whose facility can't be told appears only in the "all" export (`src/services/qualityAssurance/qaScopeRows.ts`). Three stay "all", with reasons:
  - **the enterprise rollup**, which compares facilities with each other;
  - **management reviews**: one review is a lab-wide meeting over closed items from several facilities;
  - **patient match review**, which is chosen by organisation (its own selector), not by facility.
- **enterprise:** the Audit Log's five logs and case search. They're checked without a facility today. Rows are still filtered by what the requester may see (the case privacy filter, `CASE_PRIVACY_MODEL.md`).
- **case:** a case's report change history.
- **self:** the two My Contributions files (the requester's own cases).

## 2a. What the browser sends as `parameters` (Batch 550)

Since Batch 550 every export button sends its screen's filters. The server re-runs the screen's query from them. The shapes below are what the browser sends today; the API (phase 2e) may type them per kind, and this table is then corrected.

| Kinds | `parameters` |
|---|---|
| The QA tabs with a scope picker | `{ scope }` (a `QaScope`), plus the tab's own filter: `filter` (follow-up), `windowMonths` (inspection evidence), `registryId` (registry transmission audit, cytology), `queue: 'open' \| 'escalated' \| 'closed'` (deficiencies), `status: 'open' \| 'resolved'` (billing deficiencies) |
| `qa.enterprise-rollup`, `qa.management-reviews` | `{}` (always all facilities) |
| `qa.patient-match-review` | `{ organisationId }` |
| `qa.registry-transmission-audit` (Registry Exceptions) | `{ queue: 'all' \| 'cytology' \| 'cancer' }` |
| `audit.audit-log`, `audit.qa-log` | the log's filters, with `dateRange` (`today`, `7days`, `30days`, `90days`, `custom` with `dateFrom`/`dateTo`) and the facility's `timeZone` |
| `audit.error-log`, `audit.interface-log` | `{ severity?, status, search }` |
| `audit.billing-log` | the Billing Log's search fields, typed (case number, patient name and id, the date ranges, type, status, staff, pathologists, `facilityIds`, detail) |
| `search.case-results` | `{ criteria: CaseSearchCriteria, sort, timeZone }` (`CASE_SEARCH_API.md`) |
| `search.case-report` | `{ criteria: CaseSearchCriteria, timeZone, groupBy: ReportGroupBy, columns: ReportColumn[] }` (`CASE_SEARCH_API.md`, Reports) |
| `contribution.*` | `{}` (the requester's own cases) |
| `report.change-history` | `{ caseId }` |
| `retention.disposal-report` | `{ facilityId, materialType, dateFrom, dateTo }` |
| `retention.holds-queue` | `{ text }` (the screen's search text; every active retention hold otherwise) |

`facilityId` is sent beside `parameters` for a facility-scoped kind: the one facility the export is checked for, or `all`.

## 3. Endpoints

| Call | Capability | What it does |
|---|---|---|
| `POST /api/exports` (`ExportRequest`) | the kind's capability, for its scope | Checks the capability, the parameters and the limits, stores the request, enqueues `export.build`, and answers **202** with the `ExportJob` (status `queued`). |
| `GET /api/exports/{exportId}` | the requester only | The job's status (`ExportJob`). |
| `GET /api/exports?status=…` | the requester only | The requester's exports, newest first, for a "My exports" list. |
| `POST /api/exports/{exportId}/download` | the requester, **and the kind's capability checked again** | Answers with a download link valid for 15 minutes (`EXPORT_LIMITS.downloadLinkMinutes`): a short-lived signed blob URL, or the API streaming the file. Each call is audited. |
| `POST /api/exports/{exportId}/cancel` | the requester | Cancels a queued export at once; a running one is asked to stop (cooperative cancellation, `MESSAGE_BUS_API.md` §4), stops within a page, and its partial file is deleted. |

**Responses (Batch 550, what the browser relies on):**
- A refusal or failure answers with an `ExportErrorBody` (`{ code, message?, matchedRows? }`) and one of these statuses:
  - 400 or 422 for `INVALID_PARAMETERS`, or 422 for `TOO_MANY_ROWS` with `matchedRows`;
  - 401 when the session has ended;
  - 403 for `NOT_PERMITTED` (another user's export also answers 403 or 404, never its data);
  - 404 for an unknown or deleted export;
  - 409 or 429 for `TOO_MANY_OPEN`.

  The body's code wins over the status (`exportApiError`, `src/services/exports/httpExportApi.ts`).
- `download` answers with an `ExportDownloadLink`: `{ url, expiresAt, filename }`.
  - The `url` must work without the Authorization header, because the browser opens it as a plain download. It is a signed blob URL, or an API URL carrying a single-use token.
  - A path is taken as relative to the API server.
  - The browser follows only `https://` (plain http only to this computer in development), and never a link with a user name or password in it (`src/utils/downloadFromUrl.ts`).

**Refusals** use `ExportErrorCode`:
- `NOT_PERMITTED`: the capability is missing, or was removed before the download.
- `TOO_MANY_ROWS`: more than 1,000,000 rows matched; the response says how many.
- `TOO_MANY_OPEN`: the user already has 3 exports queued or running.
- `INVALID_PARAMETERS`.

No other user can see or download someone's export, Superadmin included.

## 4. The job

1. **Snapshot.** The build reads the data with snapshot isolation as of its start, using the same queries and access filters as the screen's API: the case search criteria (`CASE_SEARCH_API.md`), the QA scope, the audit log filters. Every row in the file is one the requester could see on that screen.
2. **Streaming.** It writes the file in pages straight to blob storage, never the whole set in memory. CSV is UTF-8 with a byte-order mark (as `downloadCsv` does today), the screen's own columns, and dates in ISO 8601.
3. **Formula injection.** A text cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return is prefixed with an apostrophe, so a spreadsheet never runs it as a formula (OWASP "CSV injection"). Numeric cells are written as numbers and left alone, so a negative number stays a number. The browser's CSV writer does the same since Batch 543 (finding F8, `src/utils/csv.ts`).
4. **Finish.** It records the row count, byte length and SHA-256 of the file, and sets `ready`, with `expiresAt` = finish + 7 days (`exportExpiresAt`; a lab can set 1 to 30).
5. **Audit.** `DOCUMENT_EXPORTED` is written when the file is ready, with the kind, row count and requester, and no patient data in `detail`. Each download writes another entry.
6. **Limits.** A build is stopped after 30 minutes (`TIMED_OUT`), which is longer than a serverless function may run, so `export.build` runs on an always-on worker. It has 2 attempts, and the status stays `running` between them; a second failure fails the export with its error code, and the user is notified.
7. **Expiry.** A recurring job deletes expired files and sets `expired`. The record of the export (who, what, when, row count, hash) is kept with the audit log's retention.

Statuses move only as `EXPORT_TRANSITIONS` allows:
- `queued` → `running` | `cancelled` | `failed`
- `running` → `ready` | `failed` | `cancelled`
- `ready` → `expired`

## 5. Telling the user (click economy, CLAUDE.md rule 8)

- **A quick export needs no extra click.** After `POST`, the browser waits up to 3 s (`EXPORT_LIMITS.inlineWaitMs`) for `ready` and then downloads straight away, as the export button does today.
- **A long export never blocks the screen.** After 3 s the button shows "Preparing… we'll tell you when it's ready", and the user carries on working.
- **When it finishes,** the server sends `ExportStatus` (`ExportStatusEvent`, with the contract version `v`) to the requester on the live-updates hub with `Clients.User(userId)`, the same way as `PrintJobStatus` (`LIVE_UPDATES_SIGNALR.md` §10; the hub method is added there, §13). The browser shows an inline notice with a **Download** link, and the export is in **My exports**. A failure says why, in the user's language.
- **Correction (Batch 550):** this said "the bell". PathScribe has no notification bell; My exports is reached from the notice and from a **My exports** button in the top bar (shown only with the API server), whose badge counts exports ready to download.
- **As built (Batch 550, `src/services/exports/exportTracker.ts`):**
  - After the request, the browser asks for the status every 0.5 s.
  - **Within 3 s:** if the export is ready, it downloads with no notice.
  - **From 1 s:** a "preparing" notice shows, so a click never looks ignored.
  - **After 3 s,** the notice stays, and the hub's `ExportStatus` (or a re-read every 15 s, in case a message was missed or there is no hub) turns it into **Download**.
  - A second click on the same export while the first is being requested sends nothing new.
  - A notice never goes back from ready to preparing.
  - **Signing out** forgets every notice and stops listening (`src/services/auth/sessionEndHooks.ts`), so the next person at a shared workstation sees none of them.
- **Email** (optional, per user): "Your export is ready", with no patient data and no link, so the file is still fetched only by a signed-in user.

## 6. Storage

- **Where:** blob storage, an `exports` container per tenant, encrypted at rest, private (no public access), and no versioning (an export is replaced by a new export, never edited).
- **Retention:** 7 days by default and 30 at most. Exports are working copies, not records; the record of each export is in the audit log.
- **Download links:** signed, read-only, HTTPS only, for one blob, valid for 15 minutes, issued only after the capability is checked again. On Azure, a user-delegation SAS (signed with Entra ID, not the account key). The link sets `Content-Disposition: attachment` with the file name (the SAS `rscd` parameter; the `download` attribute is ignored across origins). On-site or private-cloud installs without signed URLs stream the file through the API instead.
- **Data residency:** the container sits in the tenant's region (decision D5).

## 7. Browser changes (phase 2d)

**Done in Batch 550:**
- **The export service.**
  - One export service in the browser (`exportService` in `@/services`; `src/services/exports/exportTracker.ts`, `httpExportApi.ts`, `runExport.ts`) posts the request and handles the 3-second wait, the notice and the download.
  - Every export button calls it with its kind, the screen's filters (§2a) and the facility: the QA tabs through `exportQaReportRows` / `runQaExport`, the others through `runExport`.
  - `exportRouting.guard.test.ts` checks that every export kind has a button that calls it this way, and that every browser export a screen starts sits inside `runExport`.
  - The capability buttons stay as they are.
- **The notice:** `src/components/Exports/ExportNotices.tsx`, in the bottom-left feedback column beside the print jobs.
- **My exports** (status, rows, requested, deleted after, Download or Cancel): `src/pages/MyExportsPage.tsx`, at `/my-exports`.
  - It is reached from the notice and the top bar.
  - It is an open route, because it lists only the requester's own exports and each download checks the capability again on the server.
- **The hub event:** `ExportStatus`, through `liveUpdateService.subscribeExports`.
- **With no API server configured (the demo):** exports work as before, in the browser, and My exports says so.

## 8. Retention and privacy

- Exports carry PHI (accessions, names), so they are downloadable only by the requester, for as long as the requester still holds the capability, and are deleted after the retention period.
- Export metadata must not contain patient names. The browser builds the title from the screen and date, as today's file names do.
- **Correction (Batch 550): `parameters` can contain patient data.** The screen's filters are sent so the server can rebuild what the user saw, and a filter can hold patient data:
  - Case Search's patient name, MRN or date of birth;
  - the Billing Log's patient name;
  - an Audit Log search typed as a name.

  So export data is in two parts:
  - **Listable metadata:** `kind`, `title`, `facilityId`, status, counts and times. It never holds patient data, and is what `GET /api/exports` returns, what the audit log records and what the record of the export keeps.
  - **`parameters`:** treated as PHI.
    - Encrypted at rest with the export.
    - Never returned by `GET` or the list.
    - Never written to logs or to the audit `detail`.
    - Deleted with the file when it expires.
    - The record of the export keeps only their SHA-256, so an inspector can match a file to its request without the filter text.

## 9. Acceptance tests (Pete's D7 check first)

1. **Large export (Pete's check).** On a mock data set of 250,000 audit rows, `POST` returns 202 within 1 s. The job runs, and `ExportStatus` reaches the requester's open windows within 2 s of `ready`. The download link works, expires after 15 minutes, and the file's SHA-256 matches the job's. Peak memory on the API host stays flat (streaming).
2. A quick export (under 3 s) downloads with no notice and no extra click.
3. Another user, including Superadmin, gets 403 on status and download.
4. Remove the capability after `ready`: download is refused (`NOT_PERMITTED`).
5. 1,000,001 matching rows: refused at request with the count. A fourth open export: `TOO_MANY_OPEN`.
6. A cell `=HYPERLINK(...)` is written as `'=HYPERLINK(...)`.
7. After 7 days the file is gone, the status is `expired`, and the audit entries remain.
8. Every capability ending in `:export` has an export kind (the guard test).

## 10. Status

| Part | Status |
|---|---|
| This contract and `asyncExportContract.ts` | **Written, Batch 542** |
| Server endpoints, the `export.build` job, blob storage and the hub event | **Planned** (India team, phase 2e) |
| Browser export service, notice and My exports | **Done, Batch 550** (in use once the API server's endpoints exist; the demo builds exports in the browser) |
| `parameters` typed per kind by the API | **Planned** (phase 2e; §2a lists what the browser sends today) |
| Formula-injection protection in the browser's CSV writer (F8) | **Fixed, Batch 543** |
