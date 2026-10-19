# Cytology: the API server's calls (PS-499)

Batch 616. The server version of each cytology service that the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, names in kebab-case.
- Reads (`get`, `list`, `find`, `is`, `has`, `count`, `can`, `resolve`, `load`, `search`, `check`, and similar) are `GET` with the arguments in the query string, repeated for a list, empty values left out. A read whose arguments are not plain values is a `POST` with the arguments as the body.
- `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` with the arguments in the query string. `save`, `set`, `update`, `upsert`, `replace` are `PUT`. Everything else is `POST`.
- A write with one object argument sends that object as the body. A write with several arguments, or plain ones, sends an object named by the argument names.
- Every answer is `{ ok, data }` on success. The data is the body of the 2xx reply as is. `403` is `NOT_PERMITTED`, `404` is `NOT_FOUND`, `409` is `CONFLICT`, `400` is `INVALID`; the server's text is dropped.
- Where an earlier contract names an endpoint for the same data (for example `CYTOLOGY_QC_API.md`, `MOLECULAR_ORDERS_API.md`, `REGISTRY_GO_LIVE_API.md`, `REGISTRY_ACKNOWLEDGEMENT_API.md`), the server may serve both; if the two disagree the earlier, narrower one wins and the table below changes.

## ICytologyCategoryService

`/api/cytology/cytology-category`. Service: `services/cytology/httpCytologyCategoryService.ts`; chosen in `cytologyCategoryServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology/cytology-category/get-all` | none |
| `getActive` | `GET /api/cytology/cytology-category/get-active` | none |
| `getBySection` | `GET /api/cytology/cytology-category/get-by-section` | `section` (query) |
| `getByNomenclatureSystem` | `GET /api/cytology/cytology-category/get-by-nomenclature-system` | `system` (query) |
| `getById` | `GET /api/cytology/cytology-category/get-by-id` | `id` (query) |
| `add` | `POST /api/cytology/cytology-category/add` | `entry` (the body) |
| `update` | `PUT /api/cytology/cytology-category/update` | `id`, `changes` (body fields) |
| `deactivate` | `POST /api/cytology/cytology-category/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/cytology/cytology-category/reactivate` | `id` (body fields) |
| `remove` | `DELETE /api/cytology/cytology-category/remove` | `id` (query) |

## ICytologyHistologyCorrelationSettingsService

`/api/cytology/cytology-histology-correlation-settings`. Service: `services/cytology/httpCytologyHistologyCorrelationSettingsService.ts`; chosen in `cytologyHistologyCorrelationSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cytology/cytology-histology-correlation-settings/get` | none |
| `update` | `PUT /api/cytology/cytology-histology-correlation-settings/update` | `patch` (the body) |
| `reset` | `POST /api/cytology/cytology-histology-correlation-settings/reset` | none |

## IFacilityCytologyHistologyCorrelationOverrideService

`/api/cytology/facility-cytology-histology-correlation-override`. Service: `services/cytology/httpFacilityCytologyHistologyCorrelationOverrideService.ts`; chosen in `facilityCytologyHistologyCorrelationOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology/facility-cytology-histology-correlation-override/get-all` | none |
| `getForFacility` | `GET /api/cytology/facility-cytology-histology-correlation-override/get-for-facility` | `facilityId` (query) |
| `set` | `PUT /api/cytology/facility-cytology-histology-correlation-override/set` | `facilityId`, `overrides` (body fields) |
| `remove` | `DELETE /api/cytology/facility-cytology-histology-correlation-override/remove` | `facilityId` (query) |

## ICytologyInstrumentationService

`/api/cytology/cytology-instrumentation`. Service: `services/cytology/httpCytologyInstrumentationService.ts`; chosen in `cytologyInstrumentationServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cytology/cytology-instrumentation/get` | none |
| `update` | `PUT /api/cytology/cytology-instrumentation/update` | `patch` (the body) |
| `reset` | `POST /api/cytology/cytology-instrumentation/reset` | none |

## ICytologyNomenclatureSettingsService

`/api/cytology/cytology-nomenclature-settings`. Service: `services/cytology/httpCytologyNomenclatureSettingsService.ts`; chosen in `cytologyNomenclatureSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cytology/cytology-nomenclature-settings/get` | none |
| `update` | `PUT /api/cytology/cytology-nomenclature-settings/update` | `patch` (the body) |
| `reset` | `POST /api/cytology/cytology-nomenclature-settings/reset` | none |

