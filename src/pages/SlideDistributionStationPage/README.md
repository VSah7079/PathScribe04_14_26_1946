**Batch 735:** the shared `StationScanField`; the reprint window is a dialog; in the station touch layout.

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

# pages/SlideDistributionStationPage/

**NEW (Sep 2026)** — PS-286, third of the PS-284→285→286→287→288 workstation-build sequence. A dedicated, bench-facing surface for the post-staining distribution tech: continuously scan finished, physical slides and route each one either to a pathologist (physical checkout — pathologist/pool assignment, slide folder/tray/courier tracking) or a digital scanner (WSI ingestion — instrument + rack/slot mapping), with split-destination warnings and a scan exception log. Genuinely different shape from `MicrotomyWorkstationPage/`/`EmbeddingStationPage/`: those are single-work-item benches; this one is a real continuous-scan **queue** — see `hooks/useSlideDistributionStation.ts`'s own header comment for the full reasoning.

**Route**: `/workstations/slide-distribution` — same non-case-scoped, `ScannerProvider`-wrapped route group as its two siblings, for the identical "a tech works across many cases in a shift" reasoning. Reached from its tile on the Pathology Workspace hub (`/pathology-workspace`, `PathologyWorkspacePage.tsx`); the route needs `screen:slide-distribution:open`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the tile is on the Pathology Workspace hub, not `Home.tsx` (`PathologyWorkspacePage.tsx`, `App.tsx` ScreenGate `slideDistribution`).*

## Investigation done before building (confirmed, not assumed)

- `WsiScanBatch`/`WsiScanSlide` (`services/digitalPathology/IWsiScanBatchService.ts`) is real and already tracks the *digital scan outcome* once a slide reaches a scanner — but has no concept of the physical routing step before that, and identifies slides only by `caseId`/`specimenId`/`slidePosition`, never a real `StainOrder.id`. This ticket's own routing data lives on `StainOrder` instead (see Types below) — genuinely complementary to `WsiScanBatch`, not a duplicate of it.
- Case-level assignment (`Case.assignedTo`, `Case.subspecialtyId`) is real and used as the "Automatic Routing Logic" default — but there was no slide-level pathologist/subspecialty field anywhere before this change (confirmed directly against `services/users/IUserService.ts`'s `StaffUser`).
- `services/subspecialties/ISubspecialtyService.ts`'s `Subspecialty` (with its own real `userIds`) is the real, existing precedent reused for the Pathologist/Subspecialty quick-picker grid — individual pathologists come from `userService.getAll()` filtered to `roles.includes('Pathologist')`.
- `HardwareContainer` (`services/hardwareContainers/`) tracks *staining* racks bound to a whole `Batch` (`Available`/`InUse`, not literally "Checked Out") — a real, adjacent pattern, but for a different real object than an individual output slide's own physical carrier, so it isn't reused here.
- `cerebroAdapter.ts`'s own header confirms general chain-of-custody tracking is real, directional context but genuinely "NOT YET IMPLEMENTED" pending a field-verified Cerebro integration guide. Deliberate decision made here: build a real, PathScribe-native append-only chain-of-custody log (`StainOrder.distributionEvents`) now, rather than wait on that integration — same reasoning `Case.caseComments` already established for why an audit trail needs to be append-only, not a single overwritable field.
- No rack/tray-to-slide-membership data model exists anywhere in this app. "Batch Container Recognition" is therefore scoped honestly to real, existing data: scanning an individual slide barcode queues that one slide; scanning a block/cassette barcode queues every real slide already cut from that block. A fabricated rack/tray container model was deliberately not invented to cover the literal spec wording.

## Files

- **`SlideDistributionStationPage.tsx`** — the page itself: an always-visible continuous-scan input (no scan-to-open/scan-to-clear state machine — the queue just grows), the header/context bar (Slide Count in Queue, Selected Destination Mode, Assigned Carrier or Scanner ID, Active Tech User ID), and the three-panel layout (`QueuePanel` / `ScanCenterPanel` / `DestinationControlPanel`). Owns the global `PATHSCRIBE_SCAN` listener (same `STATION:`-guarded convention as the rest of the series).
- **`components/QueuePanel.tsx`** — the left-panel real-time scanned-slide list: Accession, Block, Stain Type, real `Case.order.priority` badge (STAT/Rush/Routine), and the current assigned pathologist/pool or scanner target, click-to-select, remove-from-queue.
- **`components/ScanCenterPanel.tsx`** — the center panel: a schematic "occupied slots" chip grid over every queued slide (color-coded by destination/exception — see this file's own honest scope note on why it isn't a literal rack layout), the active slide's own detail/status, the Split-Destination warning banner, the Scan Exception Log (both session-scoped unresolved-scan exceptions and the active slide's own flagged exception with one-touch reasons and, since Batch 402, an optional note), the "trigger a replacement label print" action (which opens `SlideLabelReprintModal` since Batch 402), and the slide's own chain-of-custody event history.
- **`components/DestinationControlPanel.tsx`** — the right panel: the Physical/Digital destination toggle (lifted to page state so the header can show it), a pathologist/subspecialty-pool quick-search grid, physical location fields (Slide Folder ID/Tray Number/Courier Bag), and scanner/rack/slot fields — pre-filled from the real case-level default (`Case.assignedTo`/`Case.subspecialtyId`) the moment a not-yet-routed slide becomes active, per the spec's own "Automatic Routing Logic."
- **`hooks/useSlideDistributionStation.ts`** — the real, per-case-versioned persistence layer (a queue can span multiple cases in one shift, unlike the single-case hooks in the other two workstations), the scan-resolution flow (block/slide targets only — see Scope cuts), the pathologist/subspecialty directory load, and the real slide-label reprint dispatch (identical GS1/ZPL `printSlideLabel` chain PS-284 already proved).

