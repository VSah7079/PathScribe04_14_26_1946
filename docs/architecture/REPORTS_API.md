# Reports: server contract (Batch 616, PS-483)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

The calls the browser makes for amendments, informal reviews, LIS amendment notices, the release buffer, the report part library and the report-side outbound queues. Written from the server versions in `src/services/reports/`, `reportRelease/`, `reportParts/` and `reportChangeLog/`, built to `HTTP_SERVICES_PATTERN.md`. The demonstration build uses the browser mocks; a build with an API server address uses these calls.

**Conventions.** A list reply is `{ "items": [...] }`; one record is the record itself. The server decides permission on every call (`403` → `NOT_PERMITTED`); the browser hides buttons but never replaces that check (`AUTHORIZATION_API.md`). A missing record is `404` → `NOT_FOUND`. Failure bodies carry no patient text and the browser ignores any message text. Report text, amendment explanations and field-level before/after values are PHI: the server stores them with the case and the browser keeps nothing in localStorage.

## 1. Amendments (`IAmendmentService`)

| Call | Body | Reply |
|---|---|---|
| `GET /api/cases/{caseId}/amendments` | | `{ items: AmendmentRecord[] }` |
| `GET /api/reports/amendment/get-all` | | `{ items }` (the caller sees only amendments on cases they may open) |
| `GET /api/reports/amendment/get-open-drafts-for-pathologist` | | `{ items }` the user's open drafts |
| `POST /api/reports/amendment/start-draft` | `{ caseId, type, authoringPathologist, triggeredByLisNotice?, reportInstanceId?, specimenId? }` | the new draft |
| `POST /api/reports/amendment/change-draft-type` | `{ type }` | the draft |
| `POST /api/reports/amendment/capture-fields` | `{ explanationOfChange, notification?, originalReportSnapshot, reasonId }` | the draft |
| `POST /api/reports/amendment/release` | `{ addendumTitle?, explanationOfChange?, notification?, body, reasonId? }` | the released amendment; the server writes the audit entry and queues the outbound result |
| `POST /api/reports/amendment/reopen` | `{ userId, userName }` | the draft |

## 2. Informal reviews and LIS amendment notices

| Call | Body | Reply |
|---|---|---|
| `GET /api/reports/informal-review/get-pending-for-reviewer` | | `{ items }` requests waiting on this reviewer |
| `GET /api/reports/informal-review/get-sent-by-requester` | | `{ items }` |
| `GET /api/reports/informal-review/get-all-for-user` | | `{ items }` both directions |
| `GET /api/reports/informal-review/get-for-case` | | `{ items }` |
| `POST /api/informal-reviews` | the new request | the request |
| `POST /api/reports/informal-review/publish` | `{ noteId }` | the request |
| `POST /api/reports/informal-review/mark-seen-by-requester` | | the request |
| `GET /api/reports/amendment/get-by-case-id` | | `{ items }` |
| `GET /api/reports/lis-amendment-notice/get-pending-for-pathologist?status=pending` | | `{ items }` |
| `POST /api/reports/informal-review/create` | the notice (no id, status or received time) | the notice |
| `POST /api/reports/lis-amendment-notice/update-status` | `{ status }` | the notice |

## 3. Release buffer (`IReportReleaseService`)

The server owns the clock. It releases at expiry whether or not a browser is open; the browser's `checkAndReleaseIfExpired` only asks it to look now.

| Call | Body | Reply |
|---|---|---|
| `POST /api/report-release/report-release/resolve-buffer-for-case` | `{ order, originHospitalId }` | `{ applies, durationMinutes, bypassReason? }`. Never defaults: if the server cannot answer, the call throws a code and the sign-out step shows it. |
| `GET /api/report-release/report-release/get-org-default` | | `ReportReleaseOrgConfig` |
| `POST /api/report-release/report-release/set-org-default` | the config | `204` or the config |
| `POST /api/report-release/report-release/start-buffer` | `{ previousStatus, durationMinutes, performedBy }` | `{ releaseBufferExpiresAt }`. A refusal comes back to the screen as `{ ok: false, reason: <code> }`. |
| `POST /api/report-release/report-release/recall` | `{ performedBy }` | `204`. Refusal as above (`CONFLICT` when already released). |
| `POST /api/report-release/report-release/check-and-release-if-expired` | | `{ released: boolean }` |

## 4. Report change log