## ICytologyOutboundResultQueueService

`/api/cytology/cytology-outbound-result-queue`. Service: `services/cytology/httpCytologyOutboundResultQueueService.ts`; chosen in `cytologyOutboundResultQueueServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology/cytology-outbound-result-queue/get-all` | none |
| `getByCaseId` | `GET /api/cytology/cytology-outbound-result-queue/get-by-case-id` | `caseId` (query) |
| `getBySignOutRecordId` | `GET /api/cytology/cytology-outbound-result-queue/get-by-sign-out-record-id` | `signOutRecordId` (query) |
| `enqueue` | `POST /api/cytology/cytology-outbound-result-queue/enqueue` | `entry` (the body) |
| `getFailed` | `GET /api/cytology/cytology-outbound-result-queue/get-failed` | none |
| `markFailed` | `POST /api/cytology/cytology-outbound-result-queue/mark-failed` | `id`, `failure` (body fields) |
| `retryDispatch` | `POST /api/cytology/cytology-outbound-result-queue/retry-dispatch` | `id` (body fields) |
| `markSent` | `POST /api/cytology/cytology-outbound-result-queue/mark-sent` | `id` (body fields) |

## ICytologyProficiencyTestResultService

`/api/cytology/cytology-proficiency-test-result`. Service: `services/cytology/httpCytologyProficiencyTestResultService.ts`; chosen in `cytologyProficiencyTestResultServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology/cytology-proficiency-test-result/get-all` | none |
| `add` | `POST /api/cytology/cytology-proficiency-test-result/add` | `result` (the body) |

## ICytologyQaReportService

`/api/cytology/cytology-qa-report`. Service: `services/cytology/httpCytologyQaReportService.ts`; chosen in `cytologyQaReportServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get10PercentRandomRescreeningReport` | `POST /api/cytology/cytology-qa-report/get10-percent-random-rescreening-report` | `scope` (the body) |
| `getDirectedHighRiskRescreeningReport` | `POST /api/cytology/cytology-qa-report/get-directed-high-risk-rescreening-report` | `scope` (the body) |
| `getCtVsPathologistCorrelationReport` | `POST /api/cytology/cytology-qa-report/get-ct-vs-pathologist-correlation-report` | `scope` (the body) |
| `getPostSignOutPeerReviewCorrelationReport` | `POST /api/cytology/cytology-qa-report/get-post-sign-out-peer-review-correlation-report` | `scope` (the body) |
| `getPrimaryVsFinalDiagnosisReport` | `POST /api/cytology/cytology-qa-report/get-primary-vs-final-diagnosis-report` | `scope` (the body) |
| `getCtStatisticalComparisonReport` | `POST /api/cytology/cytology-qa-report/get-ct-statistical-comparison-report` | `scope` (the body) |
| `getAscusHpvReflexReport` | `POST /api/cytology/cytology-qa-report/get-ascus-hpv-reflex-report` | `scope` (the body) |
| `getWorkloadTrackingReport` | `POST /api/cytology/cytology-qa-report/get-workload-tracking-report` | `scope`, `timezone?` (body fields) |
| `getRegistryTransmissionAuditReport` | `POST /api/cytology/cytology-qa-report/get-registry-transmission-audit-report` | `scope`, `registryId` (body fields) |
| `getGynCytologySecondaryScreeningAuditReport` | `POST /api/cytology/cytology-qa-report/get-gyn-cytology-secondary-screening-audit-report` | `scope` (the body) |
| `getHistologyCorrelationReport` | `POST /api/cytology/cytology-qa-report/get-histology-correlation-report` | `scope` (the body) |
| `getUnscreenedBacklogReport` | `POST /api/cytology/cytology-qa-report/get-unscreened-backlog-report` | `scope` (the body) |
| `getPrimaryHpvFailsafeAuditReport` | `POST /api/cytology/cytology-qa-report/get-primary-hpv-failsafe-audit-report` | `scope` (the body) |
| `getEuComplianceMatrixReport` | `POST /api/cytology/cytology-qa-report/get-eu-compliance-matrix-report` | `scope` (the body) |
| `getHpvPositivityMonitorReport` | `POST /api/cytology/cytology-qa-report/get-hpv-positivity-monitor-report` | `scope` (the body) |
| `getMolecularQcFailureRateReport` | `POST /api/cytology/cytology-qa-report/get-molecular-qc-failure-rate-report` | `scope` (the body) |
| `getMolecularLotToLotTrendReport` | `POST /api/cytology/cytology-qa-report/get-molecular-lot-to-lot-trend-report` | `scope` (the body) |
| `getApacProficiencyTestReport` | `POST /api/cytology/cytology-qa-report/get-apac-proficiency-test-report` | `scope` (the body) |
| `getFiveYearRetrospectiveLookbackReport` | `POST /api/cytology/cytology-qa-report/get-five-year-retrospective-lookback-report` | `scope` (the body) |

