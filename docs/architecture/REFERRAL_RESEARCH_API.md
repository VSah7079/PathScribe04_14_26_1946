# Referral tracking and the research feed: the API server's calls (PS-514)

Batch 617. The server version of each service the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).** One route per interface method, `/api/<area>/<service>/<method-name>` in kebab-case. Reads are `GET` with the arguments in the query string (a list repeats the name, empty values are left out); a read whose arguments are not plain values is a `POST` with the arguments as the body. `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` (or `POST`); `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. A write with one object argument sends that object as the body; with several arguments it sends an object named by the argument names. An answer is `{ ok, data }`; `403` is `NOT_PERMITTED`, `404` `NOT_FOUND`, `409` `CONFLICT`, `400` `INVALID`. Methods that return a plain value or a list (not a result) answer the bare value or `{ items }`; a failure there is the quiet default (`null`, `false`, `[]`) except where the table says otherwise.

## IReferralTrackingService

`/api/referral/referral-tracking`. Service: `services/referral/httpReferralTrackingService.ts`; chosen in `referralTrackingServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/referral/referral-tracking/get-all` | none |
| `getByBatchId` | `GET /api/referral/referral-tracking/get-by-batch-id` | `batchId` (query) |
| `createOnDispatch` | `POST /api/referral/referral-tracking/create-on-dispatch` | `batchId` (body fields) |
| `updateTransitStatus` | `PUT /api/referral/referral-tracking/update-transit-status` | `batchId`, `status` (body fields) |
| `recordResult` | `POST /api/referral/referral-tracking/record-result` | `batchId`, `result` (body fields) |

## IResearchFeedConfigService

`/api/research/research-feed-config`. Service: `services/research/httpResearchFeedConfigService.ts`; chosen in `researchFeedConfigServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getConfig` | `GET /api/research/research-feed-config/get-config` | none |
| `saveConfig` | `PUT /api/research/research-feed-config/save-config` | `config` (the body) |
| `getDefaults` | none: answered in the browser | none |
| `getHealth` | none: answered in the browser | none |
| `recordHealth` | none: answered in the browser | `outcome` |


## IReferralOutboundQueueService (Batch 672)

`/api/referral/referral-outbound-queue`. Service: `services/referral/httpReferralOutboundQueueService.ts`; chosen in `referralOutboundQueueServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/referral/referral-outbound-queue/get-all` | none |
| `getByBatchId` | `GET /api/referral/referral-outbound-queue/get-by-batch-id` | `batchId` (query) |
| `enqueue` | `POST /api/referral/referral-outbound-queue/enqueue` | `entry` (the body) |
| `getFailed` | `GET /api/referral/referral-outbound-queue/get-failed` | none |
| `markFailed` | `POST /api/referral/referral-outbound-queue/mark-failed` | `id`, `failure` |
| `retryDispatch` | `POST /api/referral/referral-outbound-queue/retry-dispatch` | `id` |
| `markSent` | `POST /api/referral/referral-outbound-queue/mark-sent` | `id` |