## Related files elsewhere

- **`utils/slideDistributionOperations.ts`** (+ `.test.ts`, 16 tests) — the pure, tested business logic: `assignPhysicalSlide`, `assignScannerSlide`, `flagSlideException`/`resolveSlideException`, `recordLabelReprintRequest`, `resolveSplitDestinationWarning`. Constant: `SLIDE_EXCEPTION_REASONS`.
- **`types/case/Specimen.ts`** — `StainOrder` extended: `distributionDestination`/`distributionStatus`, `assignedPathologistId`/`assignedPathologistName`, `assignedSubspecialtyId`, `physicalLocation` (`slideFolderId`/`trayNumber`/`courierBagId`), `scannerAssignment` (`scannerInstrumentId`/`rackId`/`slotPosition`), `activeExceptionReason`, `distributionEvents` (`SlideDistributionEvent[]`, new exported type — the real, append-only chain-of-custody log).

*Corrected in the Batch 496 README audit (Oct 9, 2026): `slideDistributionOperations.test.ts` has 16 tests, not 13.*

## Notes

- Built with `useTranslation()` from the start — every visible string goes through the `slideDistribution.*` locale namespace, across all 5 languages (see `i18n/README.md`'s running log). Only the new `home.slideDistributionTile.*` strings were converted in the not-yet-fully-converted `Home.tsx` *(since moved: the tile's strings are now `pathologyWorkspace.slideDistributionTile.*` on the Pathology Workspace hub — checked in the Batch 496 README audit)*, same precedent as the two tiles before it.
- **`distributionStatus` is one shared real field covering both real destinations** (`Assigned`/`Checked Out` for physical, `In Scanning Queue`/`Loaded on Scanner` for digital) — a slide is only ever routed one way at a time, so a single status field (rather than two, destination-specific ones) stays accurate without a cross-check.
- **Split-Destination Warnings are scoped to one block**, same real scope-cut precedent PS-285's own `resolveSplitBlockGroupStatus` documents for its differently-named concept — a genuine whole-accession/cross-specimen check would need data this pass deliberately doesn't reach for.
- Deliberate scope cuts for this pass, matching the series' own precedent: no `MatrixBlock`-level slides, no formal scanner-instrument registry (free-text `scannerInstrumentId`, same honest convention `WsiScanBatch.scannerInstrumentId` already uses), no real rack/tray container model (see Investigation above). **Physical foot-pedal integration is explicitly deferred, not dropped** — per direct instruction, it is the next real item to address once PS-288 is delivered, tracked here so it isn't lost across the series.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`components/QueuePanel.tsx`: the accession in each queue row is tagged.

## Batch 402 (PS-359): Field Requirements

The page follows the organisation's Field Requirements (page "slideDistribution", `services/fieldRequirements/slideDistributionChecks.ts`):

