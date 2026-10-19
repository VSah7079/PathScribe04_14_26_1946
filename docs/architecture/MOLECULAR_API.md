# Molecular orders and send-out: the API server's calls (PS-500)

Batch 616. The server version of each molecular orders and send-out service that the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, names in kebab-case.
- Reads (`get`, `list`, `find`, `is`, `has`, `count`, `can`, `resolve`, `load`, `search`, `check`, and similar) are `GET` with the arguments in the query string, repeated for a list, empty values left out. A read whose arguments are not plain values is a `POST` with the arguments as the body.
- `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` with the arguments in the query string. `save`, `set`, `update`, `upsert`, `replace` are `PUT`. Everything else is `POST`.
- A write with one object argument sends that object as the body. A write with several arguments, or plain ones, sends an object named by the argument names.
- Every answer is `{ ok, data }` on success. The data is the body of the 2xx reply as is. `403` is `NOT_PERMITTED`, `404` is `NOT_FOUND`, `409` is `CONFLICT`, `400` is `INVALID`; the server's text is dropped.
- Where an earlier contract names an endpoint for the same data (for example `CYTOLOGY_QC_API.md`, `MOLECULAR_ORDERS_API.md`, `REGISTRY_GO_LIVE_API.md`, `REGISTRY_ACKNOWLEDGEMENT_API.md`), the server may serve both; if the two disagree the earlier, narrower one wins and the table below changes.

## IMolecularAssayControlRuleService

`/api/molecular/molecular-assay-control-rule`. Service: `services/molecular/httpMolecularAssayControlRuleService.ts`; chosen in `molecularAssayControlRuleServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/molecular/molecular-assay-control-rule/get-all` | none |
| `getByAssayCode` | `GET /api/molecular/molecular-assay-control-rule/get-by-assay-code` | `assayCode` (query) |
| `create` | `POST /api/molecular/molecular-assay-control-rule/create` | `rule` (the body) |
| `update` | `PUT /api/molecular/molecular-assay-control-rule/update` | `id`, `patch` (body fields) |
| `delete` | `DELETE /api/molecular/molecular-assay-control-rule/delete` | `id` (query) |

## IMolecularBatchService

`/api/molecular/molecular-batch`. Service: `services/molecular/httpMolecularBatchService.ts`; chosen in `molecularBatchServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/molecular/molecular-batch/get-all` | none |
| `getById` | `GET /api/molecular/molecular-batch/get-by-id` | `id` (query) |
| `create` | `POST /api/molecular/molecular-batch/create` | `batch` (the body) |
| `updateByUuid` | `PUT /api/molecular/molecular-batch/update-by-uuid` | `batchUuid`, `changes` (body fields) |
| `cloneAndSupersede` | `POST /api/molecular/molecular-batch/clone-and-supersede` | `originalBatchId`, `reason`, `byUserId`, `byUserName` (body fields) |

## IMolecularExtractionRackService

`/api/molecular/molecular-extraction-rack`. Service: `services/molecular/httpMolecularExtractionRackService.ts`; chosen in `molecularExtractionRackServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/molecular/molecular-extraction-rack/get-all` | none |
| `getById` | `GET /api/molecular/molecular-extraction-rack/get-by-id` | `id` (query) |
| `create` | `POST /api/molecular/molecular-extraction-rack/create` | `rack` (the body) |
| `loadSpecimenIntoPosition` | `POST /api/molecular/molecular-extraction-rack/load-specimen-into-position` | `rackId`, `positionLabel`, `specimen`, `movement` (body fields) |
| `setPositionAccession` | `PUT /api/molecular/molecular-extraction-rack/set-position-accession` | `rackId`, `positionLabel`, `accessionNumber` (body fields) |
| `placeOnDeck` | `POST /api/molecular/molecular-extraction-rack/place-on-deck` | `rackId`, `placement`, `requirements` (body fields) |
| `findPositionByContainerBarcode` | `GET /api/molecular/molecular-extraction-rack/find-position-by-container-barcode` | `containerBarcode` (query) |

## IMolecularOrderOutboundQueueService

`/api/molecular-orders/molecular-order-outbound-queue`. Service: `services/molecularOrders/httpMolecularOrderOutboundQueueService.ts`; chosen in `molecularOrderOutboundQueueServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/molecular-orders/molecular-order-outbound-queue/get-all` | none |
| `getByCaseId` | `GET /api/molecular-orders/molecular-order-outbound-queue/get-by-case-id` | `caseId` (query) |
| `enqueue` | `POST /api/molecular-orders/molecular-order-outbound-queue/enqueue` | `entry` (the body) |
| `getFailed` | `GET /api/molecular-orders/molecular-order-outbound-queue/get-failed` | none |
| `markFailed` | `POST /api/molecular-orders/molecular-order-outbound-queue/mark-failed` | `id`, `failure` (body fields) |
| `retryDispatch` | `POST /api/molecular-orders/molecular-order-outbound-queue/retry-dispatch` | `id` (body fields) |
| `markSent` | `POST /api/molecular-orders/molecular-order-outbound-queue/mark-sent` | `id` (body fields) |

