# Billing and charge capture: the API server's calls (PS-498)

Batch 616. The server version of each billing and charge capture service that the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, names in kebab-case.
- Reads (`get`, `list`, `find`, `is`, `has`, `count`, `can`, `resolve`, `load`, `search`, `check`, and similar) are `GET` with the arguments in the query string, repeated for a list, empty values left out. A read whose arguments are not plain values is a `POST` with the arguments as the body.
- `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` with the arguments in the query string. `save`, `set`, `update`, `upsert`, `replace` are `PUT`. Everything else is `POST`.
- A write with one object argument sends that object as the body. A write with several arguments, or plain ones, sends an object named by the argument names.
- Every answer is `{ ok, data }` on success. The data is the body of the 2xx reply as is. `403` is `NOT_PERMITTED`, `404` is `NOT_FOUND`, `409` is `CONFLICT`, `400` is `INVALID`; the server's text is dropped.
- Where an earlier contract names an endpoint for the same data (for example `CYTOLOGY_QC_API.md`, `MOLECULAR_ORDERS_API.md`, `REGISTRY_GO_LIVE_API.md`, `REGISTRY_ACKNOWLEDGEMENT_API.md`), the server may serve both; if the two disagree the earlier, narrower one wins and the table below changes.

## IBillingDeficiencyService

`/api/billing/billing-deficiency`. Service: `services/billing/httpBillingDeficiencyService.ts`; chosen in `billingDeficiencyServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/billing/billing-deficiency/get-all` | none |
| `getByCaseId` | `GET /api/billing/billing-deficiency/get-by-case-id` | `caseId` (query) |
| `raise` | `POST /api/billing/billing-deficiency/raise` | `deficiency` (the body) |
| `resolve` | `POST /api/billing/billing-deficiency/resolve` | `id`, `resolution` (body fields) |

## IBillingRuleService

`/api/billing/billing-rule`. Service: `services/billing/httpBillingRuleService.ts`; chosen in `billingRuleServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/billing/billing-rule/get-all` | none |
| `getVersionsForBillingCode` | `GET /api/billing/billing-rule/get-versions-for-billing-code` | `billingCode`, `siteId?` (query) |
| `getActiveRuleAt` | `POST /api/billing/billing-rule/get-active-rule-at` | `billingCode`, `dateOfService`, `siteId?`, `options?` (body fields) |
| `createVersion` | `POST /api/billing/billing-rule/create-version` | `input` (the body) |
| `submitForApproval` | `POST /api/billing/billing-rule/submit-for-approval` | `billingCode`, `version`, `siteId`, `submittedBy` (body fields) |
| `approveVersion` | `POST /api/billing/billing-rule/approve-version` | `billingCode`, `version`, `siteId`, `reviewedBy` (body fields) |
| `rejectVersion` | `POST /api/billing/billing-rule/reject-version` | `billingCode`, `version`, `siteId`, `reviewedBy`, `rejectionReason` (body fields) |
| `retireVersion` | `POST /api/billing/billing-rule/retire-version` | `billingCode`, `version`, `effectiveTo?`, `siteId?` (body fields) |

## ICodeReviewPoolService

`/api/billing/code-review-pool`. Service: `services/billing/httpCodeReviewPoolService.ts`; chosen in `codeReviewPoolServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/billing/code-review-pool/get-all` | none |
| `getByCaseId` | `GET /api/billing/code-review-pool/get-by-case-id` | `caseId` (query) |
| `create` | `POST /api/billing/code-review-pool/create` | `entry` (the body) |
| `review` | `POST /api/billing/code-review-pool/review` | `id`, `outcome` (body fields) |

## IJurisdictionPaymentMappingService

`/api/billing/jurisdiction-payment-mapping`. Service: `services/billing/httpJurisdictionPaymentMappingService.ts`; chosen in `jurisdictionPaymentMappingServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/billing/jurisdiction-payment-mapping/get-all` | none |
| `getById` | `GET /api/billing/jurisdiction-payment-mapping/get-by-id` | `id` (query) |
| `getByCountry` | `GET /api/billing/jurisdiction-payment-mapping/get-by-country` | `countryCode` (query) |
| `add` | `POST /api/billing/jurisdiction-payment-mapping/add` | `input` (the body) |
| `update` | `PUT /api/billing/jurisdiction-payment-mapping/update` | `id`, `changes` (body fields) |
| `deactivate` | `POST /api/billing/jurisdiction-payment-mapping/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/billing/jurisdiction-payment-mapping/reactivate` | `id` (body fields) |

## IMasterPaymentTypeService

`/api/billing/master-payment-type`. Service: `services/billing/httpMasterPaymentTypeService.ts`; chosen in `masterPaymentTypeServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/billing/master-payment-type/get-all` | none |
| `getById` | `GET /api/billing/master-payment-type/get-by-id` | `id` (query) |
| `add` | `POST /api/billing/master-payment-type/add` | `input` (the body) |
| `update` | `PUT /api/billing/master-payment-type/update` | `id`, `changes` (body fields) |
| `deactivate` | `POST /api/billing/master-payment-type/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/billing/master-payment-type/reactivate` | `id` (body fields) |

