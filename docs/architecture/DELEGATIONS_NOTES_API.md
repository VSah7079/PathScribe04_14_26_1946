# Delegations, participation types, internal notes and display access: the API server's calls (PS-514)

Batch 617. The server version of each delegations, participation types, internal notes and display access service that the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, names in kebab-case.
- Reads (`get`, `list`, `find`, `is`, `has`, `count`, `can`, `resolve`, `load`, `search`, `check`, and similar) are `GET` with the arguments in the query string, repeated for a list, empty values left out. A read whose arguments are not plain values is a `POST` with the arguments as the body.
- `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` with the arguments in the query string. `save`, `set`, `update`, `upsert`, `replace` are `PUT`. Everything else is `POST`.
- A write with one object argument sends that object as the body. A write with several arguments, or plain ones, sends an object named by the argument names.
- Every answer is `{ ok, data }` on success. The data is the body of the 2xx reply as is. `403` is `NOT_PERMITTED`, `404` is `NOT_FOUND`, `409` is `CONFLICT`, `400` is `INVALID`; the server's text is dropped.
- A method that returns a plain list (not a ServiceResult) reads `{ "items": [...] }` (`HTTP_SERVICES_PATTERN.md` §3); a missing item is `404` and arrives as the method's empty answer; a method that returns nothing resolves on success and throws a code on refusal. A check that returns a status (`verify`) fails closed: any failure is `invalid`. Where an earlier contract names an endpoint for the same data, the earlier, narrower one wins and the table below changes.

## IDelegationService

`/api/delegations/delegation`. Service: `services/delegations/httpDelegationService.ts`; chosen in `delegationServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `list` | `POST /api/delegations/delegation/list` | `filter?` (the body) |
| `delegate` | `POST /api/delegations/delegation/delegate` | `request` (the body) |
| `complete` | `POST /api/delegations/delegation/complete` | `id` (body fields) |

## IDisplayAccessService

`/api/display-access/display-access`. Service: `services/displayAccess/httpDisplayAccessService.ts`; chosen in `displayAccessServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `issueFacilityOpsToken` | `POST /api/display-access/display-access/issue-facility-ops-token` | `profileId`, `validDays?` (body fields) |
| `issueOrSuiteToken` | `POST /api/display-access/display-access/issue-or-suite-token` | `terminalId`, `validDays?` (body fields) |
| `revokeFacilityOpsToken` | `DELETE /api/display-access/display-access/revoke-facility-ops-token` | `profileId` (query) |
| `revokeOrSuiteToken` | `DELETE /api/display-access/display-access/revoke-or-suite-token` | `terminalId` (query) |
| `verify` | `POST /api/display-access/display-access/verify` | `kind`, `subjectId`, `token` (body fields) |
| `getSummary` | `GET /api/display-access/display-access/get-summary` | `kind`, `subjectId` (query) |
| `getAllSummaries` | `GET /api/display-access/display-access/get-all-summaries` | `kind` (query) |

## IInternalNoteService

`/api/internal-notes/internal-note`. Service: `services/internalNotes/httpInternalNoteService.ts`; chosen in `internalNoteServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getForCase` | `POST /api/internal-notes/internal-note/get-for-case` | `accession`, `userId` (body fields) |
| `add` | `POST /api/internal-notes/internal-note/add` | `note` (the body) |
| `update` | `PUT /api/internal-notes/internal-note/update` | `id`, `authorId`, `changes` (body fields) |
| `remove` | `DELETE /api/internal-notes/internal-note/remove` | `id`, `authorId` (query) |

## IParticipationTypeService

`/api/participation-types/participation-type`. Service: `services/participationTypes/httpParticipationTypeService.ts`; chosen in `participationTypeServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/participation-types/participation-type/get-all` | none |
| `getActive` | `GET /api/participation-types/participation-type/get-active` | none |
| `getById` | `GET /api/participation-types/participation-type/get-by-id` | `id` (query) |
| `add` | `POST /api/participation-types/participation-type/add` | `type` (the body) |
| `update` | `PUT /api/participation-types/participation-type/update` | `id`, `changes` (body fields) |
| `deactivate` | `POST /api/participation-types/participation-type/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/participation-types/participation-type/reactivate` | `id` (body fields) |
| `remove` | `DELETE /api/participation-types/participation-type/remove` | `id` (query) |

