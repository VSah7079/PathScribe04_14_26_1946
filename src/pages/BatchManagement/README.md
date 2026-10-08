# pages/BatchManagement/

Cassette/slide chain-of-custody through histology processing nodes, plus the three real, computed queues surfaced as their own tiles/pages alongside it — and, since a later session, a fourth tile of a genuinely different kind (a live device-status dashboard, not a computed "what needs attention" queue).

## Files

- **`BatchManagementPage.tsx`** — the main page: processing-node tiles (Decal/Special Processing, Processing, Embedding, Microtomy/Sectioning, Staining, Checkout), active batch list, and the tiles navigating to the four pages below. **Real, per direct UI-review follow-up ("Fix the root" — background inconsistency across pages):** `.ps-batch-page`'s own hardcoded `background: var(--ps-bg)` removed — falls through to `AppShell.tsx`'s own, real `.ps-app-root` background now (see that folder's own README for the fuller account of the inline-style bug this whole pass traced back to), matching Configuration/Quality Assurance/Intraop Queue/Contribution.
- **`BatchDetailView.tsx`** — a single batch's manifest, scan-to-add items.
- **`NewContainerModal.tsx`** — create a new batch (container type, target node, protocol/run parameters, priority, identifier mode disposable vs. reusable rack).
- **`DisposalQueuePage.tsx`** (`/batch-management/disposal`) — real, computed queue of every specimen/block/slide currently eligible for disposal under retention policy, with direct scan-to-dispose. Backed by `services/retentionPolicy/computeDisposalQueue.ts`.
- **`DisposalReportPage.tsx`** (`/batch-management/disposal-report`) — **Stain QC Module §2.5 (waste tracking/reporting)**. Read-only compliance report of every item that has genuinely already been disposed (the mirror image of `DisposalQueuePage.tsx` above — reports on the past action, never performs it), filterable by facility/material type/disposal date range, with XLSX export for CAP/CLIA/ISO 15189 audits. Backed by `services/retentionPolicy/computeDisposalReport.ts` — see that file's own header for the full account of what this closed vs. what already existed. i18n'd from the start (`disposalReport.*` keys, all five locales) per the standing rule — see `i18n/README.md`.
- **`PendingBatchQueuePage.tsx`** (`/batch-management/pending-load`) — real, computed queue of cassettes/slides printed/engraved but not yet scanned into any active batch, with live search/filter. Backed by `services/batches/computePendingBatchQueue.ts`.
- **`RetentionHoldsQueuePage.tsx`** (`/batch-management/retention-holds`) — real, computed queue of every case with an active retention hold, oldest-first, click-through to the case to release it there. Backed by `services/retentionPolicy/computeActiveRetentionHoldsQueue.ts`.
- **`EngraverMonitorPage.tsx`** (`/batch-management/engraver-monitor`) — a real, deliberately thin, read-only device-status surface for the Cassette Engine's own fleet, per a confirmed architectural verdict: PathScribe owns the "Clinical & Workflow Layer" (a coarse status summary), the Engine owns the "Hardware & Fleet Layer" (physical diagnostics, hopper topology, direct hardware controls) — never rebuilt here. KPI counts by status, a device card grid (status badge, real structured supply warnings with color names resolved via `mockCassetteColorService.ts`, a "Launch Engine Diagnostics" link when the Engine provides one), poll-based refresh (matching this app's own established convention — no `onSnapshot` listener anywhere in this codebase). Reads `services/engravers/fetchEngraverDevices.ts` — see that folder's own README, including its real, disclosed gap (no test file exists for it) and the fact that the underlying `engraver_devices` Firestore collection has never actually been reached by a real browser (client Firebase config is still placeholder).

## Notes

- The three queue pages are deliberately read-only/navigate — the real action (loading into a batch, disposing, releasing a hold) already lives elsewhere (`BatchDetailView`, the disposal scan action, `CaseHoldModal`/`RetentionHoldModal`), so these pages answer "what needs attention" without duplicating the action itself. `EngraverMonitorPage.tsx` is read-only for a different real reason — see its own entry above.
- None of the three queues are stored/cached — each is derived fresh from real case/batch data every time the page loads, so nothing here can silently drift from reality. `EngraverMonitorPage.tsx` is different again: it reads real, persisted Firestore state (`engraver_devices`) on a poll interval, not a fresh per-load computation — there's nothing to "derive," the Engine's own last-reported status *is* the real, current answer.

## Batch 367 (PS-74): no inline CSS

