# Intraoperative critical result terms: the API server's calls (PS-510, PS-514)

Batch 617. The server version of each service the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).** One route per interface method, `/api/<area>/<service>/<method-name>` in kebab-case. Reads are `GET` with the arguments in the query string (a list repeats the name, empty values are left out); a read whose arguments are not plain values is a `POST` with the arguments as the body. `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` (or `POST`); `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. A write with one object argument sends that object as the body; with several arguments it sends an object named by the argument names. An answer is `{ ok, data }`; `403` is `NOT_PERMITTED`, `404` `NOT_FOUND`, `409` `CONFLICT`, `400` `INVALID`. Methods that return a plain value or a list (not a result) answer the bare value or `{ items }`; a failure there is the quiet default (`null`, `false`, `[]`) except where the table says otherwise.

## IIntraopCriticalResultService

`/api/intraop/intraop-critical-result`. Service: `services/intraop/httpIntraopCriticalResultService.ts`; chosen in `intraopCriticalResultServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/intraop/intraop-critical-result/get-all` | none |
| `add` | `POST /api/intraop/intraop-critical-result/add` | `entry` (the body) |
| `update` | `PUT /api/intraop/intraop-critical-result/update` | `id`, `changes` (body fields) |
| `setActive` | `PUT /api/intraop/intraop-critical-result/set-active` | `id`, `active` (body fields) |

