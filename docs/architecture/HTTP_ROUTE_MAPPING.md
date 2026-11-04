# Server routes: earlier path to current path (Batch 617)

Batch 617 moved every server (HTTP) version of a service to one route style (`HTTP_SERVICES_PATTERN.md` §7): `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. This table lists, for each converted service, the route it had before (a REST resource path and verb) and the route it has now. An id that was in the path is now in the query string or the body; a `PUT`, `PATCH` or `DELETE` is now a `POST`. The body of a command keeps its old meaning (a reason is still only the reason) plus the key that used to be in the path.

The three files with their own contracts (`exports/httpExportApi.ts`, `reportDocuments/httpReportDocumentService.ts`, `reports/httpReportVersionService.ts`) were not changed.

The six outbound-queue services (accession, patient ADT, LIS sync, result, and the two other queues) share `apiServer/outboundQueueRoutes.ts`: `get-all`, `get-failed`, `get-by-case-id` (GET, `?caseId=`), `enqueue` (body is the entry), `mark-failed` (body `{ id, ...failure }`), `retry-dispatch` (body `{ id }`), `mark-sent` (body `{ id }`) under each queue's own base. Their earlier paths were `/api/outbound/<queue>[/{id}/failed|retry|sent]` and `/api/cases/{caseId}/outbound/<queue>`.

## `access/httpAccessRequestService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST /api/access-requests` | `POST /api/access/access-request/create` |
| `deny` | `POST /api/access-requests/{id}/deny` | `POST /api/access/access-request/deny` |
| `getAll` | `GET /api/access-requests` | `GET /api/access/access-request/get-all` |
| `getAllForUser` | `GET /api/users/{userId}/access-requests` | `GET /api/access/access-request/get-all-for-user` |
| `getPending` | `GET /api/access-requests?status=pending` | `GET /api/access/access-request/get-pending` |
| `grant` | `POST /api/access-requests/{id}/grant` | `POST /api/access/access-request/grant` |
| `revoke` | `POST /api/access-requests/{id}/revoke` | `POST /api/access/access-request/revoke` |

## `accessioning/httpAccessionOutboundQueueService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getByCaseId` | `GET /api/cases/{caseId}/outbound/accessions` | `GET /api/accessioning/accession-outbound-queue/get-by-case-id` |

## `aiIntegration/httpAiVendorPolicyService.ts`

| Method | Earlier | Now |
|---|---|---|
| `list` | `GET /api/ai-vendor-policy/rules` | `GET /api/ai-integration/ai-vendor-policy/list` |
| `remove` | `DELETE /api/ai-vendor-policy/rules{queryString({ jurisdiction: scope.jurisdiction, facilityId: scope.facilityId })}` | `POST /api/ai-integration/ai-vendor-policy/remove` |
| `rulesForCheck` | `GET /api/ai-vendor-policy/rules` | `GET /api/ai-integration/ai-vendor-policy/rules-for-check` |
| `save` | `PUT /api/ai-vendor-policy/rules` | `POST /api/ai-integration/ai-vendor-policy/save` |
| `served` | `GET /api/ai-vendor-policy/served` | `GET /api/ai-integration/ai-vendor-policy/served` |

## `auditlog/httpAuditService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getAuditLogs` | `GET /api/audit/logs{queryString({
      type: f?.type === 'all' ? undefined : f?.type, user: f?.user === 'all' ? undefined : f?.user,
      dateFrom: f?.dateFrom, dateTo: f?.dateTo, search: f?.search,
    })}` | `POST /api/auditlog/audit/get-audit-logs` |
| `getErrorLogs` | `GET /api/audit/errors{queryString({
      severity: f?.severity === 'all' ? undefined : f?.severity,
      resolved: f?.resolved === 'all' || f?.resolved === undefined ? undefined : f.resolved,
      search: f?.search,
    })}` | `POST /api/auditlog/audit/get-error-logs` |
| `logError` | `POST /api/audit/errors` | `POST /api/auditlog/audit/log-error` |
| `logEvent` | `POST /api/audit/logs` | `POST /api/auditlog/audit/log-event` |
| `resolveError` | `POST /api/audit/errors/{id}/resolve` | `POST /api/auditlog/audit/resolve-error` |

## `authorization/httpAuthorizationService.ts`

| Method | Earlier | Now |
|---|---|---|
| `enforce` | `POST /api/authorization/enforce` | `POST /api/authorization/authorization/enforce` |
| `evaluate` | `POST /api/authorization/evaluate` | `POST /api/authorization/authorization/evaluate` |
| `grantedCapabilities` | `GET /api/authorization/granted` | `GET /api/authorization/authorization/granted-capabilities` |
| `snapshot` | `GET /api/authorization/snapshot` | `GET /api/authorization/authorization/snapshot` |

## `biometric/httpBiometricService.ts`

| Method | Earlier | Now |
|---|---|---|
| `completeEnrolment` | `POST {u(userId)}/enrolment` | `POST /api/biometric/biometric/complete-enrolment` |
| `completeVerification` | `POST {u(userId)}/verification` | `POST /api/biometric/biometric/complete-verification` |
| `dismissWizard` | `POST {u(userId)}/wizard/dismiss` | `POST /api/biometric/biometric/dismiss-wizard` |
| `getCredential` | `GET {u(userId)}/credential` | `GET /api/biometric/biometric/get-credential` |
| `getEnrolmentChallenge` | `POST {u(userId)}/enrolment-challenge` | `POST /api/biometric/biometric/get-enrolment-challenge` |
| `getPolicy` | `GET /api/biometric/policy` | `GET /api/biometric/biometric/get-policy` |
| `getVerificationChallenge` | `POST {u(userId)}/verification-challenge` | `POST /api/biometric/biometric/get-verification-challenge` |
| `isBiometricCurrentForUser` | `GET {u(userId)}/current` | `GET /api/biometric/biometric/is-biometric-current-for-user` |
| `revokeCredential` | `DELETE {u(userId)}/credential` | `POST /api/biometric/biometric/revoke-credential` |
| `savePolicy` | `PUT /api/biometric/policy` | `POST /api/biometric/biometric/save-policy` |
| `shouldShowWizard` | `GET {u(userId)}/wizard` | `GET /api/biometric/biometric/should-show-wizard` |

## `cases/httpCaseService.ts`

| Method | Earlier | Now |
|---|---|---|
| `createCase` | `POST /api/cases` | `POST /api/cases/case/create-case` |
| `getAll` | `GET /api/cases?…` | `POST /api/cases/case/get-all` |
| `getCase` | `GET /api/cases/{id}` | `GET /api/cases/case/get-case` |
| `listCasesForUser` | `GET /api/users/{userId}/cases` | `GET /api/cases/case/list-cases-for-user` |
| `updateCase` | `PATCH /api/cases/{id}` | `POST /api/cases/case/update-case` |

## `cassetteColors/httpCassetteColorService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST /api/cassette-colors` | `POST /api/cassette-colors/cassette-color/create` |
| `deactivate` | `POST /api/cassette-colors/{id}/deactivate` | `POST /api/cassette-colors/cassette-color/deactivate` |
| `getAll` | `GET /api/cassette-colors` | `GET /api/cassette-colors/cassette-color/get-all` |
| `getById` | `GET /api/cassette-colors/{id}` | `GET /api/cassette-colors/cassette-color/get-by-id` |
| `getByKey` | `GET /api/cassette-colors/by-key/{key}` | `GET /api/cassette-colors/cassette-color/get-by-key` |
| `reactivate` | `POST /api/cassette-colors/{id}/reactivate` | `POST /api/cassette-colors/cassette-color/reactivate` |
| `update` | `PATCH /api/cassette-colors/{id}` | `POST /api/cassette-colors/cassette-color/update` |

## `cassetteRouting/httpCassetteRoutingRuleService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST create` | `POST /api/cassette-routing/cassette-routing-rule/create` |
| `deactivate` | `POST deactivate` | `POST /api/cassette-routing/cassette-routing-rule/deactivate` |
| `getAll` | `GET /api/cassette-routing-rules` | `GET /api/cassette-routing/cassette-routing-rule/get-all` |
| `getById` | `GET getById` | `GET /api/cassette-routing/cassette-routing-rule/get-by-id` |
| `reactivate` | `POST reactivate` | `POST /api/cassette-routing/cassette-routing-rule/reactivate` |
| `update` | `PATCH update` | `POST /api/cassette-routing/cassette-routing-rule/update` |

## `coldChain/httpStorageConditionTypeService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/cold-chain/storage-condition-type/add` |
| `deactivate` | `POST deactivate` | `POST /api/cold-chain/storage-condition-type/deactivate` |
| `getActive` | `GET /api/cold-chain/condition-types/active` | `GET /api/cold-chain/storage-condition-type/get-active` |
| `getAll` | `GET /api/cold-chain/condition-types` | `GET /api/cold-chain/storage-condition-type/get-all` |
| `getById` | `GET getById` | `GET /api/cold-chain/storage-condition-type/get-by-id` |
| `reactivate` | `POST reactivate` | `POST /api/cold-chain/storage-condition-type/reactivate` |
| `remove` | `DELETE remove` | `POST /api/cold-chain/storage-condition-type/remove` |
| `update` | `PATCH update` | `POST /api/cold-chain/storage-condition-type/update` |

## `coldChain/httpStorageUnitService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/cold-chain/storage-unit/add` |
| `deactivate` | `POST deactivate` | `POST /api/cold-chain/storage-unit/deactivate` |
| `getActive` | `GET /api/cold-chain/storage-units/active` | `GET /api/cold-chain/storage-unit/get-active` |
| `getAll` | `GET /api/cold-chain/storage-units` | `GET /api/cold-chain/storage-unit/get-all` |
| `getById` | `GET getById` | `GET /api/cold-chain/storage-unit/get-by-id` |
| `update` | `PATCH update` | `POST /api/cold-chain/storage-unit/update` |

## `coldChain/httpTelemetryReadingService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getAll` | `GET /api/cold-chain/readings` | `GET /api/cold-chain/telemetry-reading/get-all` |
| `getByAsset` | `GET getByAsset` | `GET /api/cold-chain/telemetry-reading/get-by-asset` |
| `getExcursions` | `GET /api/cold-chain/readings/excursions` | `GET /api/cold-chain/telemetry-reading/get-excursions` |
| `record` | `POST record` | `POST /api/cold-chain/telemetry-reading/record` |

## `containerTypes/httpContainerTypeService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST /api/container-types` | `POST /api/container-types/container-type/create` |
| `deactivate` | `POST /api/container-types/{id}/deactivate` | `POST /api/container-types/container-type/deactivate` |
| `getAll` | `GET /api/container-types` | `GET /api/container-types/container-type/get-all` |
| `getById` | `GET /api/container-types/{id}` | `GET /api/container-types/container-type/get-by-id` |
| `reactivate` | `POST /api/container-types/{id}/reactivate` | `POST /api/container-types/container-type/reactivate` |
| `update` | `PATCH /api/container-types/{id}` | `POST /api/container-types/container-type/update` |

## `deficiencies/httpDeficiencyTypeService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/deficiencies/deficiency-type/add` |
| `deactivate` | `POST deactivate` | `POST /api/deficiencies/deficiency-type/deactivate` |
| `getAll` | `GET /api/deficiency-types` | `GET /api/deficiencies/deficiency-type/get-all` |
| `reactivate` | `POST reactivate` | `POST /api/deficiencies/deficiency-type/reactivate` |
| `update` | `PATCH update` | `POST /api/deficiencies/deficiency-type/update` |

## `deficiencies/httpManagementReviewService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST create` | `POST /api/deficiencies/management-review/create` |
| `getAll` | `GET /api/management-reviews` | `GET /api/deficiencies/management-review/get-all` |

## `deficiencies/httpResolutionTypeService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/deficiencies/resolution-type/add` |
| `deactivate` | `POST deactivate` | `POST /api/deficiencies/resolution-type/deactivate` |
| `getAll` | `GET /api/resolution-types` | `GET /api/deficiencies/resolution-type/get-all` |
| `reactivate` | `POST reactivate` | `POST /api/deficiencies/resolution-type/reactivate` |
| `update` | `PATCH update` | `POST /api/deficiencies/resolution-type/update` |

## `deficiencies/httpSpecimenDeficiencyService.ts`

| Method | Earlier | Now |
|---|---|---|
| `containImmediately` | `POST containImmediately` | `POST /api/deficiencies/specimen-deficiency/contain-immediately` |
| `getAll` | `GET /api/specimen-deficiencies` | `GET /api/deficiencies/specimen-deficiency/get-all` |
| `getByCaseId` | `GET getByCaseId` | `GET /api/deficiencies/specimen-deficiency/get-by-case-id` |
| `getBySpecimenId` | `GET getBySpecimenId` | `GET /api/deficiencies/specimen-deficiency/get-by-specimen-id` |
| `markReviewed` | `POST markReviewed` | `POST /api/deficiencies/specimen-deficiency/mark-reviewed` |
| `raise` | `POST raise` | `POST /api/deficiencies/specimen-deficiency/raise` |
| `raiseAndResolve` | `POST raiseAndResolve` | `POST /api/deficiencies/specimen-deficiency/raise-and-resolve` |
| `resolve` | `POST resolve` | `POST /api/deficiencies/specimen-deficiency/resolve` |
| `verifyEffectiveness` | `POST verifyEffectiveness` | `POST /api/deficiencies/specimen-deficiency/verify-effectiveness` |

## `departments/httpDepartmentService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/departments` | `POST /api/departments/department/add` |
| `deactivate` | `POST /api/departments/{id}/deactivate` | `POST /api/departments/department/deactivate` |
| `findOrCreateByName` | `POST /api/departments/resolve` | `POST /api/departments/department/find-or-create-by-name` |
| `getAll` | `GET /api/departments` | `GET /api/departments/department/get-all` |
| `getById` | `GET /api/departments/{id}` | `GET /api/departments/department/get-by-id` |
| `update` | `PATCH /api/departments/{id}` | `POST /api/departments/department/update` |
| `verify` | `POST /api/departments/{id}/verify` | `POST /api/departments/department/verify` |

## `digitalPathology/httpAiScreeningResultService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getAll` | `GET /api/dp/ai-screening-results` | `GET /api/digital-pathology/ai-screening-result/get-all` |
| `getByCaseId` | `GET getByCaseId` | `GET /api/digital-pathology/ai-screening-result/get-by-case-id` |
| `getById` | `GET getById` | `GET /api/digital-pathology/ai-screening-result/get-by-id` |
| `markCompleted` | `POST markCompleted` | `POST /api/digital-pathology/ai-screening-result/mark-completed` |
| `markFailed` | `POST markFailed` | `POST /api/digital-pathology/ai-screening-result/mark-failed` |
| `markTimedOut` | `POST markTimedOut` | `POST /api/digital-pathology/ai-screening-result/mark-timed-out` |
| `order` | `POST order` | `POST /api/digital-pathology/ai-screening-result/order` |
| `recordHumanConcordance` | `POST recordHumanConcordance` | `POST /api/digital-pathology/ai-screening-result/record-human-concordance` |

## `digitalPathology/httpAiStalledResultSettingsService.ts`

| Method | Earlier | Now |
|---|---|---|
| `get` | `GET /api/dp/ai-stalled-result-settings` | `GET /api/digital-pathology/ai-stalled-result-settings/get` |
| `update` | `PUT update` | `POST /api/digital-pathology/ai-stalled-result-settings/update` |

## `digitalPathology/httpDpVendorService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/digital-pathology/dp-vendor/add` |
| `deactivate` | `POST deactivate` | `POST /api/digital-pathology/dp-vendor/deactivate` |
| `getActive` | `GET /api/dp/vendors/active` | `GET /api/digital-pathology/dp-vendor/get-active` |
| `getAll` | `GET /api/dp/vendors` | `GET /api/digital-pathology/dp-vendor/get-all` |
| `getById` | `GET getById` | `GET /api/digital-pathology/dp-vendor/get-by-id` |
| `getByModality` | `GET getByModality` | `GET /api/digital-pathology/dp-vendor/get-by-modality` |
| `reactivate` | `POST reactivate` | `POST /api/digital-pathology/dp-vendor/reactivate` |
| `remove` | `DELETE remove` | `POST /api/digital-pathology/dp-vendor/remove` |
| `update` | `PATCH update` | `POST /api/digital-pathology/dp-vendor/update` |

## `digitalPathology/httpWsiScanBatchService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST create` | `POST /api/digital-pathology/wsi-scan-batch/create` |
| `getAll` | `GET /api/dp/scan-batches` | `GET /api/digital-pathology/wsi-scan-batch/get-all` |
| `getById` | `GET getById` | `GET /api/digital-pathology/wsi-scan-batch/get-by-id` |
| `markDispatched` | `POST markDispatched` | `POST /api/digital-pathology/wsi-scan-batch/mark-dispatched` |
| `markUnloaded` | `POST markUnloaded` | `POST /api/digital-pathology/wsi-scan-batch/mark-unloaded` |
| `recordSendFailure` | `POST recordSendFailure` | `POST /api/digital-pathology/wsi-scan-batch/record-send-failure` |
| `updateSlideStatus` | `PATCH updateSlideStatus` | `POST /api/digital-pathology/wsi-scan-batch/update-slide-status` |

## `digitalPathology/httpWsiViewerVendorService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/digital-pathology/wsi-viewer-vendor/add` |
| `deactivate` | `POST deactivate` | `POST /api/digital-pathology/wsi-viewer-vendor/deactivate` |
| `getActive` | `GET /api/dp/viewer-vendors/active` | `GET /api/digital-pathology/wsi-viewer-vendor/get-active` |
| `getAll` | `GET /api/dp/viewer-vendors` | `GET /api/digital-pathology/wsi-viewer-vendor/get-all` |
| `getById` | `GET getById` | `GET /api/digital-pathology/wsi-viewer-vendor/get-by-id` |
| `reactivate` | `POST reactivate` | `POST /api/digital-pathology/wsi-viewer-vendor/reactivate` |
| `remove` | `DELETE remove` | `POST /api/digital-pathology/wsi-viewer-vendor/remove` |
| `update` | `PATCH update` | `POST /api/digital-pathology/wsi-viewer-vendor/update` |

## `drafts/httpDraftCacheService.ts`

| Method | Earlier | Now |
|---|---|---|
| `clearAllDraftsForUser` | `DELETE /api/users/{userId}/drafts` | `POST /api/drafts/draft-cache/clear-all-drafts-for-user` |
| `clearDraft` | `DELETE /api/users/{userId}/drafts/{entityId}` | `POST /api/drafts/draft-cache/clear-draft` |
| `getDraft` | `GET /api/users/{userId}/drafts/{entityId}` | `GET /api/drafts/draft-cache/get-draft` |
| `saveDraft` | `PUT /api/users/{userId}/drafts/{entityId}` | `POST /api/drafts/draft-cache/save-draft` |

## `encounters/httpEncounterService.ts`

| Method | Earlier | Now |
|---|---|---|
| `cancelTransfer` | `POST cancel-transfer` | `POST /api/encounters/encounter/cancel-transfer` |
| `changeEncounterNumber` | `POST number` | `POST /api/encounters/encounter/change-encounter-number` |
| `getByEncounterNumber` | `POST /api/organisations/{org}/encounters/lookup` | `POST /api/encounters/encounter/get-by-encounter-number` |
| `getById` | `GET /api/encounters/{id}` | `GET /api/encounters/encounter/get-by-id` |
| `listForPatient` | `GET /api/patients/{patientId}/encounters` | `GET /api/encounters/encounter/list-for-patient` |
| `reassignPatient` | `POST reassign` | `POST /api/encounters/encounter/reassign-patient` |
| `resolveOrCreateEncounter` | `POST /api/encounters/resolve` | `POST /api/encounters/encounter/resolve-or-create-encounter` |
| `updateClass` | `PATCH class` | `POST /api/encounters/encounter/update-class` |
| `updateDiagnoses` | `PUT diagnoses` | `POST /api/encounters/encounter/update-diagnoses` |
| `updateLocation` | `PATCH location` | `POST /api/encounters/encounter/update-location` |
| `updateMetadata` | `PATCH metadata` | `POST /api/encounters/encounter/update-metadata` |
| `updateStatus` | `PATCH status` | `POST /api/encounters/encounter/update-status` |

## `facilities/httpFacilityService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/facilities` | `POST /api/facilities/facility/add` |
| `deactivate` | `POST /api/facilities/{id}/deactivate` | `POST /api/facilities/facility/deactivate` |
| `findOrCreateByAssigningAuthority` | `POST /api/facilities/resolve` | `POST /api/facilities/facility/find-or-create-by-assigning-authority` |
| `getAll` | `GET /api/facilities` | `GET /api/facilities/facility/get-all` |
| `getById` | `GET /api/facilities/{id}` | `GET /api/facilities/facility/get-by-id` |
| `reactivate` | `POST /api/facilities/{id}/reactivate` | `POST /api/facilities/facility/reactivate` |
| `setPrintSettings` | `PUT /api/facilities/{id}/print-settings` | `POST /api/facilities/facility/set-print-settings` |
| `update` | `PATCH /api/facilities/{id}` | `POST /api/facilities/facility/update` |
| `verify` | `POST /api/facilities/{id}/verify` | `POST /api/facilities/facility/verify` |

## `facilities/httpRegistrySettingsService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `PUT /api/facilities/{facilityId}/registry-override` | `POST /api/facilities/facility-registry-override/create` |
| `get` | `GET /api/registry-settings` | `GET /api/facilities/registry-settings/get` |
| `getForFacility` | `GET /api/facilities/{facilityId}/registry-override` | `GET /api/facilities/facility-registry-override/get-for-facility` |
| `remove` | `DELETE /api/facilities/{facilityId}/registry-override` | `POST /api/facilities/facility-registry-override/remove` |
| `reset` | `POST /api/registry-settings/reset` | `POST /api/facilities/registry-settings/reset` |
| `update` (override) | `PATCH /api/facilities/{facilityId}/registry-override` | `POST /api/facilities/facility-registry-override/update` |
| `update` (settings) | `PATCH /api/registry-settings` | `POST /api/facilities/registry-settings/update` |