## IModifierDictionaryService

`/api/billing/modifier-dictionary`. Service: `services/billing/httpModifierDictionaryService.ts`; chosen in `modifierDictionaryServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAllVersions` | `GET /api/billing/modifier-dictionary/get-all-versions` | none |
| `getActiveVersion` | `GET /api/billing/modifier-dictionary/get-active-version` | none |
| `createVersion` | `POST /api/billing/modifier-dictionary/create-version` | `input` (the body) |
| `activateVersion` | `POST /api/billing/modifier-dictionary/activate-version` | `versionId` (body fields) |
| `approveVersion` | `POST /api/billing/modifier-dictionary/approve-version` | `versionId`, `reviewedBy` (body fields) |
| `rejectVersion` | `POST /api/billing/modifier-dictionary/reject-version` | `versionId`, `reviewedBy`, `rejectionReason` (body fields) |

## IOutboundChargeQueueService

`/api/billing/outbound-charge-queue`. Service: `services/billing/httpOutboundChargeQueueService.ts`; chosen in `outboundChargeQueueServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/billing/outbound-charge-queue/get-all` | none |
| `getByCaseId` | `GET /api/billing/outbound-charge-queue/get-by-case-id` | `caseId` (query) |
| `getByServiceChargeRecordIds` | `GET /api/billing/outbound-charge-queue/get-by-service-charge-record-ids` | `ids` (query) |
| `enqueue` | `POST /api/billing/outbound-charge-queue/enqueue` | `entry` (the body) |
| `getFailed` | `GET /api/billing/outbound-charge-queue/get-failed` | none |
| `markFailed` | `POST /api/billing/outbound-charge-queue/mark-failed` | `id`, `failure` (body fields) |
| `retryDispatch` | `POST /api/billing/outbound-charge-queue/retry-dispatch` | `id` (body fields) |
| `markSent` | `POST /api/billing/outbound-charge-queue/mark-sent` | `id` (body fields) |

## IPlaceOfServiceCodeService

`/api/billing/place-of-service-code`. Service: `services/billing/httpPlaceOfServiceCodeService.ts`; chosen in `placeOfServiceCodeServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/billing/place-of-service-code/get-all` | none |
| `getActiveCodes` | `GET /api/billing/place-of-service-code/get-active-codes` | none |
| `getVersionsForCode` | `GET /api/billing/place-of-service-code/get-versions-for-code` | `code` (query) |
| `getActiveCode` | `GET /api/billing/place-of-service-code/get-active-code` | `code` (query) |

## IRvuCodeMapService

`/api/billing/rvu-code-map`. Service: `services/billing/httpRvuCodeMapService.ts`; chosen in `rvuCodeMapServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAllVersions` | `GET /api/billing/rvu-code-map/get-all-versions` | none |
| `getActiveVersion` | `GET /api/billing/rvu-code-map/get-active-version` | none |
| `getVersionEffectiveAt` | `GET /api/billing/rvu-code-map/get-version-effective-at` | `isoDate` (query) |
| `createVersion` | `POST /api/billing/rvu-code-map/create-version` | `input` (the body) |
| `activateVersion` | `POST /api/billing/rvu-code-map/activate-version` | `versionId` (body fields) |
| `approveVersion` | `POST /api/billing/rvu-code-map/approve-version` | `versionId`, `reviewedBy` (body fields) |
| `rejectVersion` | `POST /api/billing/rvu-code-map/reject-version` | `versionId`, `reviewedBy`, `rejectionReason` (body fields) |

## IServiceChargeService

