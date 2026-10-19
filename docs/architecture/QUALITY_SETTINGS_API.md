# Peer review, CAPA, QA trend and concordance settings: the API server's calls (PS-501, PS-514)

Batch 617. The server version of each service the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).** One route per interface method, `/api/<area>/<service>/<method-name>` in kebab-case. Reads are `GET` with the arguments in the query string (a list repeats the name, empty values are left out); a read whose arguments are not plain values is a `POST` with the arguments as the body. `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` (or `POST`); `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. A write with one object argument sends that object as the body; with several arguments it sends an object named by the argument names. An answer is `{ ok, data }`; `403` is `NOT_PERMITTED`, `404` `NOT_FOUND`, `409` `CONFLICT`, `400` `INVALID`. Methods that return a plain value or a list (not a result) answer the bare value or `{ items }`; a failure there is the quiet default (`null`, `false`, `[]`) except where the table says otherwise.

## ICapaRecommendationService

`/api/quality/capa-recommendation`. Service: `services/quality/httpCapaRecommendationService.ts`; chosen in `capaRecommendationServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/quality/capa-recommendation/get-all` | none |
| `getPending` | `GET /api/quality/capa-recommendation/get-pending` | none |
| `recommend` | `POST /api/quality/capa-recommendation/recommend` | `input` (the body) |
| `confirm` | `POST /api/quality/capa-recommendation/confirm` | `id`, `decision` (body fields) |
| `dismiss` | `POST /api/quality/capa-recommendation/dismiss` | `id`, `reason` (body fields) |

## IPeerReviewService

`/api/quality/peer-review`. Service: `services/quality/httpPeerReviewService.ts`; chosen in `peerReviewServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForCase` | `GET /api/quality/peer-review/get-for-case` | `caseId` (query) |
| `getOpenForUser` | `GET /api/quality/peer-review/get-open-for-user` | `userId` (query) |
| `request` | `POST /api/quality/peer-review/request` | `input` (the body) |
| `recordRead` | `POST /api/quality/peer-review/record-read` | `id`, `read` (body fields) |
| `resolve` | `POST /api/quality/peer-review/resolve` | `id`, `resolution` (body fields) |
| `withdraw` | `POST /api/quality/peer-review/withdraw` | `id`, `reason` (body fields) |
| `override` | `POST /api/quality/peer-review/override` | `caseId`, `input` (body fields) |

## IPeerReviewSettingsService

`/api/quality/peer-review-settings`. Service: `services/quality/httpPeerReviewSettingsService.ts`; chosen in `peerReviewSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/quality/peer-review-settings/get` | none |
| `save` | `PUT /api/quality/peer-review-settings/save` | `settings` (the body) |
| `gateOnFor` | `POST /api/quality/peer-review-settings/gate-on-for` | `facilityId?`, `subspecialtyId?` (body fields) |

## IQaTrendPolicyService

`/api/quality/qa-trend-policy`. Service: `services/quality/httpQaTrendPolicyService.ts`; chosen in `qaTrendPolicyServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/quality/qa-trend-policy/get` | none |
| `save` | `PUT /api/quality/qa-trend-policy/save` | `settings`, `labName?` (body fields) |

## IConcordanceReviewSettingsService

`/api/quality-settings/concordance-review-settings`. Service: `services/qualitySettings/httpConcordanceReviewSettingsService.ts`; chosen in `concordanceReviewSettingsServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getOrgDefault` | `GET /api/quality-settings/concordance-review-settings/get-org-default` | none |
| `setOrgDefault` | `PUT /api/quality-settings/concordance-review-settings/set-org-default` | `config` (the body) |
| `resolveEffectiveConfigForFacility` | `GET /api/quality-settings/concordance-review-settings/resolve-effective-config-for-facility` | `performingFacilityId`, `staffUserId?` (query) |