## ICytologyQcSettingsService

`/api/cytology/cytology-qc-settings`. Service: `services/cytology/httpCytologyQcSettingsService.ts`; chosen in `cytologyQcSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cytology/cytology-qc-settings/get` | none |
| `update` | `PUT /api/cytology/cytology-qc-settings/update` | `patch` (the body) |
| `reset` | `POST /api/cytology/cytology-qc-settings/reset` | none |

## ICytologyRegistryOutboundQueueService

`/api/cytology/cytology-registry-outbound-queue`. Service: `services/cytology/httpCytologyRegistryOutboundQueueService.ts`; chosen in `cytologyRegistryOutboundQueueServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology/cytology-registry-outbound-queue/get-all` | none |
| `getByCaseId` | `GET /api/cytology/cytology-registry-outbound-queue/get-by-case-id` | `caseId` (query) |
| `enqueue` | `POST /api/cytology/cytology-registry-outbound-queue/enqueue` | `entry` (the body) |
| `getFailed` | `GET /api/cytology/cytology-registry-outbound-queue/get-failed` | none |
| `markFailed` | `POST /api/cytology/cytology-registry-outbound-queue/mark-failed` | `id`, `failure` (body fields) |
| `retryDispatch` | `POST /api/cytology/cytology-registry-outbound-queue/retry-dispatch` | `id` (body fields) |
| `markSent` | `POST /api/cytology/cytology-registry-outbound-queue/mark-sent` | `id` (body fields) |
| `setRegistryStatus` | `PUT /api/cytology/cytology-registry-outbound-queue/set-registry-status` | `id`, `registryStatus`, `acknowledgement?` (body fields) |
| `setRegistryRevisions` | `PUT /api/cytology/cytology-registry-outbound-queue/set-registry-revisions` | `id`, `revisions` (body fields) |

## ICytologyRegistrySettingsService

`/api/cytology/cytology-registry-settings`. Service: `services/cytology/httpCytologyRegistrySettingsService.ts`; chosen in `cytologyRegistrySettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cytology/cytology-registry-settings/get` | none |
| `update` | `PUT /api/cytology/cytology-registry-settings/update` | `patch` (the body) |
| `reset` | `POST /api/cytology/cytology-registry-settings/reset` | none |

## ICytologyReviewRecordService

`/api/cytology/cytology-review-record`. Service: `services/cytology/httpCytologyReviewRecordService.ts`; chosen in `cytologyReviewRecordServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology/cytology-review-record/get-all` | none |
| `getBySpecimenId` | `GET /api/cytology/cytology-review-record/get-by-specimen-id` | `specimenId` (query) |
| `getByCaseId` | `GET /api/cytology/cytology-review-record/get-by-case-id` | `caseId` (query) |
| `create` | `POST /api/cytology/cytology-review-record/create` | `record` (the body) |
| `update` | `PUT /api/cytology/cytology-review-record/update` | `id`, `requestingUserId`, `changes` (body fields) |

## ICytologyRoutingSettingsService

`/api/cytology/cytology-routing-settings`. Service: `services/cytology/httpCytologyRoutingSettingsService.ts`; chosen in `cytologyRoutingSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cytology/cytology-routing-settings/get` | none |
| `update` | `PUT /api/cytology/cytology-routing-settings/update` | `patch` (the body) |
| `reset` | `POST /api/cytology/cytology-routing-settings/reset` | none |

## ICytologyScreeningHoursService