## `facilityOpsDashboard/httpDisplayProfileService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/facility-ops-dashboard/display-profile/add` |
| `deactivate` | `POST deactivate` | `POST /api/facility-ops-dashboard/display-profile/deactivate` |
| `getActive` | `GET /api/ops-dashboard/display-profiles/active` | `GET /api/facility-ops-dashboard/display-profile/get-active` |
| `getAll` | `GET /api/ops-dashboard/display-profiles` | `GET /api/facility-ops-dashboard/display-profile/get-all` |
| `getById` | `GET getById` | `GET /api/facility-ops-dashboard/display-profile/get-by-id` |
| `update` | `PATCH update` | `POST /api/facility-ops-dashboard/display-profile/update` |

## `flags/httpFlagService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/flags` | `POST /api/flags/flag/add` |
| `deactivate` | `POST /api/flags/{id}/deactivate` | `POST /api/flags/flag/deactivate` |
| `getAll` | `GET /api/flags` | `GET /api/flags/flag/get-all` |
| `getById` | `GET /api/flags/{id}` | `GET /api/flags/flag/get-by-id` |
| `reactivate` | `POST /api/flags/{id}/reactivate` | `POST /api/flags/flag/reactivate` |
| `update` | `PATCH /api/flags/{id}` | `POST /api/flags/flag/update` |

