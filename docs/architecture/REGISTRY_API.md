# Registry reporting: the API server's calls (PS-504)

Batch 616. The server version of each registry reporting service that the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, names in kebab-case.
- Reads (`get`, `list`, `find`, `is`, `has`, `count`, `can`, `resolve`, `load`, `search`, `check`, and similar) are `GET` with the arguments in the query string, repeated for a list, empty values left out. A read whose arguments are not plain values is a `POST` with the arguments as the body.
- `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` with the arguments in the query string. `save`, `set`, `update`, `upsert`, `replace` are `PUT`. Everything else is `POST`.
- A write with one object argument sends that object as the body. A write with several arguments, or plain ones, sends an object named by the argument names.
- Every answer is `{ ok, data }` on success. The data is the body of the 2xx reply as is. `403` is `NOT_PERMITTED`, `404` is `NOT_FOUND`, `409` is `CONFLICT`, `400` is `INVALID`; the server's text is dropped.
- Where an earlier contract names an endpoint for the same data (for example `CYTOLOGY_QC_API.md`, `MOLECULAR_ORDERS_API.md`, `REGISTRY_GO_LIVE_API.md`, `REGISTRY_ACKNOWLEDGEMENT_API.md`), the server may serve both; if the two disagree the earlier, narrower one wins and the table below changes.

## ICancerRegistryOutboundQueueService

`/api/cancer-registry/cancer-registry-outbound-queue`. Service: `services/cancerRegistry/httpCancerRegistryOutboundQueueService.ts`; chosen in `cancerRegistryOutboundQueueServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cancer-registry/cancer-registry-outbound-queue/get-all` | none |
| `getByCaseId` | `GET /api/cancer-registry/cancer-registry-outbound-queue/get-by-case-id` | `caseId` (query) |
| `enqueue` | `POST /api/cancer-registry/cancer-registry-outbound-queue/enqueue` | `entry` (the body) |
| `getFailed` | `GET /api/cancer-registry/cancer-registry-outbound-queue/get-failed` | none |
| `markFailed` | `POST /api/cancer-registry/cancer-registry-outbound-queue/mark-failed` | `id`, `failure` (body fields) |
| `retryDispatch` | `POST /api/cancer-registry/cancer-registry-outbound-queue/retry-dispatch` | `id` (body fields) |
| `markSent` | `POST /api/cancer-registry/cancer-registry-outbound-queue/mark-sent` | `id` (body fields) |
| `setRegistryStatus` | `PUT /api/cancer-registry/cancer-registry-outbound-queue/set-registry-status` | `id`, `registryStatus`, `acknowledgement?` (body fields) |
| `setRegistryRevisions` | `PUT /api/cancer-registry/cancer-registry-outbound-queue/set-registry-revisions` | `id`, `revisions` (body fields) |

## ICancerRegistrySettingsService

`/api/cancer-registry/cancer-registry-settings`. Service: `services/cancerRegistry/httpCancerRegistrySettingsService.ts`; chosen in `cancerRegistrySettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cancer-registry/cancer-registry-settings/get` | none |
| `update` | `PUT /api/cancer-registry/cancer-registry-settings/update` | `patch` (the body) |
| `reset` | `POST /api/cancer-registry/cancer-registry-settings/reset` | none |

## IFacilityCancerRegistryOverrideService

`/api/cancer-registry/facility-cancer-registry-override`. Service: `services/cancerRegistry/httpFacilityCancerRegistryOverrideService.ts`; chosen in `facilityCancerRegistryOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForFacility` | `GET /api/cancer-registry/facility-cancer-registry-override/get-for-facility` | `facilityId` (query) |
| `create` | `POST /api/cancer-registry/facility-cancer-registry-override/create` | `facilityId`, `overrides` (body fields) |
| `update` | `PUT /api/cancer-registry/facility-cancer-registry-override/update` | `facilityId`, `changes` (body fields) |
| `remove` | `DELETE /api/cancer-registry/facility-cancer-registry-override/remove` | `facilityId` (query) |

## IScreeningRegistryConfigService

`/api/screening-registry/screening-registry-config`. Service: `services/screeningRegistry/httpScreeningRegistryConfigService.ts`; chosen in `screeningRegistryConfigServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/screening-registry/screening-registry-config/get` | `registryId` (query) |
| `save` | `PUT /api/screening-registry/screening-registry-config/save` | `config` (the body) |

## IRegistryGoLiveService

`/api/registry-go-live/registry-go-live`. Service: `services/registryGoLive/httpRegistryGoLiveService.ts`; chosen in `registryGoLiveServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `list` | `GET /api/registry-go-live/registry-go-live/list` | `domain`, `registryId` (query) |
| `get` | `GET /api/registry-go-live/registry-go-live/get` | `id` (query) |
| `create` | `POST /api/registry-go-live/registry-go-live/create` | `record` (the body) |
| `addApproval` | `POST /api/registry-go-live/registry-go-live/add-approval` | `id`, `approval` (body fields) |
| `markLive` | `POST /api/registry-go-live/registry-go-live/mark-live` | `id`, `live` (body fields) |
| `close` | `POST /api/registry-go-live/registry-go-live/close` | `id`, `closed` (body fields) |
| `getGovernance` | `GET /api/registry-go-live/registry-go-live/get-governance` | none |
| `getAgreement` | `GET /api/registry-go-live/registry-go-live/get-agreement` | `domain`, `registryId` (query) |
| `recordAgreement` | `POST /api/registry-go-live/registry-go-live/record-agreement` | `agreement` (the body) |
| `listAdapterRules` | `GET /api/registry-go-live/registry-go-live/list-adapter-rules` | `domain`, `registryId` (query) |
| `saveAdapterRule` | `PUT /api/registry-go-live/registry-go-live/save-adapter-rule` | `rule` (the body) |
| `removeAdapterRule` | `DELETE /api/registry-go-live/registry-go-live/remove-adapter-rule` | `id` (query) |
| `listValidationRecords` | `GET /api/registry-go-live/registry-go-live/list-validation-records` | `domain`, `registryId` (query) |
| `saveValidationRecord` | `PUT /api/registry-go-live/registry-go-live/save-validation-record` | `stored` (the body) |
| `saveGovernance` | `PUT /api/registry-go-live/registry-go-live/save-governance` | `next` (the body) |