`/api/cytology/cytology-screening-hours`. Service: `services/cytology/httpCytologyScreeningHoursService.ts`; chosen in `cytologyScreeningHoursServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `forDay` | `POST /api/cytology/cytology-screening-hours/for-day` | `userId`, `date`, `timezone` (body fields) |
| `currentDays` | `POST /api/cytology/cytology-screening-hours/current-days` | `userId`, `timezone` (body fields) |
| `signOff` | `POST /api/cytology/cytology-screening-hours/sign-off` | `user`, `input`, `timezone` (body fields) |
| `getAll` | `GET /api/cytology/cytology-screening-hours/get-all` | none |

## ICytologyScreeningStrategyService

`/api/cytology/cytology-screening-strategy`. Service: `services/cytology/httpCytologyScreeningStrategyService.ts`; chosen in `cytologyScreeningStrategyServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cytology/cytology-screening-strategy/get` | none |
| `update` | `PUT /api/cytology/cytology-screening-strategy/update` | `patch` (the body) |
| `reset` | `POST /api/cytology/cytology-screening-strategy/reset` | none |

## ICytologySignOutRecordService

`/api/cytology/cytology-sign-out-record`. Service: `services/cytology/httpCytologySignOutRecordService.ts`; chosen in `cytologySignOutRecordServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getByCaseId` | `GET /api/cytology/cytology-sign-out-record/get-by-case-id` | `caseId` (query) |
| `getBySpecimenId` | `GET /api/cytology/cytology-sign-out-record/get-by-specimen-id` | `specimenId` (query) |
| `create` | `POST /api/cytology/cytology-sign-out-record/create` | `record` (the body) |
| `markRecalled` | `POST /api/cytology/cytology-sign-out-record/mark-recalled` | `recordId`, `by`, `at` (body fields) |
| `getByCaseIdIncludingRecalled` | `GET /api/cytology/cytology-sign-out-record/get-by-case-id-including-recalled` | `caseId` (query) |

## ICytologyWorkloadCapSettingsService

`/api/cytology/cytology-workload-cap-settings`. Service: `services/cytology/httpCytologyWorkloadCapSettingsService.ts`; chosen in `cytologyWorkloadCapSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cytology/cytology-workload-cap-settings/get` | none |
| `update` | `PUT /api/cytology/cytology-workload-cap-settings/update` | `patch` (the body) |
| `reset` | `POST /api/cytology/cytology-workload-cap-settings/reset` | none |

## ICytologyWorkloadLedgerService

`/api/cytology/cytology-workload-ledger`. Service: `services/cytology/httpCytologyWorkloadLedgerService.ts`; chosen in `cytologyWorkloadLedgerServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `record` | `POST /api/cytology/cytology-workload-ledger/record` | `entry` (the body) |
| `getForUserInWindow` | `GET /api/cytology/cytology-workload-ledger/get-for-user-in-window` | `userId`, `windowStart`, `windowEnd` (query) |
| `getAll` | `GET /api/cytology/cytology-workload-ledger/get-all` | none |

## IFacilityCytologyInstrumentationOverrideService

`/api/cytology/facility-cytology-instrumentation-override`. Service: `services/cytology/httpFacilityCytologyInstrumentationOverrideService.ts`; chosen in `facilityCytologyInstrumentationOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForFacility` | `GET /api/cytology/facility-cytology-instrumentation-override/get-for-facility` | `facilityId` (query) |
| `create` | `POST /api/cytology/facility-cytology-instrumentation-override/create` | `facilityId`, `overrides` (body fields) |
| `update` | `PUT /api/cytology/facility-cytology-instrumentation-override/update` | `facilityId`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/facility-cytology-instrumentation-override/remove` | `facilityId` (query) |

## IFacilityCytologyNomenclatureOverrideService

`/api/cytology/facility-cytology-nomenclature-override`. Service: `services/cytology/httpFacilityCytologyNomenclatureOverrideService.ts`; chosen in `facilityCytologyNomenclatureOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForFacility` | `GET /api/cytology/facility-cytology-nomenclature-override/get-for-facility` | `facilityId` (query) |
| `create` | `POST /api/cytology/facility-cytology-nomenclature-override/create` | `facilityId`, `overrides` (body fields) |
| `update` | `PUT /api/cytology/facility-cytology-nomenclature-override/update` | `facilityId`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/facility-cytology-nomenclature-override/remove` | `facilityId` (query) |

## IFacilityCytologyQcOverrideService

