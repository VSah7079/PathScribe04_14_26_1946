# Signature records and smart capture: the API server's calls (PS-514)

Batch 617. The server version of each service the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).** One route per interface method, `/api/<area>/<service>/<method-name>` in kebab-case. Reads are `GET` with the arguments in the query string (a list repeats the name, empty values are left out); a read whose arguments are not plain values is a `POST` with the arguments as the body. `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` (or `POST`); `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. A write with one object argument sends that object as the body; with several arguments it sends an object named by the argument names. An answer is `{ ok, data }`; `403` is `NOT_PERMITTED`, `404` `NOT_FOUND`, `409` `CONFLICT`, `400` `INVALID`. Methods that return a plain value or a list (not a result) answer the bare value or `{ items }`; a failure there is the quiet default (`null`, `false`, `[]`) except where the table says otherwise.

## ISignatureRecordService

`/api/signatures/signature-record`. Service: `services/signatures/httpSignatureRecordService.ts`; chosen in `signatureRecordServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `record` | `POST /api/signatures/signature-record/record` | `input` (the body) |
| `getByCaseId` | `GET /api/signatures/signature-record/get-by-case-id` | `caseId` (query) |

## ISmartCaptureService

`/api/smart-capture/smart-capture`. Service: `services/smartCapture/httpSmartCaptureService.ts`; chosen in `smartCaptureServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/smart-capture/smart-capture/get` | `caseId` (query) |
| `suggest` | `POST /api/smart-capture/smart-capture/suggest` | `caseId` (body fields) |
| `restart` | `POST /api/smart-capture/smart-capture/restart` | `caseId` (body fields) |
| `review` | `POST /api/smart-capture/smart-capture/review` | `caseId`, `lineKey`, `decision` (body fields) |
| `approve` | `POST /api/smart-capture/smart-capture/approve` | `caseId`, `input` (body fields) |
| `preview` | `GET /api/smart-capture/smart-capture/preview` | `caseId` (query) |
| `exportLines` | `POST /api/smart-capture/smart-capture/export-lines` | `caseId` (body fields) |

## ISmartCaptureSettingsService

`/api/smart-capture/smart-capture-settings`. Service: `services/smartCapture/httpSmartCaptureSettingsService.ts`; chosen in `smartCaptureSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getSettings` | `GET /api/smart-capture/smart-capture-settings/get-settings` | none |
| `setPrototypeEnabled` | `PUT /api/smart-capture/smart-capture-settings/set-prototype-enabled` | `enabled` (body fields) |
| `setChecklistItem` | `PUT /api/smart-capture/smart-capture-settings/set-checklist-item` | `id`, `ticked` (body fields) |
| `setProductionActivated` | `PUT /api/smart-capture/smart-capture-settings/set-production-activated` | `on` (body fields) |

