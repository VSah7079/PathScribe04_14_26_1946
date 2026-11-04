# Settings and dictionaries: the API server's calls (PS-514)

Batch 617 (part A). The server version of each service below, which the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test, chosen by `<name>ServiceInstance.ts`); the India team's API server honours this contract. The rules are `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**Convention (`HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, kebab-case.
- Reads are `GET` with plain arguments in the query string; a read whose arguments are objects, or that carries an accession number, a token, or anything that names a patient, is a `POST` with the arguments in the body (nothing identifying goes in a URL or an access log).
- `delete`, `remove`, `clear`, `revoke` are `DELETE` with the query string; `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. One object argument is the body; several arguments are sent as an object named by the argument names.
- A call that returns a list answers `{ "items": [...] }`; a call that returns one record answers the record; a call that returns a result answers the data, and a failure is the fixed code (`403` NOT_PERMITTED, `404` NOT_FOUND, `409` CONFLICT, `400` INVALID).
- A call that returns nothing answers `200` with an empty body. A call whose answer is never "nothing" (marked *throws*) raises on a failure instead of returning a quiet default.
- *Settled* calls (code import): the business outcome (`ok: false` with `code`, `problems`, `missing`) is a `200` reply holding the interface's own union; a failed call (403, 404, no network) becomes the same union with the fixed code.

## IAbnormalTriggerRuleService

Service: `services/abnormalDetection/httpAbnormalTriggerRuleService.ts`; chosen in `abnormalTriggerRuleServiceInstance.ts`. Base `/api/abnormal-detection/abnormal-trigger-rule`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/abnormal-detection/abnormal-trigger-rule/get-all` | none | result |
| `add` | `POST /api/abnormal-detection/abnormal-trigger-rule/add` | `rule` (the body) | result |
| `update` | `PUT /api/abnormal-detection/abnormal-trigger-rule/update` | `id`, `changes` (body fields) | result |
| `deactivate` | `POST /api/abnormal-detection/abnormal-trigger-rule/deactivate` | `id` (body fields) | result |
| `reactivate` | `POST /api/abnormal-detection/abnormal-trigger-rule/reactivate` | `id` (body fields) | result |

## IAbnormalDetectionSignalService

Service: `services/abnormalDetection/httpAbnormalDetectionSignalService.ts`; chosen in `abnormalDetectionSignalServiceInstance.ts`. Base `/api/abnormal-detection/abnormal-detection-signal`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `recordSignal` | `POST /api/abnormal-detection/abnormal-detection-signal/record-signal` | `input` (the body) | result |
| `getByCaseId` | `GET /api/abnormal-detection/abnormal-detection-signal/get-by-case-id` | `caseId` (query) | result |
| `getByStudy` | `GET /api/abnormal-detection/abnormal-detection-signal/get-by-study` | `studyId` (query) | result |
| `getStats` | `GET /api/abnormal-detection/abnormal-detection-signal/get-stats` | `studyId?` (query) | result |

## IActionGroupService

Service: `services/actionGroups/httpActionGroupService.ts`; chosen in `actionGroupServiceInstance.ts`. Base `/api/action-groups/action-group`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/action-groups/action-group/get-all` | none | result |
| `getById` | `GET /api/action-groups/action-group/get-by-id` | `id` (query) | result |
| `create` | `POST /api/action-groups/action-group/create` | `draft` (the body) | result |
| `update` | `PUT /api/action-groups/action-group/update` | `id`, `changes` (body fields) | result |
| `deactivate` | `POST /api/action-groups/action-group/deactivate` | `id` (body fields) | result |
| `reactivate` | `POST /api/action-groups/action-group/reactivate` | `id` (body fields) | result |

## IAIBehaviorService

Service: `services/aiBehavior/httpAiBehaviorService.ts`; chosen in `aiBehaviorServiceInstance.ts`. Base `/api/ai-behavior/ai-behavior`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `get` | `GET /api/ai-behavior/ai-behavior/get` | none | result |
| `update` | `PUT /api/ai-behavior/ai-behavior/update` | `patch` (the body) | result |
| `reset` | `POST /api/ai-behavior/ai-behavior/reset` | none | result |

## IAssetLocationDictionaryService

Service: `services/assetLocation/httpAssetLocationDictionaryService.ts`; chosen in `assetLocationDictionaryServiceInstance.ts`. Base `/api/asset-location/asset-location-dictionary`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/asset-location/asset-location-dictionary/get-all` | none | result |
| `getById` | `GET /api/asset-location/asset-location-dictionary/get-by-id` | `id` (query) | result |
| `add` | `POST /api/asset-location/asset-location-dictionary/add` | `entry` (the body) | result |
| `update` | `PUT /api/asset-location/asset-location-dictionary/update` | `id`, `changes` (body fields) | result |
| `verify` | `POST /api/asset-location/asset-location-dictionary/verify` | `id` (body fields) | result |
| `deactivate` | `POST /api/asset-location/asset-location-dictionary/deactivate` | `id` (body fields) | result |
| `findOrCreateByName` | `GET /api/asset-location/asset-location-dictionary/find-or-create-by-name` | `name`, `note?` (query) | result |

## IAssistPollingService