`REPORT_CHANGE_LOG_API.md` is the contract: `GET /api/report-change-log/report-change-log/list-for-case` lists, `POST /api/cases/{caseId}/change-log` records an entry (`{ at, userId, userName, stationId, changes[] }`; the server assigns the id). The log is append-only.

## 5. Outbound queues (report side)

The server owns dispatch, retry timing and the limit on retries; the browser lists entries and shows the failed ones. The same six calls as every outbound queue (`apiServer/outboundQueueRoutes.ts`):

| Call | Reply |
|---|---|
| `GET /api/outbound/lis-sync` and `/api/outbound/results` | `{ items }` |
| `GET .../failed` | `{ items }` |
| `POST {base}` (enqueue) | the entry (`status` queued, `retryCount` 0) |
| `POST {base}/{id}/failed` `{ errorCode, errorMessage, maxRetriesExceeded }` | the entry. `errorMessage` is technical text and carries no patient text. |
| `POST {base}/{id}/retry` | the entry |
| `POST {base}/{id}/sent` | the entry |
| `GET /api/cases/{caseId}/outbound/lis-sync` and `/outbound/results` | `{ items }` |
| `GET /api/reports/outbound-result-queue/get-by-instance-and-state?instanceId=&resultState=` | `{ items }` |
| `POST /api/reports/outbound-result-queue/record-pdf-sha256` `{ sha256 }` | the entry |

## 6. Report part library (`IReportPartService`)

| Call | Body | Reply |
|---|---|---|
| `GET /api/report-parts?partType=&specialty=&status=&search=` | | `{ items }` |
| `GET /api/report-parts?ids=a&ids=b` | | `{ items }` |
| `GET /api/report-parts/report-part/get-by-id` | | the part |
| `POST /api/report-parts/report-part/create` | partial part or `{}` | the new part (draft) |
| `PUT /api/report-parts/{id}` | the part | the part |
| `POST /api/report-parts/report-part/publish`, `/archive` | | the part |
| `POST /api/report-parts/report-part/clone` | `{ newName }` | the copy |
| `POST /api/report-parts/report-part/remove` | | `204` |

Writing to the library is a configuration change: the server requires the configuration capability (`403` otherwise). After a change that worked the browser fires its "parts changed" event so open library tabs refresh.

## 7. Not in this contract

- **Report versions and signed PDFs:** `httpReportVersionService.ts` (Batch 558).
- **Report documents:** `REPORT_DOCUMENT_STORE_API.md`; **report delivery:** `REPORT_DELIVERY_API.md`; **rendering:** `REPORT_RENDERING_SERVICE.md`.
- **Follow-up tracking:** `FOLLOW_UP_API.md`. The browser keeps follow-ups in a store (`IFollowUpStore`) that saves whole records, while the contract is command-based (the server computes the window and status). The two are not the same shape, so the follow-up server version waits for a decision on which one wins; it is not built.
- **Sign-out and synoptic answers:** these travel with the case save (`CASE_API.md`), not a service of their own. Synoptic models and protocols are PS-511.

## IHeldReleaseService (Batch 672)

`/api/report-release/held-release`. Service: `services/reportRelease/httpHeldReleaseService.ts`; chosen in `heldReleaseServiceInstance.ts`. The server also releases held reports itself when they fall due (RELEASE_SWEEP_SERVER_JOB.md).

| Method | Call | Arguments |
|---|---|---|
| `add` | `POST /api/report-release/held-release/add` | `held` (the body) |
| `getAll` | `GET /api/report-release/held-release/get-all` | none |
| `getByCaseId` | `GET /api/report-release/held-release/get-by-case-id` | `caseId` (query) |
| `settle` | `POST /api/report-release/held-release/settle` | `id`, `status` (`released` or `recalled`), `at` (body fields). Answers `{ "settled": true }` only when this call moved a **held** release on; `{ "settled": false }` when it was already settled or unknown. Must be atomic: two settles at once, one wins. |

## IReportReleasedEventLogService (Batch 672)

`/api/reports/report-released-event-log`. Service: `services/reports/httpReportReleasedEventLogService.ts`; chosen in `reportReleasedEventLogServiceInstance.ts`. Append-only: there is no update or delete call.

| Method | Call | Arguments |
|---|---|---|
| `record` | `POST /api/reports/report-released-event-log/record` | `event` (the body). The server stamps `id` and `recordedAt` and returns the entry. |
| `getByCaseId` | `GET /api/reports/report-released-event-log/get-by-case-id` | `caseId` (query). Returns `{ "items": [...] }`, oldest first. |
