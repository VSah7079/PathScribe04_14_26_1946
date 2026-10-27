# services/retentionPolicy/

Retention-eligibility resolution, the two real computed disposal-related queues, and the real, physical scan-to-dispose action. Deliberately **not** the batch/container model (`services/batches/`) — disposal is a genuinely different workflow: a real, computed worklist with direct scan-to-act, not a manually-created, manually-loaded batch.

**Pattern:** Mixed — `RetentionPolicy.ts` is a pure types/config module (no interface/mock split); the rest are pure computation/resolution functions, not CRUD services.

## Files

- **`RetentionPolicy.ts`** — pure types and helpers, no retention figures of its own: `RetainableMaterialType` is exactly three values (`block`, `slide`, `wet_tissue`; decants and decant slides are queued on the `wet_tissue` and `slide` windows), `RetentionOverrideDays` (the per-department override shape), `formatRetentionPeriod` and `calculateRetentionEligibleDate` (UTC days from sign-out). The per-jurisdiction figures (RCPath/UK, CAP/CLIA/US and the others) are data held on the governing bodies (`services/governingBodies/`, `retentionPolicyVersions`), resolved in `resolveRetentionEligibility.ts`. The seeded CAP wet-tissue and RCPA figures are **unverified placeholders** until a records or compliance lead confirms them against the published schedules (flagged in the Admin Guide and `docs/product/KNOWN_GAPS.md`).
- **`resolveRetentionEligibility.ts`** (+ **`resolveRetentionEligibility.test.ts`**, **NEW**) — resolves the real, most-conservative eligible-for-disposal date for a given material type + jurisdiction + specimen dictionary entries. `resolveCategoryOverride()` — the real function walking Specimen -> `SpecimenEntry.departmentId` -> `Department.retentionOverrideDays` — had zero test coverage before this pass; 5 new tests cover the real chain resolving end-to-end, each of the three real "missing link" cases returning `undefined` (not an empty object) rather than guessing, and a failed `specimenDictionaryService.getAll()` call not throwing.
- **`computeDisposalQueue.ts`** — real, computed queue: every block, slide, specimen's wet tissue, decant and decant slide currently eligible for disposal right now (retention period elapsed, no active retention hold, not already disposed), facility-scoped. Surfaced at `/batch-management/disposal`, with direct scan-to-dispose.
- **`disposeItemByScan.ts`** (+ `specimenDisposal.test.ts`) — the real, physical scan action. Rejects a scan against a case with an active retention hold, a not-yet-eligible item, or an already-disposed item — never silently succeeds.
- **Active retention holds queue — built elsewhere (Batch 610).** `RetentionHoldsQueuePage.tsx` at `/batch-management/retention-holds` is backed by `services/retentionHolds/` (not by a file in this folder; there is no `computeActiveRetentionHoldsQueue.ts`). Holds are placed per case (`RetentionHoldModal.tsx` on the report page) and enforced here: `computeDisposalQueue.ts` / `disposeItemByScan.ts` skip or refuse any item on an active hold. *(Batch 652: the Batch 496 note that said the queue page did not exist was out of date.)*
- **`exportDisposalReport.ts`** (+ `exportDisposalReport.test.ts`, Batch 407/543) — the report's CSV export: checks `retention:disposal-report:export` at the report's facility (or all facilities), then records the export in the audit log (document `disposal-report`).
- **`computeDisposalReport.ts`** (+ `computeDisposalReport.test.ts`) — **Stain QC Module §2.5 (waste tracking/reporting)**, the last remaining piece of the original module spec (§2.1 Reagent & Solution Lot Registry, the Gating Strategy, §2.2/2.3 batch-manifest scanning + automatic control-slide appending, the admin `qcEnforcementMode` override screen, and Immunofluorescence control requirements were already built — see `services/batches/README.md`). Real, honest finding confirmed before building anything: the original §2.5 spec's three pieces ("Disposal Batching & Workflow Execution," "Dynamic Regulatory Rules Engine," "Single-Asset Chain-of-Custody Tracking") were already substantially built here — `computeDisposalQueue.ts`/`disposeItemByScan.ts` (deliberately not a literal "batch," per this file's own header), `RetentionPolicy.ts`/`resolveRetentionEligibility.ts` (already live/data-driven, not hardcoded), and the immutable per-item `disposedAt`/`disposedBy` stamp, respectively. The genuinely missing piece — closed here — was the "/reporting" half: nothing anywhere aggregated already-disposed items into a browsable, filterable, exportable log. A mirror image of `computeDisposalQueue.ts` (`disposedAt` SET instead of unset), same "derive fresh every time, never a separately stored, driftable copy" discipline — not a new, parallel record-keeping store. Filterable by facility, `RetainableMaterialType`, and disposal date range; resolves `disposedBy` (a user ID) to a real display name via `userService.getAll()`, once per report run. Surfaced at `/batch-management/disposal-report` (`DisposalReportPage.tsx`), with CSV export through `exportDisposalReport.ts` (it was first built on the QA XLSX helper; Batch 496 moved it to `utils/csv.ts`). **Known, honest scope limitation, same as `computeDisposalQueue.ts`'s own:** `eligibleSince` on a report row is recomputed against the CURRENT jurisdiction's live retention rules, not whatever rules were actually in force at the moment that item was disposed — nothing in this app captures a historical snapshot of retention policy versions.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the active-holds queue file and page were listed as built but don't exist; entry rewritten.*