## `followUp/httpFollowUpService.ts`

| Method | Earlier | Now |
|---|---|---|
| `emailClinician` | `POST /api/follow-ups/{enc(ref.key)}/clinician-email` | `POST /api/follow-up/follow-up/email-clinician` |
| `getExpectation` | `GET /api/cases/{caseId}/follow-up-expected` | `GET /api/follow-up/follow-up/get-expectation` |
| `loadItems` | `GET /api/follow-ups{queryString({ filter: 'all' })}` | `GET /api/follow-up/follow-up/load-items` |
| `markExpected` | `POST /api/cases/{caseId}/follow-up-expected` | `POST /api/follow-up/follow-up/mark-expected` |
| `recordDisposition` | `PUT /api/follow-ups/{enc(ref.key)}/disposition` | `POST /api/follow-up/follow-up/record-disposition` |
| `reopen` | `DELETE /api/follow-ups/{enc(ref.key)}/disposition` | `POST /api/follow-up/follow-up/reopen` |

## `grossingHardware/httpGrossingHardwareProfileService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST create` | `POST /api/grossing-hardware/grossing-hardware-profile/create` |
| `getAll` | `GET /api/grossing/hardware-profiles` | `GET /api/grossing-hardware/grossing-hardware-profile/get-all` |
| `getById` | `GET getById` | `GET /api/grossing-hardware/grossing-hardware-profile/get-by-id` |
| `update` | `PATCH update` | `POST /api/grossing-hardware/grossing-hardware-profile/update` |

## `grossingRoutingOverrides/httpGrossingRoutingOverrideService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/grossing-routing-overrides/grossing-routing-override/add` |
| `getAll` | `GET /api/grossing/routing-overrides` | `GET /api/grossing-routing-overrides/grossing-routing-override/get-all` |
| `remove` | `DELETE remove` | `POST /api/grossing-routing-overrides/grossing-routing-override/remove` |
| `update` | `PATCH update` | `POST /api/grossing-routing-overrides/grossing-routing-override/update` |

## `hardwareContainers/httpHardwareContainerRegistryService.ts`

| Method | Earlier | Now |
|---|---|---|
| `checkIn` | `POST checkIn` | `POST /api/hardware-containers/hardware-container-registry/check-in` |
| `checkOut` | `POST checkOut` | `POST /api/hardware-containers/hardware-container-registry/check-out` |
| `create` | `POST create` | `POST /api/hardware-containers/hardware-container-registry/create` |
| `getAll` | `GET /api/hardware/containers` | `GET /api/hardware-containers/hardware-container-registry/get-all` |
| `getById` | `GET getById` | `GET /api/hardware-containers/hardware-container-registry/get-by-id` |
| `getByRackId` | `GET getByRackId` | `GET /api/hardware-containers/hardware-container-registry/get-by-rack-id` |
| `update` | `PATCH update` | `POST /api/hardware-containers/hardware-container-registry/update` |

## `imageAssociation/httpGrossImagingVendorService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/image-association/gross-imaging-vendor/add` |
| `deactivate` | `POST deactivate` | `POST /api/image-association/gross-imaging-vendor/deactivate` |
| `getActive` | `GET /api/images/gross-imaging-vendors/active` | `GET /api/image-association/gross-imaging-vendor/get-active` |
| `getAll` | `GET /api/images/gross-imaging-vendors` | `GET /api/image-association/gross-imaging-vendor/get-all` |
| `getById` | `GET getById` | `GET /api/image-association/gross-imaging-vendor/get-by-id` |
| `reactivate` | `POST reactivate` | `POST /api/image-association/gross-imaging-vendor/reactivate` |
| `remove` | `DELETE remove` | `POST /api/image-association/gross-imaging-vendor/remove` |
| `update` | `PATCH update` | `POST /api/image-association/gross-imaging-vendor/update` |

