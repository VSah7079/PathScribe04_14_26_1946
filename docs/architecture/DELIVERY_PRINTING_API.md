# Delivery rules, print settings and the print queue: the API server's calls (PS-514)

Batch 617. The server version of each delivery rules, print settings and the print queue service that the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, names in kebab-case.
- Reads (`get`, `list`, `find`, `is`, `has`, `count`, `can`, `resolve`, `load`, `search`, `check`, and similar) are `GET` with the arguments in the query string, repeated for a list, empty values left out. A read whose arguments are not plain values is a `POST` with the arguments as the body.
- `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` with the arguments in the query string. `save`, `set`, `update`, `upsert`, `replace` are `PUT`. Everything else is `POST`.
- A write with one object argument sends that object as the body. A write with several arguments, or plain ones, sends an object named by the argument names.
- Every answer is `{ ok, data }` on success. The data is the body of the 2xx reply as is. `403` is `NOT_PERMITTED`, `404` is `NOT_FOUND`, `409` is `CONFLICT`, `400` is `INVALID`; the server's text is dropped.
- A method that returns a plain list (not a ServiceResult) reads `{ "items": [...] }` (`HTTP_SERVICES_PATTERN.md` §3); a missing item is `404` and arrives as the method's empty answer; a method that returns nothing resolves on success and throws a code on refusal. A check that returns a status (`verify`) fails closed: any failure is `invalid`. Where an earlier contract names an endpoint for the same data, the earlier, narrower one wins and the table below changes.

## IDeliveryRuleService

`/api/delivery/delivery-rule`. Service: `services/delivery/httpDeliveryRuleService.ts`; chosen in `deliveryRuleServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/delivery/delivery-rule/get-all` | none |
| `getActive` | `GET /api/delivery/delivery-rule/get-active` | none |
| `create` | `POST /api/delivery/delivery-rule/create` | `rule` (the body) |
| `update` | `PUT /api/delivery/delivery-rule/update` | `id`, `changes` (body fields) |
| `remove` | `DELETE /api/delivery/delivery-rule/remove` | `id` (query) |

## IDeliveryRetrySettingsService

`/api/delivery/delivery-retry-settings`. Service: `services/delivery/httpDeliveryRetrySettingsService.ts`; chosen in `deliveryRetrySettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/delivery/delivery-retry-settings/get` | none |
| `save` | `PUT /api/delivery/delivery-retry-settings/save` | `settings` (the body) |

## IDeliveryRetryService

`/api/delivery/delivery-retry`. Service: `services/delivery/httpDeliveryRetryService.ts`; chosen in `deliveryRetryServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/delivery/delivery-retry/get-all` | none |
| `create` | `POST /api/delivery/delivery-retry/create` | `record` (the body) |
| `update` | `PUT /api/delivery/delivery-retry/update` | `id`, `patch` (body fields) |

## ILabelReprintRunService

`/api/labels/label-reprint-run`. Service: `services/labels/httpLabelReprintRunService.ts`; chosen in `labelReprintRunServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `list` | `GET /api/labels/label-reprint-run/list` | none |
| `save` | `PUT /api/labels/label-reprint-run/save` | `run` (the body) |

## IPrintSettingsService

`/api/print-settings/print-settings`. Service: `services/printSettings/httpPrintSettingsService.ts`; chosen in `printSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/print-settings/print-settings/get` | none |
| `update` | `PUT /api/print-settings/print-settings/update` | `patch` (the body) |
| `reset` | `POST /api/print-settings/print-settings/reset` | none |

## IFacilityPrintSettingsService

`/api/print-settings/facility-print-settings`. Service: `services/printSettings/httpFacilityPrintSettingsService.ts`; chosen in `facilityPrintSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForFacility` | `GET /api/print-settings/facility-print-settings/get-for-facility` | `facilityId` (query) |
| `create` | `POST /api/print-settings/facility-print-settings/create` | `facilityId`, `overrides` (body fields) |
| `update` | `PUT /api/print-settings/facility-print-settings/update` | `facilityId`, `changes` (body fields) |
| `remove` | `DELETE /api/print-settings/facility-print-settings/remove` | `facilityId` (query) |

## IPrintQueueService

`/api/printing/print-queue`. Service: `services/printing/httpPrintQueueService.ts`; chosen in `printQueueServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/printing/print-queue/get-all` | none |
| `getByCaseId` | `GET /api/printing/print-queue/get-by-case-id` | `caseId` (query) |
| `getById` | `GET /api/printing/print-queue/get-by-id` | `id` (query) |
| `enqueue` | `POST /api/printing/print-queue/enqueue` | `entry` (the body) |
| `getFailed` | `GET /api/printing/print-queue/get-failed` | none |
| `markFailed` | `POST /api/printing/print-queue/mark-failed` | `id`, `failure` (body fields) |
| `retryDispatch` | `POST /api/printing/print-queue/retry-dispatch` | `id` (body fields) |
| `markPrinted` | `POST /api/printing/print-queue/mark-printed` | `id`, `options?` (body fields) |
| `persistRenderedPdf` | `POST /api/printing/print-queue/persist-rendered-pdf` | `id`, `pdfBase64`, `document?` (body fields) |
| `holdPrintJob` | `POST /api/printing/print-queue/hold-print-job` | `id`, `heldBy`, `holdReason?` (body fields) |
| `releaseHold` | `POST /api/printing/print-queue/release-hold` | `id`, `releasedBy` (body fields) |
| `cancelPrintJob` | `POST /api/printing/print-queue/cancel-print-job` | `id`, `cancelledBy`, `cancelReason?` (body fields) |
| `redirectPrintJob` | `POST /api/printing/print-queue/redirect-print-job` | `id`, `destination`, `redirectedBy` (body fields) |
| `holdMany` | `POST /api/printing/print-queue/hold-many` | `ids`, `heldBy`, `holdReason?` (body fields) |
| `releaseHoldMany` | `POST /api/printing/print-queue/release-hold-many` | `ids`, `releasedBy` (body fields) |
| `cancelMany` | `POST /api/printing/print-queue/cancel-many` | `ids`, `cancelledBy`, `cancelReason?` (body fields) |
| `tagBatch` | `POST /api/printing/print-queue/tag-batch` | `jobIds`, `batchId` (body fields) |

