# Tumor board and its rules: the API server's calls (PS-514)

Batch 617. The server version of each service the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).** One route per interface method, `/api/<area>/<service>/<method-name>` in kebab-case. Reads are `GET` with the arguments in the query string (a list repeats the name, empty values are left out); a read whose arguments are not plain values is a `POST` with the arguments as the body. `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` (or `POST`); `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. A write with one object argument sends that object as the body; with several arguments it sends an object named by the argument names. An answer is `{ ok, data }`; `403` is `NOT_PERMITTED`, `404` `NOT_FOUND`, `409` `CONFLICT`, `400` `INVALID`. Methods that return a plain value or a list (not a result) answer the bare value or `{ items }`; a failure there is the quiet default (`null`, `false`, `[]`) except where the table says otherwise.

## ITumorBoardService

`/api/tumor-board/tumor-board`. Service: `services/tumorBoard/httpTumorBoardService.ts`; chosen in `tumorBoardServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/tumor-board/tumor-board/get-all` | none |
| `list` | `POST /api/tumor-board/tumor-board/list` | `filter?` (the body) |
| `getActiveForCase` | `GET /api/tumor-board/tumor-board/get-active-for-case` | `caseId` (query) |
| `create` | `POST /api/tumor-board/tumor-board/create` | `listing`, `timezone?` (body fields) |
| `update` | `PUT /api/tumor-board/tumor-board/update` | `id`, `changes`, `byUserId`, `byUserName`, `timezone?` (body fields) |
| `dismiss` | `POST /api/tumor-board/tumor-board/dismiss` | `id`, `reason`, `byUserId`, `byUserName` (body fields) |

## ITumorBoardRuleService

`/api/tumor-board-rules/tumor-board-rule`. Service: `services/tumorBoardRules/httpTumorBoardRuleService.ts`; chosen in `tumorBoardRuleServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/tumor-board-rules/tumor-board-rule/get-all` | none |
| `update` | `PUT /api/tumor-board-rules/tumor-board-rule/update` | `id`, `changes` (body fields) |

## IFacilityTumorBoardRuleOverrideService

`/api/tumor-board-rules/facility-tumor-board-rule-override`. Service: `services/tumorBoardRules/httpFacilityTumorBoardRuleOverrideService.ts`; chosen in `facilityTumorBoardRuleOverrideServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/tumor-board-rules/facility-tumor-board-rule-override/get-all` | none |
| `getForFacility` | `GET /api/tumor-board-rules/facility-tumor-board-rule-override/get-for-facility` | `facilityId` (query) |
| `set` | `PUT /api/tumor-board-rules/facility-tumor-board-rule-override/set` | `facilityId`, `ruleId`, `changes` (body fields) |
| `remove` | `DELETE /api/tumor-board-rules/facility-tumor-board-rule-override/remove` | `facilityId`, `ruleId` (query) |

## ITumorBoardBatchSettingsService

`/api/tumor-board-rules/tumor-board-batch-settings`. Service: `services/tumorBoardRules/httpTumorBoardBatchSettingsService.ts`; chosen in `tumorBoardBatchSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/tumor-board-rules/tumor-board-batch-settings/get` | none |
| `update` | `PUT /api/tumor-board-rules/tumor-board-batch-settings/update` | `changes` (the body) |

## ITumorBoardCriteriaRuleService

`/api/tumor-board-rules/tumor-board-criteria-rule`. Service: `services/tumorBoardRules/httpTumorBoardCriteriaRuleService.ts`; chosen in `tumorBoardCriteriaRuleServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/tumor-board-rules/tumor-board-criteria-rule/get-all` | none |
| `create` | `POST /api/tumor-board-rules/tumor-board-criteria-rule/create` | `input` (the body) |
| `update` | `PUT /api/tumor-board-rules/tumor-board-criteria-rule/update` | `id`, `changes` (body fields) |
| `remove` | `DELETE /api/tumor-board-rules/tumor-board-criteria-rule/remove` | `id` (query) |