- **Physical checkout:** pathologist or pool, slide folder, tray and courier bag are switches, off by default. A checkout still always needs one of them; when none is filled, "Still required" says "a pathologist, pool or location" (before, the button was simply off).
- **Scanner routing:** the scanner instrument is locked (as before); rack and slot are switches.
- **Exceptions:** a new optional note beside the one-touch reasons, saved on the chain-of-custody record. An organisation can require it; the reason buttons then wait for it.
- **Label reprint:** now needs a reason (Pete, locked), as at the Microtome and Embedding: `components/SlideLabelReprintModal.tsx` (Damaged label, Unreadable barcode, Smudged print, Other). Before, the button printed straight away with no reason. The reason goes on the chain-of-custody line.
- Required labels are starred, "Still required: …" says what is missing, and each button stays off until complete. `hooks/useSlideDistributionStation.ts` checks the same rules, reads the scan station through `@/services` (off the deployment baseline), and returns locale keys instead of English messages.
- **Voice:** the page sets `VOICE_CONTEXT.SLIDE_DISTRIBUTION`: "confirm checkout" (`SLIDE_DIST_CONFIRM_PHYSICAL`, Ctrl+Alt+Shift+P) and "confirm scanner" (`SLIDE_DIST_CONFIRM_DIGITAL`, Ctrl+Alt+Shift+D), each acting only for the destination on screen.
- **Translated:** routing status, priority, the split warning, the doctor's title, the example placeholders, the scan and printer errors; times use the user's locale (`formatTime`). The chain-of-custody lines themselves stay English (a traceability record).
- The pathologist/pool search filter moved to `utils/slideDistributionOperations.ts` (`filterRoutingDirectory`).
- Tests: `components/slideDistributionRequirements.test.tsx`.

## Batch 434

- **Digital destination:** the scanner is picked from the Equipment register's active slide scanners (it was free text). The hook loads them (`scanners`), and the panel shows a select. The test is updated.
- **New slide status `Scanned`:** set when the slide's scan batch is unloaded after a good scan.
- **Back in the queue:** a slide that didn't scan, failed, or failed image QC returns to `In Scanning Queue`, with an `unloaded_from_scanner` chain-of-custody line.
- **Batch link:** while a slide is in a scan batch, `StainOrder.wsiScanBatchId` links them.

## Batch 460

`useSlideDistributionStation.ts` finds a scanned slide by its printed level (`services/material/slideLevels.ts`), not its position, so a slide Microtome reordered is queued correctly.

---
*See [pages/README.md](../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 669 — saving (ws-8)

Every change (checkout, scanner routing, exception flag/resolve, label-reprint reason) goes through `commit` in `hooks/useSlideDistributionStation.ts`, which saves with the shared `services/workstationSave/runCaseAction.ts` (via `hooks/useWorkstationSave.ts`): re-applied to the newest copy of the case on a version conflict (3 tries). A save that still fails shows "Not saved" (`saveError`, a `role="alert"` banner above the queue) and reloads the queued slides from the stored case, instead of leaving the change on screen as saved (it used to log to the console only). A replacement label is printed only after its reason was saved. Every other queued slide of the same case is refreshed after a save or a reload. Tests: `hooks/useSlideDistributionStation.test.tsx` (new).

## Batch 669 (ws-14)

**Trigger Replacement Label** now passes the configured slide label layout to the printer (`getPrinterContext` returns it, as on the Microtome workstation; the default layout if the settings cannot be read). Before, the call left it out and `printSlideLabel` looked it up itself, so the label was usually right but the screen did not control it. Test: `hooks/useSlideDistributionStation.test.tsx`.

## Batch 726

The **Carriers at this station** card for Checkout and External Referral carriers: a staining rack moves here from Staining when scanned; slide scans are checked off against it.

## Batch 729

- `hooks/useSlideDistributionStation.ts`: matrix block and matrix slide scans queue the matrix block's slides (saved on `Case.matrixBlocks`); a slide sent on records `completed`. Page: the scan history.

## Batch 731

- Batch 731: the active slide's block warning (`ExhaustedBlockBanner`) and the slide's end state (`ItemEndStatePanel`, `endStateItemFor`); the "completed" scan event carries the slide's block as `parentItemId`.

## Batch 732

- Batch 732: `BlockPieceMapPanel` for the active slide (`pieceViewFor`); a large-format slide goes only to a scanner marked for large-format slides.