## `imageAssociation/httpImageManagementSystemVendorService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/image-association/image-management-system-vendor/add` |
| `deactivate` | `POST deactivate` | `POST /api/image-association/image-management-system-vendor/deactivate` |
| `getActive` | `GET /api/images/ims-vendors/active` | `GET /api/image-association/image-management-system-vendor/get-active` |
| `getAll` | `GET /api/images/ims-vendors` | `GET /api/image-association/image-management-system-vendor/get-all` |
| `getById` | `GET getById` | `GET /api/image-association/image-management-system-vendor/get-by-id` |
| `reactivate` | `POST reactivate` | `POST /api/image-association/image-management-system-vendor/reactivate` |
| `remove` | `DELETE remove` | `POST /api/image-association/image-management-system-vendor/remove` |
| `update` | `PATCH update` | `POST /api/image-association/image-management-system-vendor/update` |

## `imageAssociation/httpImageUploadService.ts`

| Method | Earlier | Now |
|---|---|---|
| `upload` | `POST upload` | `POST /api/image-association/image-upload/upload` |

## `inkColors/httpInkColorService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST /api/ink-colors` | `POST /api/ink-colors/ink-color/create` |
| `deactivate` | `POST /api/ink-colors/{id}/deactivate` | `POST /api/ink-colors/ink-color/deactivate` |
| `getAll` | `GET /api/ink-colors` | `GET /api/ink-colors/ink-color/get-all` |
| `getById` | `GET /api/ink-colors/{id}` | `GET /api/ink-colors/ink-color/get-by-id` |
| `reactivate` | `POST /api/ink-colors/{id}/reactivate` | `POST /api/ink-colors/ink-color/reactivate` |
| `update` | `PATCH /api/ink-colors/{id}` | `POST /api/ink-colors/ink-color/update` |

## `interfaceEngine/httpInterfaceEngineService.ts`

| Method | Earlier | Now |
|---|---|---|
| `listDispatchTrail` | `GET /api/interface-engine/dispatch-trail` | `GET /api/interface-engine/interface-engine/list-dispatch-trail` |
| `listDispatchedEvents` | `GET /api/interface-engine/dispatched-events{queryString({ organisationId: organisationId })}` | `GET /api/interface-engine/interface-engine/list-dispatched-events` |
| `postOrderCreated` | `POST /api/interface-engine/order-created` | `POST /api/interface-engine/interface-engine/post-order-created` |

## `interfaceExceptions/httpInterfaceExceptionService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST /api/interface-exceptions` | `POST /api/interface-exceptions/interface-exception/create` |
| `dismiss` | `POST /api/interface-exceptions/{id}/dismiss` | `POST /api/interface-exceptions/interface-exception/dismiss` |
| `getAll` | `GET /api/interface-exceptions` | `GET /api/interface-exceptions/interface-exception/get-all` |
| `getById` | `GET /api/interface-exceptions/{id}` | `GET /api/interface-exceptions/interface-exception/get-by-id` |
| `getPending` | `GET /api/interface-exceptions{queryString({ status: 'pending' })}` | `GET /api/interface-exceptions/interface-exception/get-pending` |
| `resolve` | `POST /api/interface-exceptions/{id}/resolve` | `POST /api/interface-exceptions/interface-exception/resolve` |

## `intraop/httpIntraoperativeService.ts`

| Method | Earlier | Now |
|---|---|---|
| `addDigitalAsset` | `POST /api/intraop/sessions/{sessionId}/specimens/{specimenId}/assets` | `POST /api/intraop/intraoperative/add-digital-asset` |
| `addMilestone` | `POST /api/intraop/sessions/{sessionId}/specimens/{specimenId}/milestones` | `POST /api/intraop/intraoperative/add-milestone` |
| `addPreparationOutput` | `POST /api/intraop/sessions/{sessionId}/specimens/{specimenId}/preparations` | `POST /api/intraop/intraoperative/add-preparation-output` |
| `addSpecimen` | `POST /api/intraop/sessions/{sessionId}/specimens` | `POST /api/intraop/intraoperative/add-specimen` |
| `createSession` | `POST /api/intraop/sessions` | `POST /api/intraop/intraoperative/create-session` |
| `dismissFromBoard` | `POST /api/intraop/sessions/{sessionId}/specimens/{specimenId}/dismiss` | `POST /api/intraop/intraoperative/dismiss-from-board` |
| `findMatchesForNewCase` | `POST /api/intraop/matches` | `POST /api/intraop/intraoperative/find-matches-for-new-case` |
| `getAll` | `GET /api/intraop/entries` | `GET /api/intraop/intraoperative/get-all` |
| `getMatchCandidates` | `GET /api/intraop/entries/{entryId}/match-candidates` | `GET /api/intraop/intraoperative/get-match-candidates` |
| `getPending` | `GET /api/intraop/entries/pending` | `GET /api/intraop/intraoperative/get-pending` |
| `lookupAdtRecord` | `POST /api/intraop/adt-lookup` | `POST /api/intraop/intraoperative/lookup-adt-record` |
| `merge` | `POST /api/intraop/entries/{entryId}/merge` | `POST /api/intraop/intraoperative/merge` |
| `recordVerbalReport` | `POST /api/intraop/sessions/{sessionId}/verbal-report` | `POST /api/intraop/intraoperative/record-verbal-report` |
| `setFrozenSectionDiagnosis` | `PUT /api/intraop/sessions/{sessionId}/specimens/{specimenId}/frozen-diagnosis` | `POST /api/intraop/intraoperative/set-frozen-section-diagnosis` |
| `setSpecimenUrgency` | `PUT /api/intraop/sessions/{sessionId}/specimens/{specimenId}/urgency` | `POST /api/intraop/intraoperative/set-specimen-urgency` |

## `intraopDashboard/httpOrEventLogService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getAll` | `GET /api/or-events` | `GET /api/intraop-dashboard/or-event-log/get-all` |
| `getByIntraopEntryId` | `GET getByIntraopEntryId` | `GET /api/intraop-dashboard/or-event-log/get-by-intraop-entry-id` |
| `getByLocationId` | `GET getByLocationId` | `GET /api/intraop-dashboard/or-event-log/get-by-location-id` |
| `record` | `POST record` | `POST /api/intraop-dashboard/or-event-log/record` |

## `intraopDashboard/httpOrSuiteTerminalService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/intraop-dashboard/or-suite-terminal/add` |
| `deactivate` | `POST deactivate` | `POST /api/intraop-dashboard/or-suite-terminal/deactivate` |
| `getActive` | `GET /api/or-suite-terminals/active` | `GET /api/intraop-dashboard/or-suite-terminal/get-active` |
| `getAll` | `GET /api/or-suite-terminals` | `GET /api/intraop-dashboard/or-suite-terminal/get-all` |
| `getById` | `GET getById` | `GET /api/intraop-dashboard/or-suite-terminal/get-by-id` |
| `update` | `PATCH update` | `POST /api/intraop-dashboard/or-suite-terminal/update` |

## `labelDesigner/httpLabelLayoutService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getByLabelType` | `GET getByLabelType` | `GET /api/label-designer/label-layout/get-by-label-type` |
| `listVersions` | `GET listVersions` | `GET /api/label-designer/label-layout/list-versions` |
| `reset` | `DELETE reset` | `POST /api/label-designer/label-layout/reset` |
| `restoreVersion` | `POST restoreVersion` | `POST /api/label-designer/label-layout/restore-version` |
| `save` | `PUT save` | `POST /api/label-designer/label-layout/save` |

## `lisIngestion/httpLisStagingQueueService.ts`

| Method | Earlier | Now |
|---|---|---|
| `load` | `GET /api/lis-ingestion/staging-queue` | `GET /api/lis-ingestion/lis-staging-queue/load` |
| `save` | `PUT /api/lis-ingestion/staging-queue` | `POST /api/lis-ingestion/lis-staging-queue/save` |

## `locations/httpLocationService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST /api/locations` | `POST /api/locations/location/create` |
| `deactivate` | `POST /api/locations/{id}/deactivate` | `POST /api/locations/location/deactivate` |
| `findOrCreateByPV1` | `POST /api/locations/resolve` | `POST /api/locations/location/find-or-create-by-pv1` |
| `getAll` | `GET /api/locations` | `GET /api/locations/location/get-all` |
| `getById` | `GET /api/locations/{id}` | `GET /api/locations/location/get-by-id` |
| `listForFacility` | `GET /api/locations{queryString({ facilityId })}` | `GET /api/locations/location/list-for-facility` |
| `reactivate` | `POST /api/locations/{id}/reactivate` | `POST /api/locations/location/reactivate` |
| `update` | `PATCH /api/locations/{id}` | `POST /api/locations/location/update` |
| `verify` | `POST /api/locations/{id}/verify` | `POST /api/locations/location/verify` |

