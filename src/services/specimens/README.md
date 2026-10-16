# services/specimens/

Rules about a case's specimens that screens shouldn't decide themselves. Specimen *types* (the dictionary admins configure) are in `specimenDictionary/`.

## Files

- **`resolveSpecimenLisSyncState.ts`** (Batch 512): the LIS sync state a specimen gets when it is saved from the report page's specimen editor.
  - Orchestration (O26-) case → `local_only`.
  - LIS (S26-) case, added or edited → `pending_sync`, which shows the "Pending sync" badge in the specimen list.
  - `lisSyncStateNeedsBadge()` says which states show a badge.
  - Test: `resolveSpecimenLisSyncState.test.ts`.

## What "LIS sync state" means

`Specimen.lisSyncState` (renamed from `lisStatus` in Batch 512) records whether PathScribe has changed the specimen since the LIS sent it. It is **not** the LIS's own status for the case: that is the case's workflow status (New, Grossed, In progress, Finalized), shown on the worklist.

| State | Meaning |
|---|---|
| unset, or `lis_owned` | as the LIS sent it; no local change |
| `pending_sync` | added or changed in PathScribe; not yet sent back |
| `sync_sent` / `sync_rejected` | the LIS write-back's answer (the interface engine will provide it; not built in the front end) |
| `local_only` | orchestration case; goes out with the result message |

**Fixed in Batch 512.** The editor only recognised the literal `lis_owned`. Ordinary LIS specimens arrive with no state at all, so editing one never set `pending_sync`. A specimen edited again after it was sent or rejected now goes back to `pending_sync` too, because the new change hasn't been sent.

---
*See [services/README.md](../README.md) for how this folder fits the services layer.*