`/api/cytology/facility-cytology-qc-override`. Service: `services/cytology/httpFacilityCytologyQcOverrideService.ts`; chosen in `facilityCytologyQcOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForFacility` | `GET /api/cytology/facility-cytology-qc-override/get-for-facility` | `facilityId` (query) |
| `create` | `POST /api/cytology/facility-cytology-qc-override/create` | `facilityId`, `overrides` (body fields) |
| `update` | `PUT /api/cytology/facility-cytology-qc-override/update` | `facilityId`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/facility-cytology-qc-override/remove` | `facilityId` (query) |

## IFacilityCytologyRegistryOverrideService

`/api/cytology/facility-cytology-registry-override`. Service: `services/cytology/httpFacilityCytologyRegistryOverrideService.ts`; chosen in `facilityCytologyRegistryOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForFacility` | `GET /api/cytology/facility-cytology-registry-override/get-for-facility` | `facilityId` (query) |
| `create` | `POST /api/cytology/facility-cytology-registry-override/create` | `facilityId`, `overrides` (body fields) |
| `update` | `PUT /api/cytology/facility-cytology-registry-override/update` | `facilityId`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/facility-cytology-registry-override/remove` | `facilityId` (query) |

## IFacilityCytologyRoutingOverrideService

`/api/cytology/facility-cytology-routing-override`. Service: `services/cytology/httpFacilityCytologyRoutingOverrideService.ts`; chosen in `facilityCytologyRoutingOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForFacility` | `GET /api/cytology/facility-cytology-routing-override/get-for-facility` | `facilityId` (query) |
| `create` | `POST /api/cytology/facility-cytology-routing-override/create` | `facilityId`, `overrides` (body fields) |
| `update` | `PUT /api/cytology/facility-cytology-routing-override/update` | `facilityId`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/facility-cytology-routing-override/remove` | `facilityId` (query) |

## IFacilityCytologyScreeningStrategyOverrideService

`/api/cytology/facility-cytology-screening-strategy-override`. Service: `services/cytology/httpFacilityCytologyScreeningStrategyOverrideService.ts`; chosen in `facilityCytologyScreeningStrategyOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForFacility` | `GET /api/cytology/facility-cytology-screening-strategy-override/get-for-facility` | `facilityId` (query) |
| `create` | `POST /api/cytology/facility-cytology-screening-strategy-override/create` | `facilityId`, `overrides` (body fields) |
| `update` | `PUT /api/cytology/facility-cytology-screening-strategy-override/update` | `facilityId`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/facility-cytology-screening-strategy-override/remove` | `facilityId` (query) |

## IFacilityCytologyWorkloadCapOverrideService

`/api/cytology/facility-cytology-workload-cap-override`. Service: `services/cytology/httpFacilityCytologyWorkloadCapOverrideService.ts`; chosen in `facilityCytologyWorkloadCapOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForFacility` | `GET /api/cytology/facility-cytology-workload-cap-override/get-for-facility` | `facilityId` (query) |
| `getAll` | `GET /api/cytology/facility-cytology-workload-cap-override/get-all` | none |
| `create` | `POST /api/cytology/facility-cytology-workload-cap-override/create` | `facilityId`, `overrides` (body fields) |
| `update` | `PUT /api/cytology/facility-cytology-workload-cap-override/update` | `facilityId`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/facility-cytology-workload-cap-override/remove` | `facilityId` (query) |

## IMolecularQcRunRecordService

`/api/cytology/molecular-qc-run-record`. Service: `services/cytology/httpMolecularQcRunRecordService.ts`; chosen in `molecularQcRunRecordServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology/molecular-qc-run-record/get-all` | none |
| `add` | `POST /api/cytology/molecular-qc-run-record/add` | `record` (the body) |

## INonGynCytologyCategoryService

`/api/cytology/non-gyn-cytology-category`. Service: `services/cytology/httpNonGynCytologyCategoryService.ts`; chosen in `nonGynCytologyCategoryServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology/non-gyn-cytology-category/get-all` | none |
| `getActive` | `GET /api/cytology/non-gyn-cytology-category/get-active` | none |
| `getBySystem` | `GET /api/cytology/non-gyn-cytology-category/get-by-system` | `system` (query) |
| `getById` | `GET /api/cytology/non-gyn-cytology-category/get-by-id` | `id` (query) |
| `add` | `POST /api/cytology/non-gyn-cytology-category/add` | `entry` (the body) |
| `update` | `PUT /api/cytology/non-gyn-cytology-category/update` | `id`, `changes` (body fields) |
| `deactivate` | `POST /api/cytology/non-gyn-cytology-category/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/cytology/non-gyn-cytology-category/reactivate` | `id` (body fields) |
| `remove` | `DELETE /api/cytology/non-gyn-cytology-category/remove` | `id` (query) |

## IScreeningIntervalService

`/api/cytology/screening-interval`. Service: `services/cytology/httpScreeningIntervalService.ts`; chosen in `screeningIntervalServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/cytology/screening-interval/get` | none |
| `save` | `PUT /api/cytology/screening-interval/save` | `rules` (the body) |

## ISnomedCervicalHistologySeverityMappingService

`/api/cytology/snomed-cervical-histology-severity-mapping`. Service: `services/cytology/httpSnomedCervicalHistologySeverityMappingService.ts`; chosen in `snomedCervicalHistologySeverityMappingServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology/snomed-cervical-histology-severity-mapping/get-all` | none |
| `add` | `POST /api/cytology/snomed-cervical-histology-severity-mapping/add` | `entry` (the body) |
| `update` | `PUT /api/cytology/snomed-cervical-histology-severity-mapping/update` | `id`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/snomed-cervical-histology-severity-mapping/remove` | `id` (query) |