## `macros/httpMacroService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/macros` | `POST /api/macros/macro/add` |
| `deactivate` | `POST /api/macros/{id}/deactivate` | `POST /api/macros/macro/deactivate` |
| `getAll` | `GET /api/macros` | `GET /api/macros/macro/get-all` |
| `getById` | `GET /api/macros/{id}` | `GET /api/macros/macro/get-by-id` |
| `getByShortcut` | `GET /api/macros/by-shortcut/{shortcut}` | `GET /api/macros/macro/get-by-shortcut` |
| `getForSubspecialty` | `GET /api/macros{queryString({ subspecialtyId: subspecialtyId })}` | `GET /api/macros/macro/get-for-subspecialty` |
| `reactivate` | `POST /api/macros/{id}/reactivate` | `POST /api/macros/macro/reactivate` |
| `update` | `PATCH /api/macros/{id}` | `POST /api/macros/macro/update` |

## `messages/httpMessageService.ts`

| Method | Earlier | Now |
|---|---|---|
| `emptyDeleted` | `DELETE /api/users/{userId}/messages/deleted` | `POST /api/messages/message/empty-deleted` |
| `getById` | `GET /api/messages/{id}` | `GET /api/messages/message/get-by-id` |
| `getInbox` | `GET /api/users/{userId}/messages` | `GET /api/messages/message/get-inbox` |
| `listRecipients` | `GET /api/messages/recipients` | `GET /api/messages/message/list-recipients` |
| `markAllRead` | `POST /api/users/{userId}/messages/read-all` | `POST /api/messages/message/mark-all-read` |
| `markRead` | `POST /api/messages/{id}/read` | `POST /api/messages/message/mark-read` |
| `permanentDelete` | `DELETE /api/messages/{id}` | `POST /api/messages/message/permanent-delete` |
| `reply` | `POST /api/messages/{messageId}/replies` | `POST /api/messages/message/reply` |
| `restore` | `POST /api/messages/{id}/restore` | `POST /api/messages/message/restore` |
| `send` | `POST /api/messages` | `POST /api/messages/message/send` |
| `sendSecureEmail` | `POST /api/messages/secure-email` | `POST /api/messages/message/send-secure-email` |
| `softDelete` | `POST /api/messages/{id}/delete` | `POST /api/messages/message/soft-delete` |

## `models/httpModelService.ts`

| Method | Earlier | Now |
|---|---|---|
| `adopt` | `POST /api/models/adopt` | `POST /api/models/model/adopt` |
| `getActive` | `GET /api/models{queryString({ active: 'true' })}` | `GET /api/models/model/get-active` |
| `getAll` | `GET /api/models` | `GET /api/models/model/get-all` |
| `getById` | `GET /api/models/{id}` | `GET /api/models/model/get-by-id` |
| `getDefault` | `GET /api/models/default` | `GET /api/models/model/get-default` |
| `getDefaultVoiceModel` | `GET /api/models/default-voice` | `GET /api/models/model/get-default-voice-model` |
| `retire` | `POST /api/models/{id}/retire` | `POST /api/models/model/retire` |
| `setDefault` | `POST /api/models/{id}/default` | `POST /api/models/model/set-default` |
| `update` | `PATCH /api/models/{id}` | `POST /api/models/model/update` |

## `models/httpModelStoreService.ts`

| Method | Earlier | Now |
|---|---|---|
| `checkAuthorization` | `GET /api/model-store/authorization` | `GET /api/models/model-store/check-authorization` |
| `download` | `POST /api/model-store/listings/{id}/download` | `POST /api/models/model-store/download` |
| `getAvailable` | `GET /api/model-store/listings` | `GET /api/models/model-store/get-available` |

## `narrativeSignals/httpNarrativeSignalService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getAccepted` | `GET /api/narrative-signals{queryString({ accepted: 'true', reportTemplateId: reportTemplateId })}` | `GET /api/narrative-signals/narrative-signal/get-accepted` |
| `getAll` | `GET /api/narrative-signals` | `GET /api/narrative-signals/narrative-signal/get-all` |
| `getByStudy` | `GET /api/narrative-signals{queryString({ studyId: studyId })}` | `GET /api/narrative-signals/narrative-signal/get-by-study` |
| `getByTemplate` | `GET /api/narrative-signals{queryString({ reportTemplateId: reportTemplateId })}` | `GET /api/narrative-signals/narrative-signal/get-by-template` |
| `getStats` | `GET /api/narrative-signals/stats{queryString({ studyId: studyId })}` | `GET /api/narrative-signals/narrative-signal/get-stats` |
| `recordSignals` | `POST /api/narrative-signals` | `POST /api/narrative-signals/narrative-signal/record-signals` |

## `orderIntake/httpOrderIntakeService.ts`

| Method | Earlier | Now |
|---|---|---|
| `addCrosswalkEntry` | `POST /api/order-crosswalk` | `POST /api/order-intake/order-intake/add-crosswalk-entry` |
| `getOrder` | `GET /api/orders/{id}` | `GET /api/order-intake/order-intake/get-order` |
| `listCrosswalkEntries` | `GET /api/order-crosswalk{queryString({ clientId })}` | `GET /api/order-intake/order-intake/list-crosswalk-entries` |
| `listPendingOrders` | `GET /api/orders{queryString({ status: 'pending', facilityId: p?.facilityId })}` | `POST /api/order-intake/order-intake/list-pending-orders` |
| `markOrderLinked` | `POST /api/orders/{id}/link` | `POST /api/order-intake/order-intake/mark-order-linked` |
| `receiveOrder` | `POST /api/orders` | `POST /api/order-intake/order-intake/receive-order` |
| `resolveOrder` | `POST /api/orders/{id}/resolve` | `POST /api/order-intake/order-intake/resolve-order` |
| `updateCrosswalkEntry` | `PATCH /api/order-crosswalk/{id}` | `POST /api/order-intake/order-intake/update-crosswalk-entry` |

## `patientHistory/httpPatientHistoryServices.ts`

| Method | Earlier | Now |
|---|---|---|
| `destroy` | `DELETE /api/cases/{caseId}/patient-history` | `POST /api/patient-history/patient-history-cache/destroy` |
| `ensurePending` | `POST /api/cases/{caseId}/patient-history` | `POST /api/patient-history/patient-history-cache/ensure-pending` |
| `fetchPatientHistory` | `POST /api/patient-history/lookup` | `POST /api/patient-history/patient-history-lis/fetch-patient-history` |
| `getAll` | `GET /api/patient-history` | `GET /api/patient-history/patient-history-cache/get-all` |
| `getByCaseId` | `GET /api/cases/{caseId}/patient-history` | `GET /api/patient-history/patient-history-cache/get-by-case-id` |
| `markFailed` | `POST /api/cases/{caseId}/patient-history/failed` | `POST /api/patient-history/patient-history-cache/mark-failed` |
| `markFetched` | `PUT /api/cases/{caseId}/patient-history` | `POST /api/patient-history/patient-history-cache/mark-fetched` |

## `patients/httpOutboundPatientAdtQueueService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getByPatientId` | `GET /api/patients/{patientId}/outbound/adt` | `GET /api/patients/outbound-patient-adt-queue/get-by-patient-id` |

## `patients/httpPatientIndexService.ts`

| Method | Earlier | Now |
|---|---|---|
| `addIdentifier` | `POST /api/patients/{id}/identifiers` | `POST /api/patients/patient-index/add-identifier` |
| `breakGlassRebind` | `POST /api/patients/break-glass-rebind` | `POST /api/patients/patient-index/break-glass-rebind` |
| `confirmAsNewPatient` | `POST /api/patients/{id}/confirm-new` | `POST /api/patients/patient-index/confirm-as-new-patient` |
| `flagForReview` | `POST /api/patients/{id}/flag-for-review` | `POST /api/patients/patient-index/flag-for-review` |
| `getById` | `GET /api/patients/{id}` | `GET /api/patients/patient-index/get-by-id` |
| `getLinkedPatientIds` | `GET /api/patients/{id}/links{queryString({ relationshipType })}` | `GET /api/patients/patient-index/get-linked-patient-ids` |
| `getNationalIdentifierStatusCode` | `POST /api/national-identifiers/status` | `POST /api/patients/patient-index/get-national-identifier-status-code` |
| `linkPatients` | `POST /api/patient-links` | `POST /api/patients/patient-index/link-patients` |
| `listDowntimeRecords` | `GET /api/organisations/{org}/patients{queryString({ downtime: true })}` | `GET /api/patients/patient-index/list-downtime-records` |
| `listIdentifiersForPatient` | `GET /api/patients/{id}/identifiers` | `GET /api/patients/patient-index/list-identifiers-for-patient` |
| `listLinks` | `GET /api/organisations/{org}/patient-links` | `GET /api/patients/patient-index/list-links` |
| `listNationalIdentifiers` | `GET /api/patients/{id}/national-identifiers` | `GET /api/patients/patient-index/list-national-identifiers` |
| `listPendingReview` | `GET /api/organisations/{org}/patients{queryString({ review: 'pending' })}` | `GET /api/patients/patient-index/list-pending-review` |
| `mergeIntoExistingPatient` | `POST /api/patients/{provisionalId}/merge` | `POST /api/patients/patient-index/merge-into-existing-patient` |
| `moveCaseToPatient` | `POST /api/cases/{caseId}/move-patient` | `POST /api/patients/patient-index/move-case-to-patient` |
| `recordNationalIdentifier` | `POST /api/patients/{id}/national-identifiers` | `POST /api/patients/patient-index/record-national-identifier` |
| `removeNationalIdentifier` | `DELETE /api/patients/{id}/national-identifiers/{system}` | `POST /api/patients/patient-index/remove-national-identifier` |
| `resolveByIdentifier` | `POST /api/patient-identifiers/resolve` | `POST /api/patients/patient-index/resolve-by-identifier` |
| `resolveOrCreatePatient` | `POST /api/patients/resolve` | `POST /api/patients/patient-index/resolve-or-create-patient` |
| `resolvePatientWithoutMatching` | `POST /api/patients/resolve-without-matching` | `POST /api/patients/patient-index/resolve-patient-without-matching` |
| `searchPatients` | `POST /api/organisations/{org}/patients/search` | `POST /api/patients/patient-index/search-patients` |
| `setRegistryConsent` | `PUT /api/patients/{id}/registry-consent` | `POST /api/patients/patient-index/set-registry-consent` |
| `updateDemographics` | `PATCH /api/patients/{id}/demographics` | `POST /api/patients/patient-index/update-demographics` |

