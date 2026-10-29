# Reference lists and settings (diagnosis codes, external resources, feedback, fonts, governing bodies, performance targets, priorities): the API server's calls (PS-514)

Batch 617. The server version of each reference lists and settings (diagnosis codes, external resources, feedback, fonts, governing bodies, performance targets, priorities) service that the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, names in kebab-case.
- Reads (`get`, `list`, `find`, `is`, `has`, `count`, `can`, `resolve`, `load`, `search`, `check`, and similar) are `GET` with the arguments in the query string, repeated for a list, empty values left out. A read whose arguments are not plain values is a `POST` with the arguments as the body.
- `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` with the arguments in the query string. `save`, `set`, `update`, `upsert`, `replace` are `PUT`. Everything else is `POST`.
- A write with one object argument sends that object as the body. A write with several arguments, or plain ones, sends an object named by the argument names.
- Every answer is `{ ok, data }` on success. The data is the body of the 2xx reply as is. `403` is `NOT_PERMITTED`, `404` is `NOT_FOUND`, `409` is `CONFLICT`, `400` is `INVALID`; the server's text is dropped.
- A method that returns a plain list (not a ServiceResult) reads `{ "items": [...] }` (`HTTP_SERVICES_PATTERN.md` §3); a missing item is `404` and arrives as the method's empty answer; a method that returns nothing resolves on success and throws a code on refusal. A check that returns a status (`verify`) fails closed: any failure is `invalid`. Where an earlier contract names an endpoint for the same data, the earlier, narrower one wins and the table below changes.

## IDiagnosisCodesService

`/api/diagnosis-codes/diagnosis-codes`. Service: `services/diagnosisCodes/httpDiagnosisCodesService.ts`; chosen in `diagnosisCodesServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/diagnosis-codes/diagnosis-codes/get-all` | none |
| `search` | `POST /api/diagnosis-codes/diagnosis-codes/search` | `query` (body fields) |

## IExternalResourceService

`/api/external-resources/external-resource`. Service: `services/externalResources/httpExternalResourceService.ts`; chosen in `externalResourceServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `listForOrganisation` | `GET /api/external-resources/external-resource/list-for-organisation` | `organisationId` (query) |
| `resolveForViewer` | `POST /api/external-resources/external-resource/resolve-for-viewer` | `context` (the body) |
| `create` | `POST /api/external-resources/external-resource/create` | `input` (the body) |
| `update` | `PUT /api/external-resources/external-resource/update` | `id`, `changes` (body fields) |
| `remove` | `DELETE /api/external-resources/external-resource/remove` | `id` (query) |

## IFeedbackSettingsService

`/api/feedback/feedback-settings`. Service: `services/feedback/httpFeedbackSettingsService.ts`; chosen in `feedbackSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/feedback/feedback-settings/get` | none |
| `save` | `PUT /api/feedback/feedback-settings/save` | `settings` (the body) |
| `qaButtonShown` | `POST /api/feedback/feedback-settings/qa-button-shown` | none |

## IFontService

`/api/fonts/font`. Service: `services/fonts/httpFontService.ts`; chosen in `fontServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/fonts/font/get-all` | none |
| `getConfig` | `GET /api/fonts/font/get-config` | none |
| `updateConfig` | `PUT /api/fonts/font/update-config` | `changes` (the body) |
| `add` | `POST /api/fonts/font/add` | `font` (the body) |
| `deactivate` | `POST /api/fonts/font/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/fonts/font/reactivate` | `id` (body fields) |

## IGoverningBodyService

`/api/governing-bodies/governing-body`. Service: `services/governingBodies/httpGoverningBodyService.ts`; chosen in `governingBodyServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/governing-bodies/governing-body/get-all` | none |
| `saveAll` | `PUT /api/governing-bodies/governing-body/save-all` | `bodies` (the body) |

## IPerformanceTargetService

`/api/performance-targets/performance-target`. Service: `services/performanceTargets/httpPerformanceTargetService.ts`; chosen in `performanceTargetServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/performance-targets/performance-target/get-all` | none |
| `getById` | `GET /api/performance-targets/performance-target/get-by-id` | `id` (query) |
| `getByKey` | `GET /api/performance-targets/performance-target/get-by-key` | `key` (query) |
| `add` | `POST /api/performance-targets/performance-target/add` | `t` (the body) |
| `update` | `PUT /api/performance-targets/performance-target/update` | `id`, `changes` (body fields) |
| `delete` | `DELETE /api/performance-targets/performance-target/delete` | `id` (query) |

## IPriorityService

`/api/priority/priority`. Service: `services/priority/httpPriorityService.ts`; chosen in `priorityServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/priority/priority/get-all` | none |

## Feedback settings: validation recipients and enhancement destination (Oct 28, 2026)

`IFeedbackSettingsService.get` and `.save` carry two more fields in the settings body: `validationRecipients` (array of email addresses) and `enhancementUrl` (an https address, or an empty string). Both are optional on read from an older server (the browser treats a missing value as empty). See `FEEDBACK_DESTINATION.md`.
