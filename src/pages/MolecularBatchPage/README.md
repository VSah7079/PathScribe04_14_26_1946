# pages/MolecularBatchPage/

Real UI for the Full Molecular Testing Execution Module — see
`services/molecular/README.md` for the full, phase-by-phase architectural
account (21 real phases). This folder holds the plate builder and its
directly-adjacent workflow pages. The real, top-level worklist/tab
navigation itself now lives in `pages/MolecularWorkcenterPage/` (Phase 21,
per direct follow-up — see that folder's own README).

- **`MolecularPlateBuilderPage.tsx`** (`/molecular-batch/:batchId`) — the
  real, central page: batch creation, interactive plate/well grid
  (click-to-assign, barcode-scan-to-well, auto-fill row/column-major),
  reagent lot entry and live gating display, run-results view, the audit
  trail's own real "Trace" action, the real scan-verified worklist dispatch
  panel (Phase 9), and Clone & Supersede (Phase 20). Its own "Back to
  Batches" action resolves the real, correct Workcenter tab from the
  batch's own current status (`workcenterTabForStatus()`,
  `MolecularWorkcenterPage.tsx`), not a fixed default.
- **`MolecularRackWorklistPage.tsx`** / **`MolecularRackLoadingPage.tsx`**
  (`/molecular-rack`, `/molecular-rack/:rackId`) — Phase 10's own real
  extraction-rack workflow step: create a rack, scan specimens into real,
  linear positions, recording the real `primary_vial → secondary_rack`
  movement.
- **`MolecularControlRulesPage.tsx`** (`/molecular-control-rules`) —
  Phase 16's own real admin UI for Dynamic Control Rules/Position
  Enforcements (§3.2) — define which controls a given assay requires and
  whether each is fixed to a specific well or allowed anywhere.

**Real, direct correction (Phase 21)**: `MolecularBatchWorklistPage.tsx`
(the former worklist list at `/molecular-batch`) was deleted outright, not
left unrouted — fully superseded by `MolecularWorkcenterPage.tsx`'s own
real Worklist/Active/History tabs.

**Inline styles**: the pages in this folder now use named
`pathscribe.css` classes. The only `style={{...}}` left are two
per-instance CSS custom properties in `MolecularPlateBuilderPage.tsx`
(the plate's column count and a legend swatch's `--ps-hue`), the
pattern the no-inline-CSS rule allows.

*Corrected in the Batch 496 README audit (Oct 9, 2026): this said every page here used inline styles throughout; a grep of the folder finds only those two custom-property styles.*

## Batch 356 (PS-326)

**`MolecularPlateBuilderPage.tsx`:**
- **Picking the instrument.** The target instrument is picked from the active instruments (`instrumentService`), this station's lab first. It was a text box.
  - A hint appears when none are active.
  - A refused instrument is shown translated.
- **Dispatch.** It passes the device's scan station. Scan-check failures (plate, deck, station) are shown in the user's language, joined with `utils/formatList.ts`.
- **Inline colours converted.** The well and legend colours were built in JSX (`${color}30`); they now use `--ps-hue` with `color-mix` and state classes (`mb-well-btn--filled/--selected/--readonly`). The result text uses `--success` / `--error` classes.
- **Still open.** The page still imports several demo services directly and stays on the mock-import baseline.

## Batch 358

The target instrument list now comes from the equipment register: `equipmentService.getActive('analyser')` and `equipmentForPicker`.

## Batch 361

An analyser with an open malfunction or past due is shown in red in the target instrument picker. Pete's decision: flag it, don't block it.
- The option reads "⚠ Panther 3 (PANTHER_03): Malfunction" and is red. The text matters because some browsers (Safari, and Chrome on macOS) ignore colour on dropdown options.
- When one is chosen, the picker gets a red border and a warning below it says what's wrong.
- The page reads `equipmentLogService` (from `@/services`) and uses `serviceStatesById` / `isServiceAlert`, with today on the facility's calendar.

## Batch 363 (PS-72): patient data tagged for screenshot redaction

`MolecularPlateBuilderPage.tsx`: the well's accession-number field is tagged.

## Batch 405 (PS-359): Field Requirements, supersede permission

**`MolecularPlateBuilderPage.tsx`:**
- **Create** follows the organisation's Field Requirements (page "molecularBatch", `services/fieldRequirements/molecularBatchChecks.ts`).
  - Locked, as before: the assay, the assay name, the instrument, and each control well's lot and expiry.
  - New and locked (Pete): **every patient well names its specimen**, by container barcode or accession. The service refuses a plate that doesn't (`MOLECULAR_BATCH_WELL_SPECIMEN_MISSING`), and the page lists which wells are missing one.
  - Switches: the deck slot, a reagent lot, and each patient well's aliquot volume.
  - Required labels are starred and "Still required: …" says what's missing. Create stays off until the fields are complete and the reagent and control checks pass. Before, it was always on and the refusal came afterwards.
