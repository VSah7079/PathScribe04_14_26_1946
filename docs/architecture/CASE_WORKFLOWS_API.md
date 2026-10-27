# Case workflow services: the API server's calls (PS-514)

Batch 617 (part A). The server version of each service below, which the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test, chosen by `<name>ServiceInstance.ts`); the India team's API server honours this contract. The rules are `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**Convention (`HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, kebab-case.
- Reads are `GET` with plain arguments in the query string; a read whose arguments are objects, or that carries an accession number, a token, or anything that names a patient, is a `POST` with the arguments in the body (nothing identifying goes in a URL or an access log).
- `delete`, `remove`, `clear`, `revoke` are `DELETE` with the query string; `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. One object argument is the body; several arguments are sent as an object named by the argument names.
- A call that returns a list answers `{ "items": [...] }`; a call that returns one record answers the record; a call that returns a result answers the data, and a failure is the fixed code (`403` NOT_PERMITTED, `404` NOT_FOUND, `409` CONFLICT, `400` INVALID).
- A call that returns nothing answers `200` with an empty body. A call whose answer is never "nothing" (marked *throws*) raises on a failure instead of returning a quiet default.
- *Settled* calls (code import): the business outcome (`ok: false` with `code`, `problems`, `missing`) is a `200` reply holding the interface's own union; a failed call (403, 404, no network) becomes the same union with the fixed code.

## IBatchService

Service: `services/batches/httpBatchService.ts`; chosen in `batchServiceInstance.ts`. Base `/api/batches/batch`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/batches/batch/get-all` | none | result |
| `getById` | `GET /api/batches/batch/get-by-id` | `id` (query) | result |
| `getByMasterBarcode` | `GET /api/batches/batch/get-by-master-barcode` | `barcode` (query) | result |
| `create` | `POST /api/batches/batch/create` | `draft` (the body) | result |
| `addItemByScan` | `POST /api/batches/batch/add-item-by-scan` | `batchId`, `scannedValue`, `byUserId`, `byUserName`, `fovCount?` (body fields) | record (throws) |
| `removeItem` | `DELETE /api/batches/batch/remove-item` | `batchId`, `itemId`, `byUserId`, `byUserName` (query) | result |
| `moveItem` | `POST /api/batches/batch/move-item` | `fromBatchId`, `itemId`, `toBatchId`, `byUserId`, `byUserName` (body fields) | result |
| `startReconciliation` | `POST /api/batches/batch/start-reconciliation` | `batchId`, `byUserId`, `byUserName` (body fields) | result |
| `scanItemOut` | `POST /api/batches/batch/scan-item-out` | `batchId`, `scannedValue`, `byUserId`, `byUserName` (body fields) | result |
| `completeReconciliation` | `POST /api/batches/batch/complete-reconciliation` | `batchId` (body fields) | result |
| `overrideAndComplete` | `POST /api/batches/batch/override-and-complete` | `batchId`, `byUserId`, `byUserName`, `reason` (body fields) | result |
| `setColdChainExcursion` | `PUT /api/batches/batch/set-cold-chain-excursion` | `batchId`, `readingId`, `temperatureCelsius`, `detectedAt` (body fields) | result |
| `acknowledgeColdChainExcursion` | `POST /api/batches/batch/acknowledge-cold-chain-excursion` | `batchId`, `byUserId`, `byUserName`, `note` (body fields) | result |
| `setCytologyInstrumentStatus` | `PUT /api/batches/batch/set-cytology-instrument-status` | `batchId`, `status` (body fields) | result |
| `setStainingInstrumentStatus` | `PUT /api/batches/batch/set-staining-instrument-status` | `batchId`, `status` (body fields) | result |
| `confirmQcVisualRead` | `POST /api/batches/batch/confirm-qc-visual-read` | `batchId`, `userId`, `userName` (body fields) | result |
| `abort` | `POST /api/batches/batch/abort` | `batchId`, `byUserId`, `byUserName`, `reason` (body fields) | result |
| `releaseRack` | `POST /api/batches/batch/release-rack` | `batchId`, `byUserId`, `byUserName` (body fields) | result |
| `transferToProcessing` | `POST /api/batches/batch/transfer-to-processing` | `batchId`, `byUserId`, `byUserName` (body fields) | result |

## ICaseMaskService

