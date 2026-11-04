# Case material API (decants)

Batch 452 (Pete, Oct 4 2026). The server side of `src/services/material/caseMaterialService.ts`.

## `POST /api/material/case-material/apply-decant-change`

Batch 618 (PS-482): the browser's server version is `material/httpCaseMaterialService.ts`, on the one route style (`HTTP_SERVICES_PATTERN.md` §7). The earlier path was `POST /api/cases/{caseId}/material/decants`; the case id now travels in the body so nothing identifying is in a URL.

One atomic change to a case's decants. The response returns the complete material tree and the billing lines the change affected, so the client never has to work out the result itself.

Request:

```json
{
  "caseId": "S26-1",
  "expectedVersion": 4,
  "change": { "kind": "add", "specimenId": "SP-A", "decant": { "id": "…", "label": "D2", "decantType": "cell_block", "parentDecantId": "D1-id", "stains": [] } }
}
```

`change.kind` is one of:

- `add`: `specimenId` and `decant`
- `update`: `decantId` and `patch`. A patch can't change `id` or `parentDecantId`.
- `delete`: `decantId`

Responses:

| Status | Body | When |
|---|---|---|
| 200 | `{ specimens, rowVersion, change, event, billing: { changed: BillingLine[], removedMaterialIds: string[] } }` | Saved. `rowVersion` is the new version. `event` is the `DecantEvent` (`parentId`, `childId`, `materialType`, `volumeOrWeight`, `timestamp`). |
| 409 | `{ error: "conflict", currentVersion }` | `rowVersion` is stale. Nothing is written. |
| 403 | `{ error: "notPermitted" }` | `delete` without `case:decant:delete`. |
| 422 | `{ error: "specimenNotFound" \| "decantNotFound" \| "duplicateId" \| "parentNotFound" \| "hasChildren" }` | The change would corrupt the tree. Nothing is written. |

The update runs `WHERE case_id = :id AND row_version = :rowVersion` and sets `row_version = row_version + 1`. If no rows are affected, the server returns 409.

## Live updates

After a 200, the server should push `MaterialChanged { caseId, rowVersion, event }` over SignalR (`LIVE_UPDATES_SIGNALR.md`). Other open sessions on the case then reload the tree, and the billing panels they derive from it update too.


## Failure codes the browser reads (Batch 618)

The browser uses the fixed code only, never the server's text. A 4xx body carries `{ code }` (upper case); a 409 also carries `currentVersion`.

| Status | `code` | The browser treats it as |
|---|---|---|
| 409 | `CONFLICT` (+ `currentVersion`) | `conflict`: the tree is reloaded at the current version, the change is rolled back |
| 403 | `NOT_PERMITTED` | `notPermitted` (a delete without `case:decant:delete`) |
| 404 | `NOT_FOUND` or `CASE_NOT_FOUND` | `caseNotFound` |
| 422 | `SPECIMEN_NOT_FOUND`, `DECANT_NOT_FOUND`, `DUPLICATE_ID`, `PARENT_NOT_FOUND`, `HAS_CHILDREN` | the matching refusal (`specimenNotFound`, `decantNotFound`, `duplicateId`, `parentNotFound`, `hasChildren`) |
| anything else | any other code, timeout, offline | `saveFailed`; the change is rolled back |

The success body's version field is `rowVersion`; the browser calls it `version`.

## What stays in the browser

The optimistic store (`caseMaterialStore.ts`: show the change at once, save in order, roll back on a refusal) and what is selected or expanded are browser state and do not call the server on their own. They call `caseMaterialService.applyDecantChange`, which is the demo's version without an API server and this route with one.
