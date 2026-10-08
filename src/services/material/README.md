# services/material/

Batch 452 (Pete, Oct 4 2026): a case's material tree on the client, with one source of truth, events, and optimistic updates that roll back.

## Files

- **`materialEvents.ts`**: `DecantEvent` (`{ parentId, childId, materialType, volumeOrWeight, timestamp }`, Pete's payload), the `MATERIAL_DECANTED` and `MATERIAL_ROLLED_BACK` events, and an in-process bus per case (`materialEventBus`). Across users the same events would travel over SignalR (`docs/architecture/LIVE_UPDATES_SIGNALR.md`).
- **`materialTree.ts`**: the decant changes (add, update, delete) as one pure reducer over the specimens. A decant comes from its specimen or from another decant (`Decant.parentDecantId`), so it can be split over several levels, for example residual fluid D1 → cell blocks D2 and D3. The reducer refuses a duplicate id or a missing parent. It also refuses to delete a decant that others were split from. `nextDecantLabel` never reuses a label.
- **`billableMaterial.ts`**: billing derived from the material tree. `billableMaterialOf` adds each specimen's decants to its blocks, in the same shape, so a decant is listed, suggested and coded like a block. IHC first/additional sequencing then runs across blocks and decants together. Also here: `billingLinesOf`, `affectedBillingLines`, and `billableUnitOf` (whether a billing row is a block or a decant).
- **`caseMaterialService.ts`**: the atomic save, `applyDecantChangeAtomic(caseId, change, expectedVersion, deps)`.
  - On success it returns the complete updated tree, the new version and the billing lines the change affected.
  - A stale version returns `conflict` with the current version (the 409).
  - Deleting needs `case:decant:delete`.
  - `applyDecantChangeLive` wires it to the app's services. The server contract is in `docs/architecture/CASE_MATERIAL_API.md`.
- **`caseMaterialStore.ts`**: the optimistic store, `dispatch(change)`, which works in this order:
  1. Apply the change locally and notify subscribers.
  2. Publish `MATERIAL_DECANTED`.
  3. Save. Saves run in order, each on the previous one's version.
  4. On success, adopt the server's tree and version. On failure, restore the last saved tree and publish `MATERIAL_ROLLED_BACK`. Any changes queued behind the failed one roll back too.

## Who uses it

- The report page binds the store with `pages/SynopticReportPage/hooks/useCaseMaterialStore.ts`. `useSpecimenBlockManagement`'s `handleAddDecant`, `handleUpdateDecant` and `handleDeleteDecant` dispatch to it.
- `BillingReviewPanel` derives its rows from `billableMaterialOf` and subscribes to the case's events. When a decant changes, its billing row is selected and an announcement is made. A rollback is announced as well.

## Tests

- `materialSync.test.ts`: the reducer, billing derivation, the atomic save, and the store's optimistic, ordered and rollback behaviour.
- `pages/SynopticReportPage/components/DecantBillingSync.test.tsx`: an integration test. It runs a multi-level split and checks that billing updates before any save lands, and that a failed save rolls both panels back.

## Open

*Superseded (Batch 460):* "neither the Cytology Workspace nor the Microtomy workstation shows billing" is out of date. The Workspace has a Billing drawer (full review), and Microtomy shows the block's charges (read-only, with full review for people with `billing:applied-code:review`). Since Batch 453 both save decants through the atomic, versioned change and publish `MATERIAL_DECANTED` (at Batch 452 they changed decants on their own).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

(New folder; see above.)

## Batch 453 — The Batch 452 open items, and the native-speaker review register

- `materialTree.ts`: `decantOnlyUpdates(before, after)` finds the decant changes when a save changes nothing else. The Microtomy workstation uses it to send each one through `applyDecantChangeLive`. Tests are in `materialSync.test.ts`.
- The Cytology Workspace now uses the same atomic save (see `services/cytology/`).

## Batch 456 — Sign-in lockout, password screening, demo seeds

`materialDemoSeed.ts` (`withMaterialDemo`, applied to the seed cases in `mockCaseService.ts`):
- Decants on S26-4650, S26-4651 (with a p16/Ki-67 slide being stained) and S26-4652 (repeat ThinPrep after an acid wash).
- S26-5005 (thyroid FNA): a needle-rinse decant and a cell block made from it (`S26-5005-CYT-001-AD2`), H&E pending cut, for Microtomy.
- S26-4404: matrix block M1 holding cores D, E and F, with an H&E slide ready for review (Material tab → Biopsy Arrays). Microtomy opens it (Batch 460; this line used to say it couldn't).

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

`blockCaseChanges.ts`: block, stain, placeholder and Biopsy Array changes as functions of the saved case, plus `saveScreenCaseChange` (the report page's first try with its own version, then a rebuild on a conflict). These replace nine force-writes in `useSpecimenBlockManagement` that overwrote other people's changes.

## Batch 460 — Slide levels, matrix blocks at Microtomy, bench billing saves

- **`slideLevels.ts`:** a slide's level ("L3") is the one printed on its label, taken from the end of its `displayId`. Older slides without one fall back to their position.
  - Before this batch, scan resolution, location updates (`hl7/materialLocationMutation.ts`), disposal by scan, the disposal queue and report, the pending batch queue, the global scan tracker and reprinted labels all used the slide's position. So once Microtomy reordered slides or removed an unprinted one, scanning a printed slide found a different slide, and a new slide could reuse a printed level and its barcode.
  - `stainIndexAtLevel`, `stainAtLevel` and `isSlideAtLevel` now match by the printed level. `nextSlideLevelNumber` is one past the highest level used, so a removed level is never reused.
- **`materialBillingWrites.ts`:** Microtomy's full-review saves, against the case as saved.
  - A block's codes: `updateCaseWithRetry`.
  - A decant's codes: the atomic decant save, announced as `MATERIAL_DECANTED`.
  - Specimen codes: a versioned save.
  - A save that doesn't land throws, so nothing is charged for it.
- Tests: `slideLevels.test.ts`, `materialBillingWrites.test.ts`, and `utils/resolveMaterialFromScan.levels.test.ts`.

**Batch 460, after independent review:** these call sites also use the printed level:
- `ManageReprintsModal`
- `useSlideDistributionStation`
- `checkStainQcGate`
- `useLisIntegration` (decant slides)
- `MaterialTrackingHistoryModal`
- `MaterialTreePanel` (display ids)
- `addOnOrderOperations` and `grossingScreenOperations` (next level)

Before, Manage Reprints could reprint another slide's barcode after a reorder.