- **Clone & Supersede** needs `molecular:batch:supersede` (Pete: keep today's users). The button is greyed without it, and the service checks it. The reason stays locked.
- **Voice:** "create plate" (`MOLECULAR_CREATE_PLATE`) in a new `VOICE_CONTEXT.MOLECULAR`. Supersede has no voice command.
- **Translated:** reagent component names and the gating reasons (before, they were codes with the underscores removed).
- The page takes the batch, control-rule, extraction-rack, scan-station and stain services from `@/services`, so it is off the deployment baseline.
- **Demo:** the seeded run BATCH-20260906-0042 (`mb-001`) can be superseded. A new plate can be built on Panther 1 or 2.
- **Still open:** the other pages in this folder (control rules, rack loading, rack worklist) are still on the deployment baseline.

## Batch 406 (PS-359): Rack Loading, Control Rules, the rack list

**`MolecularRackLoadingPage.tsx`** follows Pete's required fields (Field Requirements page "molecularRack").
- **New rack:**
  - It takes the physical rack's barcode (scan or type). Left blank, one is generated.
  - A duplicate or malformed barcode is refused with a translated message.
- **Tubes:**
  - Manual entry takes the tube's accession too.
  - A tube without one is flagged amber. Clicking it lets the tech record the accession, and a line names the positions still missing one.
- **Place on instrument** (`components/RackPlacementPanel.tsx`):
  - Instrument: active analysers, this station's lab first.
  - Assay: optional.
  - Deck slot: only the slots on that instrument that take a sample rack and suit the assay. It is starred and required only when more than one fits.
  - "Scan deck position": scanning the deck's `LOC-INST-…` label fills the instrument and slot. A slot that doesn't take the rack, or isn't the assay's, shows a red warning and blocks placing. Scanning a tube by mistake, an unknown analyser or another analyser is also explained.
  - "Still required: …" says what's missing.
  - "place rack" by voice (`MOLECULAR_PLACE_RACK`).
  - A placed rack shows where it went, who placed it and when, and can be placed again.

**`MolecularControlRulesPage.tsx`:**
- Adding, editing, saving and deleting need `config:molecular-control-rules:manage` (Pete: Admin by default, assignable). The buttons are greyed without it, and the service checks it again.
- Delete asks first.
- A rule can tick the deck slots its sample rack may use.
- Control types are shown by name, and refusals are translated.

**`MolecularRackWorklistPage.tsx`:**
- A status column: loading, needs sample IDs, or on an instrument and slot.
- Dates in the user's language.

**`MolecularPlateBuilderPage.tsx`:**
- On an instrument with a deck layout, the deck slot is a list of its extraction-plate slots, and a wrong slot is refused with a translated message.
- The creator's name comes from `molecularActor`.

All four pages take their services from `@/services`, and the three that were still on the deployment baseline are off it. The "Still open" note under Batch 405 is resolved.

## Batch 407

Found clicking through in the browser: Rack Loading's placement lists are now the same width (`.ps-rack-placement-grid .ps-input-dark`), and its instructions have space below them (`.ps-rack-loading-help`). Everything else in Batch 406 behaved as described.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-235, PS-236)

Scan-to-well movement records come from `services/molecular/plateWellScan.ts`, and the dispatch panel's checks from `services/molecular/molecularDispatchPanel.ts`. **Open:** the clone-and-supersede handler still builds the user's name by hand, and the dispatched banner's date isn't locale-formatted.

## Batch 451 — screen-level test evidence for Priority 2 tickets

`MolecularPlateBuilderPage.test.tsx`: well panel, auto-fill, scan-in, Create Batch blocked with reasons, view-only batches and their label buttons, dispatch panel and timestamp, Trace, aliquot volume (PS-229, PS-231, PS-235, PS-236, PS-246). Auto-fill and empty-plate logic moved to `services/molecular/plateBuilderWells.ts`.

**Bug fixed:** the grid drew wells in list order, so a column-major auto-fill showed A01, B01 … across the top row, and an existing batch (which stores only its assigned wells) packed them together. The grid now draws by position (`plateGridWells`). The results table's accession cell is now tagged `data-phi`. **Open:** the trace's movement line has hard-coded English and unlocalised dates, and a control well's Trace shows nothing.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

Plate Builder:
- A well holding an in-house order has a corner mark and a tooltip naming the order.
- On a saved plate, a filled well can be selected to see its sample, accession, order or control (read-only).
- The tooltip text is now locale templates; it used to be joined in code.

## Batch 495 — breadcrumb registered

MolecularPlateBuilderPage, MolecularRackWorklistPage, MolecularRackLoadingPage and MolecularControlRulesPage now register a breadcrumb (`useBreadcrumb().pushCrumb(...)`) — same gap Batch 492 fixed on the Tumor Board and margin-exception pages: AppShell only shows the breadcrumb bar once there is more than one crumb, so these pages had none. Each reuses its existing page-title key; pages under a parameterised route (`/molecular-batch/:batchId`, `/molecular-rack/:rackId`) push their own concrete path.

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. Movement history: the level names (primary vial, …) and the "at" line are one translated template, and the timestamps follow the user's locale.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 548

Loading text here now uses `components/Common/LoadingState.tsx`: nothing for 300 ms, a placeholder, then "still working" from 3 s.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

- Batch 608: Trace works for control and calibrator wells (looked up by well position).
