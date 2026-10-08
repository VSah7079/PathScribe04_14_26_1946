# Case material API (decants)

Batch 452 (Pete, Oct 4 2026). The server side of `src/services/material/caseMaterialService.ts`.

## `POST /api/cases/{caseId}/material/decants`

One atomic change to a case's decants. The response returns the complete material tree and the billing lines the change affected, so the client never has to work out the result itself.

Request:

```json
{
  "rowVersion": 4,
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