## `physicians/httpPhysicianService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/physicians` | `POST /api/physicians/physician/add` |
| `deactivate` | `POST /api/physicians/{id}/deactivate` | `POST /api/physicians/physician/deactivate` |
| `findOrCreateByName` | `POST /api/physicians/resolve` | `POST /api/physicians/physician/find-or-create-by-name` |
| `findOrCreateByNpi` | `POST /api/physicians/resolve-npi` | `POST /api/physicians/physician/find-or-create-by-npi` |
| `findOrCreateByStructuredName` | `POST /api/physicians/resolve-structured` | `POST /api/physicians/physician/find-or-create-by-structured-name` |
| `getAll` | `GET /api/physicians` | `GET /api/physicians/physician/get-all` |
| `getById` | `GET /api/physicians/{id}` | `GET /api/physicians/physician/get-by-id` |
| `getByNpi` | `GET /api/physicians/by-npi/{npi}` | `GET /api/physicians/physician/get-by-npi` |
| `search` | `GET /api/physicians/search{queryString({ q: query, limit })}` | `GET /api/physicians/physician/search` |
| `update` | `PATCH /api/physicians/{id}` | `POST /api/physicians/physician/update` |
| `verify` | `POST /api/physicians/{id}/verify` | `POST /api/physicians/physician/verify` |

## `printRouting/httpPrintRoutingRuleService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST /api/print-routing-rules` | `POST /api/print-routing/print-routing-rule/create` |
| `getActive` | `GET /api/print-routing-rules{queryString({ active: 'true' })}` | `GET /api/print-routing/print-routing-rule/get-active` |
| `getAll` | `GET /api/print-routing-rules` | `GET /api/print-routing/print-routing-rule/get-all` |
| `remove` | `DELETE /api/print-routing-rules/{id}` | `POST /api/print-routing/print-routing-rule/remove` |
| `update` | `PATCH /api/print-routing-rules/{id}` | `POST /api/print-routing/print-routing-rule/update` |

## `printerProfiles/httpPrinterProfileService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/printer-profiles/printer-profile/add` |
| `getAll` | `GET /api/printers/profiles` | `GET /api/printer-profiles/printer-profile/get-all` |
| `getById` | `GET getById` | `GET /api/printer-profiles/printer-profile/get-by-id` |
| `remove` | `DELETE remove` | `POST /api/printer-profiles/printer-profile/remove` |
| `update` | `PATCH update` | `POST /api/printer-profiles/printer-profile/update` |

## `protocols/httpFixativeDictionaryService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/fixatives` | `POST /api/protocols/fixative-dictionary/add` |
| `getAll` | `GET /api/fixatives` | `GET /api/protocols/fixative-dictionary/get-all` |
| `update` | `PATCH /api/fixatives/{id}` | `POST /api/protocols/fixative-dictionary/update` |

## `protocols/httpProcessingFormatDictionaryService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/processing-formats` | `POST /api/protocols/processing-format-dictionary/add` |
| `getAll` | `GET /api/processing-formats` | `GET /api/protocols/processing-format-dictionary/get-all` |
| `update` | `PATCH /api/processing-formats/{id}` | `POST /api/protocols/processing-format-dictionary/update` |

## `protocols/httpProtocolService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/protocols` | `POST /api/protocols/protocol/add` |
| `getAll` | `GET /api/protocols` | `GET /api/protocols/protocol/get-all` |
| `restoreVersion` | `POST /api/protocols/{id}/restore` | `POST /api/protocols/protocol/restore-version` |
| `update` | `PATCH /api/protocols/{id}` | `POST /api/protocols/protocol/update` |

## `quality/httpQaActivityRecordService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST create` | `POST /api/quality/qa-activity-record/create` |
| `getAll` | `GET /api/qa/activity-records` | `GET /api/quality/qa-activity-record/get-all` |

## `quality/httpQaActivityTypeService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/quality/qa-activity-type/add` |
| `deactivate` | `POST deactivate` | `POST /api/quality/qa-activity-type/deactivate` |
| `getAll` | `GET /api/qa/activity-types` | `GET /api/quality/qa-activity-type/get-all` |
| `reactivate` | `POST reactivate` | `POST /api/quality/qa-activity-type/reactivate` |
| `update` | `PATCH update` | `POST /api/quality/qa-activity-type/update` |

## `quality/httpQaSupervisionAssignmentService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST create` | `POST /api/quality/qa-supervision-assignment/create` |
| `getActiveAssignmentForUser` | `GET getActiveAssignmentForUser` | `GET /api/quality/qa-supervision-assignment/get-active-assignment-for-user` |
| `getAll` | `GET /api/qa/supervision-assignments` | `GET /api/quality/qa-supervision-assignment/get-all` |
| `graduate` | `POST graduate` | `POST /api/quality/qa-supervision-assignment/graduate` |
| `recordCaseReviewed` | `POST recordCaseReviewed` | `POST /api/quality/qa-supervision-assignment/record-case-reviewed` |

## `quality/httpQaSupervisionAssignmentTypeService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST add` | `POST /api/quality/qa-supervision-assignment-type/add` |
| `deactivate` | `POST deactivate` | `POST /api/quality/qa-supervision-assignment-type/deactivate` |
| `getAll` | `GET /api/qa/supervision-assignment-types` | `GET /api/quality/qa-supervision-assignment-type/get-all` |
| `reactivate` | `POST reactivate` | `POST /api/quality/qa-supervision-assignment-type/reactivate` |
| `update` | `PATCH update` | `POST /api/quality/qa-supervision-assignment-type/update` |

## `quality/httpReconciliationService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST create` | `POST /api/quality/reconciliation/create` |
| `getAll` | `GET /api/qa/reconciliations` | `GET /api/quality/reconciliation/get-all` |

## `quality/httpSurgicalPeerReviewRiskWeightService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getAll` | `GET /api/qa/surgical-risk-weights` | `GET /api/quality/surgical-peer-review-risk-weight/get-all` |
| `removeWeight` | `DELETE removeWeight` | `POST /api/quality/surgical-peer-review-risk-weight/remove-weight` |
| `setWeight` | `PUT setWeight` | `POST /api/quality/surgical-peer-review-risk-weight/set-weight` |

## `reagentLots/httpReagentLotService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST create` | `POST /api/reagent-lots/reagent-lot/create` |
| `deactivate` | `POST deactivate` | `POST /api/reagent-lots/reagent-lot/deactivate` |
| `getAll` | `GET /api/reagent-lots` | `GET /api/reagent-lots/reagent-lot/get-all` |
| `getById` | `GET getById` | `GET /api/reagent-lots/reagent-lot/get-by-id` |
| `reactivate` | `POST reactivate` | `POST /api/reagent-lots/reagent-lot/reactivate` |
| `update` | `PATCH update` | `POST /api/reagent-lots/reagent-lot/update` |

## `reasons/httpReasonDictionaryService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/reasons` | `POST /api/reasons/reason-dictionary/add` |
| `deactivate` | `POST /api/reasons/{id}/deactivate` | `POST /api/reasons/reason-dictionary/deactivate` |
| `getAll` | `GET /api/reasons{queryString({ category })}` | `GET /api/reasons/reason-dictionary/get-all` |
| `reactivate` | `POST /api/reasons/{id}/reactivate` | `POST /api/reasons/reason-dictionary/reactivate` |
| `update` | `PATCH /api/reasons/{id}` | `POST /api/reasons/reason-dictionary/update` |

## `reportChangeLog/httpReportChangeLogService.ts`

| Method | Earlier | Now |
|---|---|---|
| `listForCase` | `GET /api/cases/{caseId}/change-log` | `GET /api/report-change-log/report-change-log/list-for-case` |
| `record` | `POST id` | `POST /api/report-change-log/report-change-log/record` |

## `reportParts/httpReportPartService.ts`