`BatchDetailView.tsx`, `BatchManagementPage.tsx`, `EngraverMonitorPage.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368

`BatchDetailView` and `EngraverMonitorPage` take `referralTrackingService` and `cassetteColorService` from `@/services`, and are off the deployment baseline.

## Batch 369

`DisposalReportPage.tsx` used the Quality Assurance export helper. It now calls `utils/csv.ts` directly, because the waste-tracking report isn't one of the QA report capabilities. Its export isn't gated yet; it's on the PS-357 sweep list.

## Batch 404 (PS-359): Field Requirements, permissions, demo batches

- **New Container** follows the organisation's Field Requirements (page "batchManagement", `services/fieldRequirements/batchChecks.ts`).
  - Locked, as before: the protocol, a reusable rack's ID, a decal batch's target duration, a referral's destination lab, and a cytology batch's stain.
  - Switches: the test requested on a referral, and a staining run's reagent lots.
  - Required labels are starred and "Still required: …" says what's missing.
  - "create container" by voice (`BATCH_CREATE_CONTAINER`, Ctrl+Alt+Shift+N) does what Generate does. The page sets `VOICE_CONTEXT.BATCH_MANAGEMENT`. The overrides deliberately have no voice command.
  - Translated: container types, decal solutions, the station line and the reagent-lot list.
  - Scan stations come from `@/services`, so the file is off the deployment baseline. The station-to-node rule moved to `services/batches/batchFormHelpers.ts`.
- **Closing a batch out** goes through `BatchReasonModal.tsx` for three actions. Each has a locked reason and a permission (Pete: three permissions, for every role with this screen). The service checks both.
  - Aborting a batch needs `batch:run:abort` and, new, a reason. Before, a blank reason was stored as "No reason given."
  - Completing a reconciliation anyway needs `batch:reconciliation:override`.
  - Acknowledging a cold-chain excursion needs `batch:cold-chain-excursion:acknowledge`. The browser prompt is gone.
  - A refusal is shown in the user's language, and times use the user's locale (the English-US format is gone).
- **Demo batches** (`services/batches/batchDemoSeeds.ts`): a staining reconciliation with a missing slide and an unexpected scan (override), a referral to Summit Molecular with an unacknowledged 11.4 °C excursion (acknowledge), and a running processing batch (abort).
- **Tests:** `BatchReasonModal.test.tsx`.
- **Not changed:**
  - Other batch actions (start reconciliation, remove, move, release rack) still show the service's English error text in their toasts.
  - `CreateBatchModal.tsx` is no longer used anywhere. `NewContainerModal.tsx` replaced it, and the old file can be deleted.

## Batch 407 (PS-359): the rest of Batch Management

- **New Container form** (Pete: "the top is hidden from view as is the bottom"):
  - Each field is its own block (`.ps-batch-field`) in a two-column grid, in a dialog widened to 820px (`.ps-batch-create-modal--wide`, `pathscribe.css`). No inline styles.
  - In the browser at 1920×865 the dialog is 491px tall for Decal and at most 664px (Staining, with its reagent-lot list), so it no longer scrolls.
  - It drops to one column below 720px wide, and the body scrolls only as a fallback on a very short screen. The barcode step keeps the 460px width.
  - Labels are tied to their controls.
- **Refusals translated:** every batch action (start reconciliation, complete, move, remove, release rack, transfer to Processing, scan-in, and a missing or checked-out rack on the New Container form) shows the service's refusal code in the user's language (`batchDetail.errors.*`, `batchDetail.scanRejected.*`). Removing an item no longer fails silently.
- **Disposal Queue:**
  - Scanning needs `retention:material:dispose` (Pete: keep today's users). The red screen shows the refusal in the user's language, with dates formatted for it.
- **Disposal Report:** its CSV export, which had no check, needs `retention:disposal-report:export`, checked at the report's facility.
- **Pending Batch Load:** search and grouping by case moved to `services/batches/computePendingBatchQueue.ts`.
- **Engraver Monitor:** times follow the user's language (the page hard-coded `'en-US'`), and the colour and supply warning go through a template.
- **Patient identifiers:** item ids and case accessions on the Disposal Queue, Disposal Report and Pending Batch Load, Batch Detail's scan flash, and the toasts that name an item are tagged for screenshot redaction. They weren't before.
- **Deployment baseline:** the Disposal Queue, Disposal Report and Pending Batch Load pages take the scan-station service from `@/services` and are off the baseline.
- **Removed:** `CreateBatchModal.tsx`, unused since `NewContainerModal.tsx` replaced it. The delta zip can't delete it, so delete it by hand.
- The "Not changed" notes under Batch 404 are resolved.

## Batch 408 (PS-359): Batch Management closed out

- **List page (`BatchManagementPage.tsx`):**
  - Batch times follow the user's language. The page had hard-coded `'en-US'`, and it was the last place in the module that did.
  - Which batches are open or closed, the stage filter and each stage tile's count come from `services/batches/batchListView.ts`.
  - The stage tiles' label and count colours come from `pathscribe.css` (`.ps-batch-stage-tiles …`). Only the stage's hue (`--ps-hue`) is set on each tile.
- **Batch Detail:**
  - Whether Complete is allowed comes from `reconciliationGate`, the same rule the service applies. An unacknowledged cold-chain excursion now greys Complete out too, with the reason in its tooltip; before, the button allowed it and the service then refused.
  - The missing-item list in refusals comes from the same place.
- The STAT badge is translated on both pages.
- Checked in the browser at 1920×865: times, stage filter and tile colours.

With this, no Batch Management page is on the deployment baseline, and none has page logic, inline colours, hard-coded locales or untranslated text left.

## Batch 429: view-only sections, equipment log for the bench

- `EquipmentServiceLogPage.tsx` (new, `/batch-management/equipment-log`, tile "Equipment log"): each active instrument's maintenance and calibration state, and "Log entry" to record one (`equipment:maintenance:record`). For the bench roles, who can't open Configuration. Adding or changing equipment stays in Configuration → System → Equipment.

## Batch 432

Batch detail (external referral): "Mark in transit" / "Mark delivered" (`referral:transit-status:update`, forward only).

## Batch 434

`WsiScanBatchesPage.tsx` (route `/batch-management/wsi-scan`, tile "Slide scanning" on the hub, behind the Batch Management screen):
- the scanning queue, with a slide scanner picked from the Equipment register, slide checkboxes and **Load**;
- the scan batches, with **Send to scanner** (or **Send again**, showing why the last send failed), progress as the scanner reports it, **Unload**, and each batch's slides on expand.

The rules are in `services/digitalPathology/wsiScanQueue.ts` and `wsiScanBatchWorkflow.ts`.

## Batch 435

`WsiScanBatchesPage.tsx` updates on its own (`useLiveWsiScanBatches`) and shows the live-update badge; Refresh stays. Admin can now open the page (screen only).

## Batch 437

Printing a new container's label is audited (PS-282).

---
*See [pages/README.md](../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