Service: `services/caseRegistry/httpCaseMaskService.ts`; chosen in `caseMaskServiceInstance.ts`. Base `/api/case-registry/case-mask`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getMask` | `GET /api/case-registry/case-mask/get-mask` | `scopeType`, `scopeId` (query) | result |
| `getAllMasks` | `GET /api/case-registry/case-mask/get-all-masks` | none | result |
| `saveMask` | `PUT /api/case-registry/case-mask/save-mask` | `mask` (the body) | result |
| `deleteMask` | `DELETE /api/case-registry/case-mask/delete-mask` | `scopeType`, `scopeId` (query) | result |
| `allocateNextCaseNumber` | `POST /api/case-registry/case-mask/allocate-next-case-number` | `candidates`, `timezone` (body fields) | result |
| `previewNextCaseNumber` | `POST /api/case-registry/case-mask/preview-next-case-number` | `candidates`, `timezone` (body fields) | result |

## ICaseViewTrackingService

Service: `services/caseViewTracking/httpCaseViewTrackingService.ts`; chosen in `caseViewTrackingServiceInstance.ts`. Base `/api/case-view-tracking/case-view-tracking`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `recordView` | `POST /api/case-view-tracking/case-view-tracking/record-view` | `userId`, `caseId` (body fields) | result |
| `getViewedCaseIds` | `GET /api/case-view-tracking/case-view-tracking/get-viewed-case-ids` | `userId` (query) | result |

## ICountersignService

Service: `services/cases/httpCountersignService.ts`; chosen in `countersignServiceInstance.ts`. Base `/api/cases/countersign`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/cases/countersign/get-all` | none | result |
| `getForCase` | `GET /api/cases/countersign/get-for-case` | `caseId` (query) | result |
| `release` | `POST /api/cases/countersign/release` | `input` (the body) | result |
| `countersign` | `POST /api/cases/countersign/countersign` | `input` (the body) | result |
| `reject` | `POST /api/cases/countersign/reject` | `input` (the body) | result |
| `getForSpecimen` | `GET /api/cases/countersign/get-for-specimen` | `caseId`, `specimenId` (query) | result |

## IOnDemandCaseFetchService

Service: `services/cases/httpOnDemandCaseFetchService.ts`; chosen in `onDemandCaseFetchServiceInstance.ts`. Base `/api/cases/on-demand-case-fetch`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `fetchCaseByAccession` | `POST /api/cases/on-demand-case-fetch/fetch-case-by-accession` | `accessionNumber` (body fields) | result |

## ICodeService

Service: `services/codes/httpCodeService.ts`; chosen in `codeServiceInstance.ts`. Base `/api/codes/code`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `search` | `POST /api/codes/code/search` | `params` (the body) | result |
| `getByCode` | `GET /api/codes/code/get-by-code` | `system`, `code`, `jurisdiction?` (query) | result |
| `getCategories` | `GET /api/codes/code/get-categories` | `system`, `subtype?`, `jurisdiction?` (query) | result |

## IConsultTokenService

Service: `services/consultAccess/httpConsultTokenService.ts`; chosen in `consultTokenServiceInstance.ts`. Base `/api/consult-access/consult-token`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `issue` | `POST /api/consult-access/consult-token/issue` | `draft` (the body) | result |
| `getByCaseId` | `GET /api/consult-access/consult-token/get-by-case-id` | `caseId` (query) | result |
| `listAll` | `GET /api/consult-access/consult-token/list-all` | none | result |
| `resolve` | `POST /api/consult-access/consult-token/resolve` | `token` (body fields) | result |
| `revoke` | `DELETE /api/consult-access/consult-token/revoke` | `id` (query) | result |
| `openConsult` | `POST /api/consult-access/consult-token/open-consult` | `token` (body fields) | result |
| `previewIdentity` | `POST /api/consult-access/consult-token/preview-identity` | `linkId` (body fields) | result |
| `submitOpinion` | `POST /api/consult-access/consult-token/submit-opinion` | `token`, `draft` (body fields) | result |
| `getOpinionsByCaseId` | `GET /api/consult-access/consult-token/get-opinions-by-case-id` | `caseId` (query) | result |
| `assessOpinion` | `POST /api/consult-access/consult-token/assess-opinion` | `id`, `input` (body fields) | result |