| Method | Earlier | Now |
|---|---|---|
| `archive` | `POST /api/report-parts/{id}/archive` | `POST /api/report-parts/report-part/archive` |
| `clone` | `POST /api/report-parts/{id}/clone` | `POST /api/report-parts/report-part/clone` |
| `create` | `POST /api/report-parts` | `POST /api/report-parts/report-part/create` |
| `getAll` | `GET /api/report-parts{queryString({ partType: f?.partType, specialty: f?.specialty, status: f?.status, search: f?.search })}` | `POST /api/report-parts/report-part/get-all` |
| `getById` | `GET /api/report-parts/{id}` | `GET /api/report-parts/report-part/get-by-id` |
| `getByIds` | `GET /api/report-parts{queryString({ ids })}` | `GET /api/report-parts/report-part/get-by-ids` |
| `publish` | `POST /api/report-parts/{id}/publish` | `POST /api/report-parts/report-part/publish` |
| `remove` | `DELETE /api/report-parts/{id}` | `POST /api/report-parts/report-part/remove` |
| `save` | `PUT /api/report-parts/{enc(part.id)}` | `POST /api/report-parts/report-part/save` |

## `reportRelease/httpReportReleaseService.ts`

| Method | Earlier | Now |
|---|---|---|
| `checkAndReleaseIfExpired` | `POST /api/cases/{caseId}/release-buffer/check` | `POST /api/report-release/report-release/check-and-release-if-expired` |
| `getOrgDefault` | `GET /api/report-release/org-default` | `GET /api/report-release/report-release/get-org-default` |
| `recall` | `POST /api/cases/{caseId}/release-buffer/recall` | `POST /api/report-release/report-release/recall` |
| `resolveBufferForCase` | `POST /api/report-release/resolve` | `POST /api/report-release/report-release/resolve-buffer-for-case` |
| `setOrgDefault` | `PUT /api/report-release/org-default` | `POST /api/report-release/report-release/set-org-default` |
| `startBuffer` | `POST /api/cases/{caseId}/release-buffer` | `POST /api/report-release/report-release/start-buffer` |

## `reportTemplates/httpReportTemplateService.ts`

| Method | Earlier | Now |
|---|---|---|
| `archive` | `POST /api/report-templates/{id}/archive` | `POST /api/report-templates/report-template/archive` |
| `clone` | `POST /api/report-templates/{id}/clone` | `POST /api/report-templates/report-template/clone` |
| `create` | `POST /api/report-templates` | `POST /api/report-templates/report-template/create` |
| `getAll` | `GET /api/report-templates` | `GET /api/report-templates/report-template/get-all` |
| `getById` | `GET /api/report-templates/{id}` | `GET /api/report-templates/report-template/get-by-id` |
| `getBySubspecialty` | `GET /api/report-templates{queryString({ subspecialtyId: subspecialtyId })}` | `GET /api/report-templates/report-template/get-by-subspecialty` |
| `publish` | `POST /api/report-templates/{id}/publish` | `POST /api/report-templates/report-template/publish` |
| `remove` | `DELETE /api/report-templates/{id}` | `POST /api/report-templates/report-template/remove` |
| `save` | `PUT /api/report-templates/{enc(template.id)}` | `POST /api/report-templates/report-template/save` |
| `update` | `PATCH /api/report-templates/{id}` | `POST /api/report-templates/report-template/update` |

## `reports/httpOutboundQueueServices.ts`

| Method | Earlier | Now |
|---|---|---|
| `getByCaseId` | `GET /api/cases/{caseId}/outbound/results` | `GET /api/reports/outbound-lis-sync-queue/get-by-case-id` |
| `getByInstanceAndState` | `GET /api/outbound/results?instanceId={instanceId}&resultState={resultState}` | `GET /api/reports/outbound-result-queue/get-by-instance-and-state` |
| `recordPdfSha256` | `POST /api/outbound/results/{id}/pdf-sha256` | `POST /api/reports/outbound-result-queue/record-pdf-sha256` |

## `reports/httpReportServices.ts`

| Method | Earlier | Now |
|---|---|---|
| `captureFields` | `PUT /api/amendments/{id}/fields` | `POST /api/reports/amendment/capture-fields` |
| `changeDraftType` | `PATCH /api/amendments/{id}` | `POST /api/reports/amendment/change-draft-type` |
| `create` | `POST /api/lis-amendment-notices` | `POST /api/reports/informal-review/create` |
| `getAll` | `GET /api/amendments` | `GET /api/reports/amendment/get-all` |
| `getAllForUser` | `GET /api/users/{id}/informal-reviews` | `GET /api/reports/informal-review/get-all-for-user` |
| `getByCaseId` | `GET /api/cases/{caseId}/lis-amendment-notices` | `GET /api/reports/amendment/get-by-case-id` |
| `getForCase` | `GET /api/cases/{caseId}/informal-reviews` | `GET /api/reports/informal-review/get-for-case` |
| `getOpenDraftsForPathologist` | `GET /api/users/{id}/amendment-drafts` | `GET /api/reports/amendment/get-open-drafts-for-pathologist` |
| `getPendingForPathologist` | `GET /api/users/{id}/lis-amendment-notices?status=pending` | `GET /api/reports/lis-amendment-notice/get-pending-for-pathologist` |
| `getPendingForReviewer` | `GET /api/users/{id}/informal-reviews/pending` | `GET /api/reports/informal-review/get-pending-for-reviewer` |
| `getSentByRequester` | `GET /api/users/{id}/informal-reviews/sent` | `GET /api/reports/informal-review/get-sent-by-requester` |
| `markSeenByRequester` | `POST /api/informal-reviews/{id}/seen` | `POST /api/reports/informal-review/mark-seen-by-requester` |
| `publish` | `POST /api/informal-reviews/{id}/publish` | `POST /api/reports/informal-review/publish` |
| `release` | `POST /api/amendments/{id}/release` | `POST /api/reports/amendment/release` |
| `reopen` | `POST /api/amendments/{id}/reopen` | `POST /api/reports/amendment/reopen` |
| `startDraft` | `POST /api/amendments` | `POST /api/reports/amendment/start-draft` |
| `updateStatus` | `PATCH /api/lis-amendment-notices/{id}` | `POST /api/reports/lis-amendment-notice/update-status` |

## `roles/httpRoleService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/roles` | `POST /api/roles/role/add` |
| `delete` | `DELETE /api/roles/{id}` | `POST /api/roles/role/delete` |
| `getAll` | `GET /api/roles` | `GET /api/roles/role/get-all` |
| `getById` | `GET /api/roles/{id}` | `GET /api/roles/role/get-by-id` |
| `update` | `PATCH /api/roles/{id}` | `POST /api/roles/role/update` |

## `routingRules/httpRoutingRuleService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/routing-rules` | `POST /api/routing-rules/routing-rule/add` |
| `getAll` | `GET /api/routing-rules` | `GET /api/routing-rules/routing-rule/get-all` |
| `getById` | `GET /api/routing-rules/{id}` | `GET /api/routing-rules/routing-rule/get-by-id` |
| `getByType` | `GET /api/routing-rules{queryString({ type: type })}` | `GET /api/routing-rules/routing-rule/get-by-type` |
| `getFacilityMap` | `GET /api/routing-rules/maps/facility{queryString({ performingLabFacilityId: performingLabFacilityId })}` | `GET /api/routing-rules/routing-rule/get-facility-map` |
| `getPhysicianMap` | `GET /api/routing-rules/maps/physician{queryString({ performingLabFacilityId: performingLabFacilityId })}` | `GET /api/routing-rules/routing-rule/get-physician-map` |
| `getProtocolMap` | `GET /api/routing-rules/maps/protocol{queryString({ performingLabFacilityId: performingLabFacilityId })}` | `GET /api/routing-rules/routing-rule/get-protocol-map` |
| `remove` | `DELETE /api/routing-rules/{id}` | `POST /api/routing-rules/routing-rule/remove` |
| `update` | `PATCH /api/routing-rules/{id}` | `POST /api/routing-rules/routing-rule/update` |

## `scanStations/httpScanStationService.ts`

| Method | Earlier | Now |
|---|---|---|
| `create` | `POST create` | `POST /api/scan-stations/scan-station/create` |
| `deactivate` | `POST deactivate` | `POST /api/scan-stations/scan-station/deactivate` |
| `getAll` | `GET /api/hardware/scan-stations` | `GET /api/scan-stations/scan-station/get-all` |
| `getByBarcodeCode` | `GET getByBarcodeCode` | `GET /api/scan-stations/scan-station/get-by-barcode-code` |
| `getById` | `GET getById` | `GET /api/scan-stations/scan-station/get-by-id` |
| `listForFacility` | `GET listForFacility` | `GET /api/scan-stations/scan-station/list-for-facility` |
| `reactivate` | `POST reactivate` | `POST /api/scan-stations/scan-station/reactivate` |
| `update` | `PATCH update` | `POST /api/scan-stations/scan-station/update` |

## `secureMessaging/httpSecureMessagingConfigService.ts`

| Method | Earlier | Now |
|---|---|---|
| `forOrganisation` | `GET /api/secure-messaging/config/organisation{queryString({ organisationId: organisationId })}` | `GET /api/secure-messaging/secure-messaging-config/for-organisation` |
| `getForFacility` | `GET /api/secure-messaging/config/facilities/{facilityId}` | `GET /api/secure-messaging/secure-messaging-config/get-for-facility` |
| `save` | `PUT /api/secure-messaging/config` | `POST /api/secure-messaging/secure-messaging-config/save` |