## IStaffCytologyQcOverrideService

`/api/cytology/staff-cytology-qc-override`. Service: `services/cytology/httpStaffCytologyQcOverrideService.ts`; chosen in `staffCytologyQcOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForStaff` | `GET /api/cytology/staff-cytology-qc-override/get-for-staff` | `staffUserId` (query) |
| `create` | `POST /api/cytology/staff-cytology-qc-override/create` | `staffUserId`, `overrides` (body fields) |
| `update` | `PUT /api/cytology/staff-cytology-qc-override/update` | `staffUserId`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/staff-cytology-qc-override/remove` | `staffUserId` (query) |

## IStaffCytologyWorkloadCapOverrideService

`/api/cytology/staff-cytology-workload-cap-override`. Service: `services/cytology/httpStaffCytologyWorkloadCapOverrideService.ts`; chosen in `staffCytologyWorkloadCapOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForStaff` | `GET /api/cytology/staff-cytology-workload-cap-override/get-for-staff` | `staffUserId` (query) |
| `create` | `POST /api/cytology/staff-cytology-workload-cap-override/create` | `staffUserId`, `overrides` (body fields) |
| `update` | `PUT /api/cytology/staff-cytology-workload-cap-override/update` | `staffUserId`, `changes` (body fields) |
| `remove` | `DELETE /api/cytology/staff-cytology-workload-cap-override/remove` | `staffUserId` (query) |

## ICytologyQcCaseAssignmentService

`/api/cytology-qc/cytology-qc-case-assignment`. Service: `services/cytologyQc/httpCytologyQcCaseAssignmentService.ts`; chosen in `cytologyQcCaseAssignmentServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology-qc/cytology-qc-case-assignment/get-all` | none |
| `getById` | `GET /api/cytology-qc/cytology-qc-case-assignment/get-by-id` | `id` (query) |
| `getByCaseId` | `GET /api/cytology-qc/cytology-qc-case-assignment/get-by-case-id` | `caseId` (query) |
| `getUnifiedQueue` | `GET /api/cytology-qc/cytology-qc-case-assignment/get-unified-queue` | none |
| `create` | `POST /api/cytology-qc/cytology-qc-case-assignment/create` | `assignment` (the body) |
| `applyAdditionalTrigger` | `POST /api/cytology-qc/cytology-qc-case-assignment/apply-additional-trigger` | `id`, `changes` (body fields) |
| `assignReviewer` | `POST /api/cytology-qc/cytology-qc-case-assignment/assign-reviewer` | `id`, `reviewerId` (body fields) |
| `recordConcurrence` | `POST /api/cytology-qc/cytology-qc-case-assignment/record-concurrence` | `id`, `reviewerCommentary?` (body fields) |
| `recordDiscrepancy` | `POST /api/cytology-qc/cytology-qc-case-assignment/record-discrepancy` | `id`, `discrepancy` (body fields) |
| `escalateForSlaBreach` | `POST /api/cytology-qc/cytology-qc-case-assignment/escalate-for-sla-breach` | `id`, `now`, `reason` (body fields) |
| `supervisorBypass` | `POST /api/cytology-qc/cytology-qc-case-assignment/supervisor-bypass` | `id`, `supervisorId`, `justification` (body fields) |

## ICytologyQcRuleService

`/api/cytology-qc/cytology-qc-rule`. Service: `services/cytologyQc/httpCytologyQcRuleService.ts`; chosen in `cytologyQcRuleServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cytology-qc/cytology-qc-rule/get-all` | none |
| `getActive` | `GET /api/cytology-qc/cytology-qc-rule/get-active` | none |
| `getById` | `GET /api/cytology-qc/cytology-qc-rule/get-by-id` | `id` (query) |
| `add` | `POST /api/cytology-qc/cytology-qc-rule/add` | `rule` (the body) |
| `update` | `PUT /api/cytology-qc/cytology-qc-rule/update` | `id`, `changes` (body fields) |
| `deactivate` | `POST /api/cytology-qc/cytology-qc-rule/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/cytology-qc/cytology-qc-rule/reactivate` | `id` (body fields) |
| `remove` | `DELETE /api/cytology-qc/cytology-qc-rule/remove` | `id` (query) |
| `duplicate` | `POST /api/cytology-qc/cytology-qc-rule/duplicate` | `id`, `name` (body fields) |

## Batch 617 (part A): the browser's calls for these services (PS-514)

Batch 617 (part A). The server version of each service below, which the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test, chosen by `<name>ServiceInstance.ts`); the India team's API server honours this contract. The rules are `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**Convention (`HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, kebab-case.
- Reads are `GET` with plain arguments in the query string; a read whose arguments are objects, or that carries an accession number, a token, or anything that names a patient, is a `POST` with the arguments in the body (nothing identifying goes in a URL or an access log).
- `delete`, `remove`, `clear`, `revoke` are `DELETE` with the query string; `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. One object argument is the body; several arguments are sent as an object named by the argument names.
- A call that returns a list answers `{ "items": [...] }`; a call that returns one record answers the record; a call that returns a result answers the data, and a failure is the fixed code (`403` NOT_PERMITTED, `404` NOT_FOUND, `409` CONFLICT, `400` INVALID).
- A call that returns nothing answers `200` with an empty body. A call whose answer is never "nothing" (marked *throws*) raises on a failure instead of returning a quiet default.
- *Settled* calls (code import): the business outcome (`ok: false` with `code`, `problems`, `missing`) is a `200` reply holding the interface's own union; a failed call (403, 404, no network) becomes the same union with the fixed code.

### ICytologyProficiencyPanelService

Service: `services/cytology/httpCytologyProficiencyPanelService.ts`; chosen in `cytologyProficiencyPanelServiceInstance.ts`. Base `/api/cytology/cytology-proficiency-panel`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/cytology/cytology-proficiency-panel/get-all` | none | result |
| `submit` | `POST /api/cytology/cytology-proficiency-panel/submit` | `draft`, `user` (body fields) | result |
| `applySimulatedResult` | `POST /api/cytology/cytology-proficiency-panel/apply-simulated-result` | `id`, `user` (body fields) | result |

### IPathologyLexiconService

Service: `services/cytology/httpPathologyLexiconService.ts`; chosen in `pathologyLexiconServiceInstance.ts`. Base `/api/cytology/pathology-lexicon`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/cytology/pathology-lexicon/get-all` | none | result |

### ICytologyComplianceFeaturesService

Service: `services/cytology/httpCytologyComplianceFeaturesService.ts`; chosen in `cytologyComplianceFeaturesServiceInstance.ts`. Base `/api/cytology/cytology-compliance-features`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `get` | `GET /api/cytology/cytology-compliance-features/get` | none | record (throws) |
| `forFacility` | `GET /api/cytology/cytology-compliance-features/for-facility` | `facilityId` (query) | record (throws) |
| `setEnterprise` | `PUT /api/cytology/cytology-compliance-features/set-enterprise` | `settings` (the body) | nothing |
| `setFacility` | `PUT /api/cytology/cytology-compliance-features/set-facility` | `facilityId`, `settings` (body fields) | nothing |