`/api/billing/service-charge`. Service: `services/billing/httpServiceChargeService.ts`; chosen in `serviceChargeServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `saveCharge` | `PUT /api/billing/service-charge/save-charge` | `record` (the body) |
| `getChargesForCase` | `GET /api/billing/service-charge/get-charges-for-case` | `caseId` (query) |
| `listRuleReferenceKeys` | `GET /api/billing/service-charge/list-rule-reference-keys` | none |
| `findActiveChargeForSource` | `GET /api/billing/service-charge/find-active-charge-for-source` | `caseId`, `specimenId`, `blockId`, `billingCode` (query) |
| `submitForApproval` | `POST /api/billing/service-charge/submit-for-approval` | `chargeId`, `submittedBy`, `actorRole?` (body fields) |
| `approveCharge` | `POST /api/billing/service-charge/approve-charge` | `chargeId`, `approvedBy`, `bypassAuthorized?`, `actorRole?` (body fields) |
| `rejectCharge` | `POST /api/billing/service-charge/reject-charge` | `chargeId`, `reviewedBy`, `rejectionReason`, `actorRole?` (body fields) |
| `holdCharge` | `POST /api/billing/service-charge/hold-charge` | `chargeId`, `heldBy` (body fields) |
| `releaseHold` | `POST /api/billing/service-charge/release-hold` | `chargeId`, `releasedBy` (body fields) |
| `listByApprovalStatus` | `GET /api/billing/service-charge/list-by-approval-status` | `statuses` (query) |

## Batch 617 (part A): the browser's calls for these services (PS-514)

Batch 617 (part A). The server version of each service below, which the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test, chosen by `<name>ServiceInstance.ts`); the India team's API server honours this contract. The rules are `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**Convention (`HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, kebab-case.
- Reads are `GET` with plain arguments in the query string; a read whose arguments are objects, or that carries an accession number, a token, or anything that names a patient, is a `POST` with the arguments in the body (nothing identifying goes in a URL or an access log).
- `delete`, `remove`, `clear`, `revoke` are `DELETE` with the query string; `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. One object argument is the body; several arguments are sent as an object named by the argument names.
- A call that returns a list answers `{ "items": [...] }`; a call that returns one record answers the record; a call that returns a result answers the data, and a failure is the fixed code (`403` NOT_PERMITTED, `404` NOT_FOUND, `409` CONFLICT, `400` INVALID).
- A call that returns nothing answers `200` with an empty body. A call whose answer is never "nothing" (marked *throws*) raises on a failure instead of returning a quiet default.
- *Settled* calls (code import): the business outcome (`ok: false` with `code`, `problems`, `missing`) is a `200` reply holding the interface's own union; a failed call (403, 404, no network) becomes the same union with the fixed code.

### ICodeImportService

Service: `services/billing/httpCodeImportService.ts`; chosen in `codeImportServiceInstance.ts`. Base `/api/billing/code-import`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `listJobs` | `GET /api/billing/code-import/list-jobs` | none | result |
| `getJob` | `GET /api/billing/code-import/get-job` | `jobId` (query) | result |
| `previewImport` | `POST /api/billing/code-import/preview-import` | `rows`, `request` (body fields) | settled |
| `importRows` | `POST /api/billing/code-import/import-rows` | `rows`, `request`, `options?` (body fields) | settled |
| `approveJob` | `POST /api/billing/code-import/approve-job` | `jobId`, `reviewedBy`, `options?` (body fields) | settled |
| `rejectJob` | `POST /api/billing/code-import/reject-job` | `jobId`, `reviewedBy`, `reason`, `options?` (body fields) | settled |
| `rollbackJob` | `POST /api/billing/code-import/rollback-job` | `jobId`, `rolledBackBy`, `reason`, `options?` (body fields) | settled |

### INcciEditService

Service: `services/billing/httpNcciEditService.ts`; chosen in `ncciEditServiceInstance.ts`. Base `/api/billing/ncci-edit`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/billing/ncci-edit/get-all` | none | result |
| `getCurrentImport` | `GET /api/billing/ncci-edit/get-current-import` | none | result |
| `getAllImports` | `GET /api/billing/ncci-edit/get-all-imports` | none | result |
| `importQuarter` | `POST /api/billing/ncci-edit/import-quarter` | `pairs`, `quarterVersion`, `importedBy` (body fields) | result |
| `approveImport` | `POST /api/billing/ncci-edit/approve-import` | `importId`, `reviewedBy` (body fields) | result |
| `rejectImport` | `POST /api/billing/ncci-edit/reject-import` | `importId`, `reviewedBy`, `rejectionReason` (body fields) | result |

### IBillingTypeTriggerConfigService

Service: `services/billing/httpBillingTypeTriggerConfigService.ts`; chosen in `billingTypeTriggerConfigServiceInstance.ts`. Base `/api/billing/billing-type-trigger-config`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getEffectiveTriggerMap` | `GET /api/billing/billing-type-trigger-config/get-effective-trigger-map` | `siteId?` (query) | result |
| `setTriggerOverride` | `PUT /api/billing/billing-type-trigger-config/set-trigger-override` | `map`, `siteId?` (body fields) | result |
| `resetToDefault` | `POST /api/billing/billing-type-trigger-config/reset-to-default` | `siteId?` (body fields) | result |
| `getSiteIdsWithOverrides` | `GET /api/billing/billing-type-trigger-config/get-site-ids-with-overrides` | none | result |


## Batch 618 (PS-336): charge message for a split case

`ChargeCaptureReady` (JSON) gains two optional fields. Each charge has `performingFacilityId`: for a case whose `order.technicalComponentFacilityId` names a different lab than the reporting lab, the `TC` charge carries the technical lab's id and the `26` and `Global` charges carry the reporting lab's id; otherwise every charge carries the reporting lab's id. The message has `technicalComponentFacility { facilityId, cliaOrIsoNumber }` only for a genuinely split case (the technical claim needs that lab's CLIA number; the printed report does not show it). Release times are unchanged: `TC` at grossing, `26` and `Global` at final sign-out. The HL7 DFT message is unchanged; the interface engine maps the JSON fields.