## `session/httpSessionTimeoutService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getOrgDefault` | `GET /api/settings/session-timeout` | `GET /api/session/session-timeout/get-org-default` |
| `resolveEffectiveMinutes` | `GET /api/settings/session-timeout/effective{queryString({ facilityId })}` | `GET /api/session/session-timeout/resolve-effective-minutes` |
| `setOrgDefault` | `PUT /api/settings/session-timeout` | `POST /api/session/session-timeout/set-org-default` |

## `specimenDictionary/httpSpecimenDictionaryService.ts`

| Method | Earlier | Now |
|---|---|---|
| `addEntries` | `POST addEntries` | `POST /api/specimen-dictionary/specimen-dictionary/add-entries` |
| `deprecateEntries` | `POST deprecateEntries` | `POST /api/specimen-dictionary/specimen-dictionary/deprecate-entries` |
| `findOrCreateByName` | `POST findOrCreateByName` | `POST /api/specimen-dictionary/specimen-dictionary/find-or-create-by-name` |
| `getAll` | `GET /api/specimen-dictionary` | `GET /api/specimen-dictionary/specimen-dictionary/get-all` |
| `replaceDictionary` | `PUT replaceDictionary` | `POST /api/specimen-dictionary/specimen-dictionary/replace-dictionary` |
| `updateEntries` | `PATCH updateEntries` | `POST /api/specimen-dictionary/specimen-dictionary/update-entries` |

## `stains/httpStainOrderMacroService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/stain-order-macros` | `POST /api/stains/stain-order-macro/add` |
| `getAll` | `GET /api/stain-order-macros` | `GET /api/stains/stain-order-macro/get-all` |
| `update` | `PATCH /api/stain-order-macros/{id}` | `POST /api/stains/stain-order-macro/update` |

## `templateSuggestions/httpTemplateSuggestionSignalService.ts`

| Method | Earlier | Now |
|---|---|---|
| `getAll` | `GET /api/template-suggestion-signals` | `GET /api/template-suggestions/template-suggestion-signal/get-all` |
| `getByTemplate` | `GET /api/template-suggestion-signals{queryString({ templateId: templateId })}` | `GET /api/template-suggestions/template-suggestion-signal/get-by-template` |
| `getStats` | `GET /api/template-suggestion-signals/stats{queryString({ studyId: studyId })}` | `GET /api/template-suggestions/template-suggestion-signal/get-stats` |
| `recordSignal` | `POST /api/template-suggestion-signals` | `POST /api/template-suggestions/template-suggestion-signal/record-signal` |

## `users/httpUserService.ts`

| Method | Earlier | Now |
|---|---|---|
| `add` | `POST /api/users` | `POST /api/users/user/add` |
| `deactivate` | `POST /api/users/{id}/deactivate` | `POST /api/users/user/deactivate` |
| `getAll` | `GET /api/users` | `GET /api/users/user/get-all` |
| `getById` | `GET /api/users/{id}` | `GET /api/users/user/get-by-id` |
| `reactivate` | `POST /api/users/{id}/reactivate` | `POST /api/users/user/reactivate` |
| `update` | `PATCH /api/users/{id}` | `POST /api/users/user/update` |

## `validationStudies/httpValidationStudyService.ts`

| Method | Earlier | Now |
|---|---|---|
| `activate` | `POST activate` | `POST /api/validation-studies/validation-study/activate` |
| `close` | `POST close` | `POST /api/validation-studies/validation-study/close` |
| `create` | `POST create` | `POST /api/validation-studies/validation-study/create` |
| `getActive` | `GET /api/validation-studies/active` | `GET /api/validation-studies/validation-study/get-active` |
| `getAll` | `GET /api/validation-studies` | `GET /api/validation-studies/validation-study/get-all` |
| `getById` | `GET getById` | `GET /api/validation-studies/validation-study/get-by-id` |
| `getStudyForCase` | `GET getStudyForCase` | `GET /api/validation-studies/validation-study/get-study-for-case` |
| `recordApproval` | `POST recordApproval` | `POST /api/validation-studies/validation-study/record-approval` |
| `remove` | `DELETE remove` | `POST /api/validation-studies/validation-study/remove` |
| `submitForReview` | `POST submitForReview` | `POST /api/validation-studies/validation-study/submit-for-review` |
| `update` | `PATCH update` | `POST /api/validation-studies/validation-study/update` |

## `voicemacro/httpVoiceMacroService.ts`

| Method | Earlier | Now |
|---|---|---|
| `addMacro` | `POST /api/voice-macros` | `POST /api/voicemacro/voice-macro/add-macro` |
| `addPersonalMacro` | `POST /api/voice-macros/mine` | `POST /api/voicemacro/voice-macro/add-personal-macro` |
| `bulkImport` | `POST /api/voice-macros/bulk` | `POST /api/voicemacro/voice-macro/bulk-import` |
| `deleteMacro` | `DELETE /api/voice-macros/{id}` | `POST /api/voicemacro/voice-macro/delete-macro` |
| `getMacros` | `GET /api/voice-macros` | `GET /api/voicemacro/voice-macro/get-macros` |
| `getMacrosForCurrentUser` | `GET /api/voice-macros/mine` | `GET /api/voicemacro/voice-macro/get-macros-for-current-user` |
| `importPersonalMacros` | `POST /api/voice-macros/mine/bulk` | `POST /api/voicemacro/voice-macro/import-personal-macros` |
| `updateMacro` | `PATCH /api/voice-macros/{id}` | `POST /api/voicemacro/voice-macro/update-macro` |

## `material/httpCaseMaterialService.ts` (Batch 618)

| Method | Earlier | Now |
|---|---|---|
| `applyDecantChange` | `POST /api/cases/{caseId}/material/decants` (contract only, no browser code) | `POST /api/material/case-material/apply-decant-change` (body `{ caseId, change, expectedVersion }`) |

## `deliverySchedules/httpDeliveryScheduleService.ts` (Batch 619)

New service, no earlier route. See `DELIVERY_SCHEDULES_API.md`: `GET .../get-all`, `GET .../get-for-facility?facilityId=`, `POST .../set`, `POST .../remove` under `/api/delivery-schedules/delivery-schedule`.

## `billingRelease/httpBillingReleaseService.ts` (Batch 619)

New service, no earlier route. See `BILLING_RELEASE_API.md`: `GET .../get-all`, `GET .../get-for-facility?facilityId=`, `POST .../set`, `POST .../remove` under `/api/billing-release/billing-release`.

## `usEpath/httpUsEpathService.ts` (Batch 620, part E)

New service, no earlier route. See `US_EPATH_API.md`: `GET .../get-profiles`, `POST .../save-profile`, `POST .../remove-profile`, `GET .../get-assignments`, `POST .../set-assignment`, `POST .../remove-assignment` under `/api/us-epath/us-epath`.

## `cosd/httpCosdDestinationService.ts` (Batch 620, part C)

New service, no earlier route. See `UK_COSD_API.md`: `GET .../get-all`, `GET .../get-for-facility?facilityId=`, `POST .../set`, `POST .../remove` under `/api/cosd/cosd-destination`.

## `outboundQueue/httpOutboundQueueService.ts` (Batch 619)
New in Batch 619, so no earlier paths. Routes under `/api/delivery/outbound-queue`: `list`, `hold`, `release`, `retry`, `mark-not-reportable`, `retract`, `override-release`, all `POST`. See `OUTBOUND_QUEUE_API.md`.

## `lockbox/httpLockboxService.ts` (Batch 645)

New service, no earlier route. See `LOCKBOX_API.md`: `POST .../lookup-barcode`, `POST .../receive-specimen` (`409` for a barcode already received), `GET .../get-folder`, `POST .../mark-accessioned`, `POST .../resolve-placeholder` under `/api/lockbox/lockbox-drop-off`. The barcode, receipt id and accession number are in the body, never the URL; the server stamps the time and the user.

## `batchRegistryFeed/httpBatchRegistryFeedService.ts` (Batch 620, part S)

New service, no earlier route. See `BATCH_REGISTRY_FEED_API.md`: `GET .../get-profiles`, `GET .../is-batch-program?screeningRegistryId=`, `GET .../get-runs?profileId=`, `POST .../save-profile`, `POST .../remove-profile`, `POST .../preview`, `POST .../build-run`, `POST .../record-file-acknowledgement` under `/api/registry/batch-registry-feed`.

## `historyExtraction/httpHistoryExtractionService.ts` and `httpHistoryExtractionSettingsService.ts` (Batch 621)

New services, no earlier routes. See `HISTORY_AI_EXTRACTION_API.md`: `GET .../get-for-case?sourceCaseId=`, `POST .../save`, `POST .../flag-as-wrong`, `GET .../get-flags?sourceCaseId=`, `GET .../get-accuracy` under `/api/ai/history-extraction`; and `GET .../get-all`, `GET .../get-for-facility?facilityId=`, `POST .../set`, `POST .../remove` under `/api/ai/history-extraction-settings`.
