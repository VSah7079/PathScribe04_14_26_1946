# Equipment, data migration, LIS sync, margin extraction and intraoperative critical results: the API server's calls (PS-514)

Batch 617. The server version of each equipment, data migration, lis sync, margin extraction and intraoperative critical results service that the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, names in kebab-case.
- Reads (`get`, `list`, `find`, `is`, `has`, `count`, `can`, `resolve`, `load`, `search`, `check`, and similar) are `GET` with the arguments in the query string, repeated for a list, empty values left out. A read whose arguments are not plain values is a `POST` with the arguments as the body.
- `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` with the arguments in the query string. `save`, `set`, `update`, `upsert`, `replace` are `PUT`. Everything else is `POST`.
- A write with one object argument sends that object as the body. A write with several arguments, or plain ones, sends an object named by the argument names.
- Every answer is `{ ok, data }` on success. The data is the body of the 2xx reply as is. `403` is `NOT_PERMITTED`, `404` is `NOT_FOUND`, `409` is `CONFLICT`, `400` is `INVALID`; the server's text is dropped.
- A method that returns a plain list (not a ServiceResult) reads `{ "items": [...] }` (`HTTP_SERVICES_PATTERN.md` §3); a missing item is `404` and arrives as the method's empty answer; a method that returns nothing resolves on success and throws a code on refusal. A check that returns a status (`verify`) fails closed: any failure is `invalid`. Where an earlier contract names an endpoint for the same data, the earlier, narrower one wins and the table below changes.

## IEquipmentService

`/api/equipment/equipment`. Service: `services/equipment/httpEquipmentService.ts`; chosen in `equipmentServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/equipment/equipment/get-all` | none |
| `getActive` | `GET /api/equipment/equipment/get-active` | `kind?` (query) |
| `getById` | `GET /api/equipment/equipment/get-by-id` | `id` (query) |
| `getByCode` | `GET /api/equipment/equipment/get-by-code` | `code` (query) |
| `create` | `POST /api/equipment/equipment/create` | `draft` (the body) |
| `update` | `PUT /api/equipment/equipment/update` | `id`, `changes` (body fields) |
| `deactivate` | `POST /api/equipment/equipment/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/equipment/equipment/reactivate` | `id` (body fields) |

## IEquipmentLogService

`/api/equipment/equipment-log`. Service: `services/equipment/httpEquipmentLogService.ts`; chosen in `equipmentLogServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `list` | `GET /api/equipment/equipment-log/list` | `equipmentId?` (query) |
| `add` | `POST /api/equipment/equipment-log/add` | `entry`, `today` (body fields) |

## IIntraopCriticalResultService

`/api/intraop/intraop-critical-result`. Service: `services/intraop/httpIntraopCriticalResultService.ts`; chosen in `intraopCriticalResultServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/intraop/intraop-critical-result/get-all` | none |
| `add` | `POST /api/intraop/intraop-critical-result/add` | `entry` (the body) |
| `update` | `PUT /api/intraop/intraop-critical-result/update` | `id`, `changes` (body fields) |
| `setActive` | `PUT /api/intraop/intraop-critical-result/set-active` | `id`, `active` (body fields) |

## ILisSyncService

`/api/lis-sync/lis-sync`. Service: `services/lisSync/httpLisSyncService.ts`; chosen in `lisSyncServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getSyncState` | `GET /api/lis-sync/lis-sync/get-sync-state` | `caseId` (query) |
| `checkNow` | `GET /api/lis-sync/lis-sync/check-now` | `caseId` (query) |

## IMarginExtractionService

`/api/margin-extraction/margin-extraction`. Service: `services/marginExtraction/httpMarginExtractionService.ts`; chosen in `marginExtractionServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `extractAndStore` | `POST /api/margin-extraction/margin-extraction/extract-and-store` | `input` (the body) |
| `getShadowAttributesForCase` | `GET /api/margin-extraction/margin-extraction/get-shadow-attributes-for-case` | `caseId` (query) |
| `getShadowAttribute` | `GET /api/margin-extraction/margin-extraction/get-shadow-attribute` | `caseId`, `instanceId`, `fieldId` (query) |
| `listExceptions` | `POST /api/margin-extraction/margin-extraction/list-exceptions` | `filter?` (the body) |
| `resolveException` | `GET /api/margin-extraction/margin-extraction/resolve-exception` | `id`, `valueMm`, `byUserId`, `byUserName` (query) |
| `dismissException` | `POST /api/margin-extraction/margin-extraction/dismiss-exception` | `id`, `reason`, `byUserId`, `byUserName` (body fields) |

## IMigrationJobService

`/api/migration/migration-job`. Service: `services/migration/httpMigrationJobService.ts`; chosen in `migrationJobServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/migration/migration-job/get-all` | none |
| `getById` | `GET /api/migration/migration-job/get-by-id` | `id` (query) |
| `create` | `POST /api/migration/migration-job/create` | `entry` (the body) |
| `start` | `POST /api/migration/migration-job/start` | `id` (body fields) |
| `recordOutcome` | `POST /api/migration/migration-job/record-outcome` | `id`, `outcome` (body fields) |
| `complete` | `POST /api/migration/migration-job/complete` | `id` (body fields) |

## IMigrationRecordResultService

`/api/migration/migration-record-result`. Service: `services/migration/httpMigrationRecordResultService.ts`; chosen in `migrationRecordResultServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getByJobId` | `GET /api/migration/migration-record-result/get-by-job-id` | `migrationJobId` (query) |
| `record` | `POST /api/migration/migration-record-result/record` | `result` (the body) |

## IMigrationFieldMappingService

`/api/migration/migration-field-mapping`. Service: `services/migration/httpMigrationFieldMappingService.ts`; chosen in `migrationFieldMappingServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/migration/migration-field-mapping/get-all` | none |
| `getBySourceSystem` | `GET /api/migration/migration-field-mapping/get-by-source-system` | `sourceSystemName` (query) |
| `add` | `POST /api/migration/migration-field-mapping/add` | `entry` (the body) |
| `update` | `PUT /api/migration/migration-field-mapping/update` | `id`, `changes` (body fields) |
| `remove` | `DELETE /api/migration/migration-field-mapping/remove` | `id` (query) |

