# Digital pathology and image association: server calls (PS-502)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the API server for these services, in the order of the interface. The browser side is `services/<area>/http<Name>Service.ts`, built from the shared kit (`HTTP_SERVICES_PATTERN.md`); the demo keeps the mock. The server team implements the table below.

## Rules for every call

- Bearer token on every request; the server decides permission from the token and returns `403` (`NOT_PERMITTED`). The browser hides buttons; it never replaces the check (`AUTHORIZATION_API.md`).
- Errors are fixed codes only: `NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`. The browser never shows or logs the server's message text.
- Patient names, MRNs and other patient text travel in the **body**, never in a URL or query string. Ids and short codes may be in the path.
- Every change is audited by the server with the authenticated user (a name the browser sends, such as `activatedBy` or `updatedBy`, is advisory: the server records the token's user). The audit row has ids and the action, no patient text.
- A `404` on a read that can legitimately have no answer is returned to the screen as "none" (`null`) where the interface allows it; on any other call it is `NOT_FOUND`.
- A list may come back as `{ "items": [...] }` or as a bare array only if the interface returns a list; these services return the record or list as the body.

## AI screening results (`IAiScreeningResultService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/digital-pathology/ai-screening-result/get-all` | none |  |
| `getByCaseId` | GET `/api/cases/{caseId}/ai-screening-results` | none |  |
| `getById` | GET `/api/dp/ai-screening-results/{id}` | none |  |
| `order` | POST `/api/dp/ai-screening-results` | `entry` | audited |
| `markCompleted` | POST `/api/dp/ai-screening-results/{id}/complete` | `{findings,slideTriage}` | audited |
| `markFailed` | POST `/api/dp/ai-screening-results/{id}/fail` | none | audited |
| `markTimedOut` | POST `/api/dp/ai-screening-results/{id}/time-out` | none | audited |
| `recordHumanConcordance` | POST `/api/dp/ai-screening-results/{id}/concordance` | `{concordant}` | audited |

## AI stalled-result settings (`IAiStalledResultSettingsService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `get` | GET `/api/digital-pathology/ai-stalled-result-settings/get` | none |  |
| `update` | PUT `/api/dp/ai-stalled-result-settings` | `changes` | audited |

## Digital pathology vendors (`IDpVendorService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/digital-pathology/dp-vendor/get-all` | none |  |
| `getActive` | GET `/api/digital-pathology/dp-vendor/get-active` | none |  |
| `getByModality` | GET `/api/digital-pathology/dp-vendor/get-all?modality` | none |  |
| `getById` | GET `/api/dp/vendors/{id}` | none |  |
| `add` | POST `/api/dp/vendors` | `entry` | audited |
| `update` | PATCH `/api/dp/vendors/{id}` | `changes` | audited |
| `deactivate` | POST `/api/dp/vendors/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/dp/vendors/{id}/reactivate` | none | audited |
| `remove` | DELETE `/api/dp/vendors/{id}` | none | audited |

## WSI scan batches (`IWsiScanBatchService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/digital-pathology/wsi-scan-batch/get-all` | none |  |
| `getById` | GET `/api/dp/scan-batches/{id}` | none |  |
| `create` | POST `/api/dp/scan-batches` | `batch` | audited |
| `markDispatched` | POST `/api/dp/scan-batches/{id}/dispatched` | `{sentBy}` | audited |
| `markUnloaded` | POST `/api/dp/scan-batches/{id}/unloaded` | `{unloadedBy}` | audited |
| `recordSendFailure` | POST `/api/dp/scan-batches/{id}/send-failure` | `error` | audited |
| `updateSlideStatus` | PATCH `/api/dp/scan-batches/{batchId}/slides/{slidePosition}` | `update` | audited |

## Whole-slide viewer vendors (`IWsiViewerVendorService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/digital-pathology/wsi-viewer-vendor/get-all` | none |  |
| `getActive` | GET `/api/digital-pathology/wsi-viewer-vendor/get-active` | none |  |
| `getById` | GET `/api/dp/viewer-vendors/{id}` | none |  |
| `add` | POST `/api/dp/viewer-vendors` | `entry` | audited |
| `update` | PATCH `/api/dp/viewer-vendors/{id}` | `changes` | audited |
| `deactivate` | POST `/api/dp/viewer-vendors/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/dp/viewer-vendors/{id}/reactivate` | none | audited |
| `remove` | DELETE `/api/dp/viewer-vendors/{id}` | none | audited |

## Gross imaging vendors (`IGrossImagingVendorService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/image-association/gross-imaging-vendor/get-all` | none |  |
| `getActive` | GET `/api/image-association/gross-imaging-vendor/get-active` | none |  |
| `getById` | GET `/api/images/gross-imaging-vendors/{id}` | none |  |
| `add` | POST `/api/images/gross-imaging-vendors` | `entry` | audited |
| `update` | PATCH `/api/images/gross-imaging-vendors/{id}` | `changes` | audited |
| `deactivate` | POST `/api/images/gross-imaging-vendors/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/images/gross-imaging-vendors/{id}/reactivate` | none | audited |
| `remove` | DELETE `/api/images/gross-imaging-vendors/{id}` | none | audited |

## Image management system vendors (`IImageManagementSystemVendorService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/image-association/image-management-system-vendor/get-all` | none |  |
| `getActive` | GET `/api/image-association/image-management-system-vendor/get-active` | none |  |
| `getById` | GET `/api/images/ims-vendors/{id}` | none |  |
| `add` | POST `/api/images/ims-vendors` | `entry` | audited |
| `update` | PATCH `/api/images/ims-vendors/{id}` | `changes` | audited |
| `deactivate` | POST `/api/images/ims-vendors/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/images/ims-vendors/{id}/reactivate` | none | audited |
| `remove` | DELETE `/api/images/ims-vendors/{id}` | none | audited |

## Image upload (`IImageUploadService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `upload` | POST `/api/images` | `{imageData,imageType}` | audited |

The mock stays the default when no API server address is configured. See `HTTP_SERVICES_PATTERN.md` §6 for which services still have only the mock.