Service: `services/assistPolling/httpAssistPollingService.ts`; chosen in `assistPollingServiceInstance.ts`. Base `/api/assist-polling/assist-polling`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getState` | `GET /api/assist-polling/assist-polling/get-state` | none | record (throws) |
| `saveState` | `PUT /api/assist-polling/assist-polling/save-state` | `state` (the body) | nothing |
| `saveSettings` | `PUT /api/assist-polling/assist-polling/save-settings` | `settings` (the body) | result |

## IClientSLAService

Service: `services/clientSLA/httpClientSlaService.ts`; chosen in `clientSlaServiceInstance.ts`. Base `/api/client-sla/client-sla`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/client-sla/client-sla/get-all` | none | result |
| `getById` | `GET /api/client-sla/client-sla/get-by-id` | `id` (query) | result |
| `getByAssigningAuthority` | `GET /api/client-sla/client-sla/get-by-assigning-authority` | `assigningAuthority` (query) | result |
| `add` | `POST /api/client-sla/client-sla/add` | `sla` (the body) | result |
| `update` | `PUT /api/client-sla/client-sla/update` | `id`, `changes` (body fields) | result |
| `delete` | `DELETE /api/client-sla/client-sla/delete` | `id` (query) | result |

## IClinicalMismatchRuleService

Service: `services/clinical/httpClinicalMismatchRuleService.ts`; chosen in `clinicalMismatchRuleServiceInstance.ts`. Base `/api/clinical/clinical-mismatch-rule`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `list` | `GET /api/clinical/clinical-mismatch-rule/list` | none | result |
| `save` | `PUT /api/clinical/clinical-mismatch-rule/save` | `rule` (the body) | result |
| `remove` | `DELETE /api/clinical/clinical-mismatch-rule/remove` | `ruleId` (query) | result |
| `rulesForCheck` | `GET /api/clinical/clinical-mismatch-rule/rules-for-check` | none | list |
| `revisionHoldsRelease` | `GET /api/clinical/clinical-mismatch-rule/revision-holds-release` | none | value |
| `saveRevisionHoldsRelease` | `PUT /api/clinical/clinical-mismatch-rule/save-revision-holds-release` | `holds` (body fields) | result |

## IClinicalHistoryDictionaryService

Service: `services/clinicalHistory/httpClinicalHistoryDictionaryService.ts`; chosen in `clinicalHistoryDictionaryServiceInstance.ts`. Base `/api/clinical-history/clinical-history-dictionary`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/clinical-history/clinical-history-dictionary/get-all` | none | result |
| `getActive` | `GET /api/clinical-history/clinical-history-dictionary/get-active` | none | result |
| `getByCategory` | `GET /api/clinical-history/clinical-history-dictionary/get-by-category` | `categoryCode` (query) | result |
| `getBySpecimenFamily` | `GET /api/clinical-history/clinical-history-dictionary/get-by-specimen-family` | `specimenFamily` (query) | result |
| `getById` | `GET /api/clinical-history/clinical-history-dictionary/get-by-id` | `id` (query) | result |
| `add` | `POST /api/clinical-history/clinical-history-dictionary/add` | `entry` (the body) | result |
| `update` | `PUT /api/clinical-history/clinical-history-dictionary/update` | `id`, `changes` (body fields) | result |
| `deactivate` | `POST /api/clinical-history/clinical-history-dictionary/deactivate` | `id` (body fields) | result |
| `reactivate` | `POST /api/clinical-history/clinical-history-dictionary/reactivate` | `id` (body fields) | result |
| `remove` | `DELETE /api/clinical-history/clinical-history-dictionary/remove` | `id` (query) | result |

## ICodeSystemPolicyService

Service: `services/coding/httpCodeSystemPolicyService.ts`; chosen in `codeSystemPolicyServiceInstance.ts`. Base `/api/coding/code-system-policy`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `list` | `GET /api/coding/code-system-policy/list` | none | result |
| `save` | `PUT /api/coding/code-system-policy/save` | `record` (the body) | result |
| `reset` | `POST /api/coding/code-system-policy/reset` | `jurisdiction` (body fields) | result |
| `policyFor` | `GET /api/coding/code-system-policy/policy-for` | `jurisdiction` (query) | record (throws) |
| `served` | `GET /api/coding/code-system-policy/served` | none | list |

## IDelegationTypeService

Service: `services/delegationTypes/httpDelegationTypeService.ts`; chosen in `delegationTypeServiceInstance.ts`. Base `/api/delegation-types/delegation-type`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/delegation-types/delegation-type/get-all` | none | result |
| `getActive` | `GET /api/delegation-types/delegation-type/get-active` | none | result |
| `getById` | `GET /api/delegation-types/delegation-type/get-by-id` | `id` (query) | result |
| `add` | `POST /api/delegation-types/delegation-type/add` | `dt` (the body) | result |
| `update` | `PUT /api/delegation-types/delegation-type/update` | `id`, `changes` (body fields) | result |
| `deactivate` | `POST /api/delegation-types/delegation-type/deactivate` | `id` (body fields) | result |
| `reactivate` | `POST /api/delegation-types/delegation-type/reactivate` | `id` (body fields) | result |
| `remove` | `DELETE /api/delegation-types/delegation-type/remove` | `id` (query) | result |

