# Critical result notification and alerts: the API server's calls (PS-514)

Batch 617 (part A). The server version of each service below, which the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test, chosen by `<name>ServiceInstance.ts`); the India team's API server honours this contract. The rules are `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**Convention (`HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, kebab-case.
- Reads are `GET` with plain arguments in the query string; a read whose arguments are objects, or that carries an accession number, a token, or anything that names a patient, is a `POST` with the arguments in the body (nothing identifying goes in a URL or an access log).
- `delete`, `remove`, `clear`, `revoke` are `DELETE` with the query string; `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. One object argument is the body; several arguments are sent as an object named by the argument names.
- A call that returns a list answers `{ "items": [...] }`; a call that returns one record answers the record; a call that returns a result answers the data, and a failure is the fixed code (`403` NOT_PERMITTED, `404` NOT_FOUND, `409` CONFLICT, `400` INVALID).
- A call that returns nothing answers `200` with an empty body. A call whose answer is never "nothing" (marked *throws*) raises on a failure instead of returning a quiet default.
- *Settled* calls (code import): the business outcome (`ok: false` with `code`, `problems`, `missing`) is a `200` reply holding the interface's own union; a failed call (403, 404, no network) becomes the same union with the fixed code.

## ICriticalResultNotificationService

Service: `services/clinical/httpCriticalResultNotificationService.ts`; chosen in `criticalResultNotificationServiceInstance.ts`. Base `/api/clinical/critical-result-notification`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getByCaseId` | `GET /api/clinical/critical-result-notification/get-by-case-id` | `caseId` (query) | result |
| `recordNotification` | `POST /api/clinical/critical-result-notification/record-notification` | `input` (the body) | result |
| `migrateIntraopVerbalReport` | `POST /api/clinical/critical-result-notification/migrate-intraop-verbal-report` | `input` (the body) | result |

## ICriticalAlertReferenceTokenService

Service: `services/clinical/httpCriticalAlertReferenceTokenService.ts`; chosen in `criticalAlertReferenceTokenServiceInstance.ts`. Base `/api/clinical/critical-alert-reference-token`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `issue` | `POST /api/clinical/critical-alert-reference-token/issue` | `draft` (the body) | result |
| `getByCaseId` | `GET /api/clinical/critical-alert-reference-token/get-by-case-id` | `caseId` (query) | result |
| `getAll` | `GET /api/clinical/critical-alert-reference-token/get-all` | none | result |
| `resolve` | `POST /api/clinical/critical-alert-reference-token/resolve` | `token` (body fields) | result |
| `recordAccess` | `POST /api/clinical/critical-alert-reference-token/record-access` | `id` (body fields) | result |
| `recordAcknowledged` | `POST /api/clinical/critical-alert-reference-token/record-acknowledged` | `id` (body fields) | result |

## ICriticalAlertDispatchService

Service: `services/clinical/httpCriticalAlertDispatchService.ts`; chosen in `criticalAlertDispatchServiceInstance.ts`. Base `/api/clinical/critical-alert-dispatch`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getByCaseId` | `GET /api/clinical/critical-alert-dispatch/get-by-case-id` | `caseId` (query) | result |
| `getAll` | `GET /api/clinical/critical-alert-dispatch/get-all` | none | result |
| `record` | `POST /api/clinical/critical-alert-dispatch/record` | `input` (the body) | result |