## Notes

- Both real computed outputs here (the disposal queue and the disposal report) follow the same "derive fresh every time, never a separately stored, driftable copy" discipline — a case appears in a queue purely because its own real data currently satisfies the condition, never because of a cached flag that could drift from reality.
- `RetentionHold` (case-level, gates disposal after finalization) is a deliberately separate concept from `CaseHold` (`types/case/CaseHold.ts` — case-level, gates finalize on an active, not-yet-done case) — see that type's own header for the full distinction. Neither type lives in this folder; both are referenced by the queue functions here.
- **Real, per direct follow-up ("Can we cleanup those 12 errors?"): `RetentionPolicy.ts`'s own `RetentionOverrideDays` type had always pointed to `Department.retentionOverrideDays` as its real, intended attachment point (see that file's own doc comment) — but the field itself was never actually added to `IDepartmentService.ts`, a real, confirmed `tsc` error, not a stylistic gap.** Fixed there — see `services/departments/README.md`'s own account. `resolveCategoryOverride()` (below) and `DepartmentsSection.tsx` (`components/Config/System/`) had both already been built genuinely depending on this field. This was the last of the app's real, pre-existing `tsc` baseline — the other 35 errors it once included traced to five separate, now-deleted dead files (`components/Config/System/README.md` has that account) — `tsc` is now genuinely, fully clean, zero errors.

## Batch 407

- `disposeItemByScan.ts`:
  - Checks `retention:material:dispose` first, with the station's facility (Pete: keep today's users).
  - Each refusal carries a `code` (`notPermitted`, `noMatch`, `notFound`, `alreadyDisposed`, `notSignedOut`, `onHold`, `notEligible`, `wrongFacility`) and `values` (item, ISO date, hold note) for the screen. `reason` stays in English for logs.
  - The audit entry's date is ISO, not the browser's locale.
- `exportDisposalReport.ts` (new): the waste-tracking report's CSV export checks `retention:disposal-report:export` at the report's facility, or all facilities, before writing.

## Batch 431

`getCurrentJurisdiction()` reads the system configuration through `services/systemConfig/systemConfigStore.ts`.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

Disposal by scan is versioned, and every try re-checks for an active hold.

## Batch 460

Disposal by scan, the disposal queue and the disposal report find a slide by its printed level (`material/slideLevels.ts`), not its position in the list. See `services/material/README.md` (Batch 460).

## Batch 504

The disposal-eligibility date adds retention days with UTC arithmetic, so it is the same whatever device computes it.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 543 (finding F9)

`exportDisposalReport.ts`: the export is recorded in the audit log as `DOCUMENT_EXPORTED` (document `disposal-report`, the file name, row count and facility), like every other export of case data. It wasn't before. The record function is a dependency (`record`), defaulting to the audit log's document-output entry.

## Batch 669 (finding batch-4)
`mostRecentLocation.ts` is the one rule for an item's last location: the entry with the latest `at` time (a tie goes to the entry recorded later). `computeDisposalQueue.ts`, `computeDisposalReport.ts` and `disposeItemByScan.ts` all use it; before, the scan check took the last array entry, so a late-entered older location event could make the queue and the scan disagree about "wrong facility". `mostRecentLocation.test.ts` also guards that none of the three keeps its own copy. Not changed: `MaterialTreePanel.tsx` and `MaterialTrackingHistoryModal.tsx` keep their own (identical) copies of the same sort for display.
