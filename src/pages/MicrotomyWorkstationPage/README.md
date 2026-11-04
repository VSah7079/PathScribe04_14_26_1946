**Batch 740:** `hooks/useMicrotomyWorkstation.ts` takes `{ bench }`: the Microtome refuses fluids, aliquots and cell blocks not yet handed off; the Cytology Preparation bench (a new page using the same hook) refuses blocks.

**Batch 739:** `components/CytologyPanel.tsx` takes the decant's specimen, so a CSF gets cytospins.

**Batch 737:** `hooks/useMicrotomyWorkstation.ts`: a matrix block's parts can be marked used up (Piece exhausted), through the matrix block's one-block view.

**Batch 736:** Block exhausted takes the lab's reasons (Reason Dictionary) and an optional note; the code goes with the flag (`handleFlagBlockExhausted(note, reasonCode)`).

**Batch 735:** the shared `StationScanField` before and during a block; Batch print order has Move up / Move down (`utils/listOrder.ts`) beside dragging, and the tick box sits in a label; Block exhausted has one-tap reasons (`QuickReasonPicks`); windows are dialogs; in the station touch layout.

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

# pages/MicrotomyWorkstationPage/

**NEW (Sep 2026)** — PS-284, first of the PS-284→285→286→287→288 workstation-build sequence. A dedicated, bench-facing surface for the microtome tech: scan a block or a cytology decant/fluid container, see every slide it needs cut and stained, and print/etch labels for them — either on-demand (one slide at a time, as the tech cuts) or as a batch (select several, print them together). Built to visually match `GrossingScreenPage.tsx`/`SynopticReportPage.tsx` (same header/back-button pattern, same `ps-overlay`/`ps-modal-dark` modal convention, same dark palette) per direct guidance, not a new visual language.

**Route**: `/workstations/microtomy` — deliberately NOT nested under the `:caseId`-scoped, `synopticLoader`-gated clinical route group. This is a bench-scoped workstation a tech opens once and scans multiple cases through, the same shape as `/batch-management/*`, so it lives in that same non-case-scoped, `ScannerProvider`-wrapped route group in `App.tsx`. Reached from the Microtome tile on the Pathology Workspace hub (`/pathology-workspace`, `PathologyWorkspacePage.tsx`); the route needs `screen:microtomy:open`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the tile is on the Pathology Workspace hub, not `Home.tsx` (`PathologyWorkspacePage.tsx`, `App.tsx` ScreenGate `microtomy`).*

## Files

- **`MicrotomyWorkstationPage.tsx`** — the page itself: a scan-to-begin entry state; once a block or decant resolves, a three-panel layout (Left: work-item context — accession/patient/block summary, alert-flag badges for Tiny Tissue/Fragile/Decal Required, prior slide history; Center: the interactive slide grid or, for a decant, the cytology panel; Right: hardware & print controls). Also owns the global `PATHSCRIBE_SCAN` listener (same `STATION:`-prefix-guarded convention as `useGlobalMaterialScanTracking.ts`/`useDefaultActionOnScan.ts`) so a tech can scan the next block without touching the mouse.
- **`components/SlideGridPanel.tsx`** — the center-panel slide table for a histology block (Level · Stain · Print Status · Actions), the per-row "+ Level" quick action for ordering an additional recut/level of an already-ordered stain, and a purpose-built Add Stain quick-picker (category search, duplicate count, level depth/microtome step, control-slide pairing checkbox). Deliberately does NOT reuse the existing `StainMultiSelect` component — its `onChange` contract has no way to carry duplicate-count/level-depth/control-pairing, and retrofitting those in risked regressing its existing callers; see the picker's own header comment for the full reasoning.
- **`components/CytologyPanel.tsx`** — the center-panel replacement for a decant work item: Total Volume (mL) / Appearance / Decant Yield fields, the dynamic preparation-method suggestion (`computeCytologyPrepSuggestions`) with an "Accept suggestion" action. *(Corrected Batch 669, ws-5: this line also listed a per-slide preparation-method selector and a Pap / Diff-Quik / H&E toggle; the panel has neither. A decant slide's preparation method is set when the suggestion is accepted, or when a slide is added.)*
- **`components/HardwarePrintPanel.tsx`** — the right-panel print mode toggle (On-Demand vs. Batch), next-unprinted-slide call to action, device status, and a 1:1 schematic label preview (a deterministic illustration, not a decodable barcode — see the file's own comment).
- **`components/CommentDrawer.tsx`** — the unified comment drawer (badge count), covering both block-level read/write notes (with high-contrast alert badges) and slide-level editable comments with the "prints on label vs. LIS-only" toggle.
- **`components/BatchProgressModal.tsx`** — progress modal for a batch print run (Pending/Printing/Printed/Failed per selected slide).
- **`hooks/useMicrotomyWorkstation.ts`** — wraps `utils/microtomyOperations.ts`'s pure functions with real persistence (`caseRouter.updateCase`, optimistic update, version-conflict handling — same shape as `useGrossingScreen.ts`), the scan-resolution flow (`resolveMaterialFromScan`), and the real print dispatch chain (station → `supportsPrinting` + printer profile → `printSettingsService.get()` → `printSlideLabel`), mirroring the existing template in `useSpecimenBlockManagement.ts`'s `attemptPrintedLabel`.

## Related files elsewhere

- **`utils/microtomyOperations.ts`** (+ `.test.ts`) — the pure, tested business logic: `computeNextUnprintedStain`, `addMicrotomyStain`/`removeMicrotomyStain` (with required cancel reason once printed — `MICROTOMY_CANCEL_REASONS`), `markStainPrinting`/`markStainPrintResult`, `reprintMicrotomyStain` (required reason — `MICROTOMY_REPRINT_REASONS`), `reorderBlockStains`, `updateStainComment`/`updateBlockComment`, `setBlockAlertFlags`, `updateDecantCytologyFields`, `applyCytologyPrepSuggestions`, `addDecantStain`/`removeDecantStain`.
- **`services/cytology/computeCytologyPrepSuggestions.ts`** (+ `.test.ts`) — the pure dynamic-preparation-rule engine (the spec's own worked example: >20mL + high yield → 2 ThinPrep, 2 Cell Block, 1 Direct Smear).
- **`utils/labels/resolveSlideLabelFitWarnings.ts`** (+ `.test.ts`) — mirrors the existing `resolveCassetteLabelFitWarning.ts` for the new `SlideLabelLayoutConfig`.
- **`services/printSettings/IPrintSettingsService.ts`** — `SlideLabelLayoutConfig` / `DEFAULT_SLIDE_LABEL_LAYOUT`, `PrintSettingsConfig.slideLabelLayout`. See that file's own README for the honest gap (not yet wired into `buildSlideZplTemplate()`'s actual ZPL dot coordinates, in `utils/labels/zplTemplates.ts`).

*Corrected in the Batch 496 README audit (Oct 9, 2026): `buildSlideZplTemplate` is a function in `utils/labels/zplTemplates.ts`, not its own file; its coordinates are still fixed.*
- **`types/case/Specimen.ts`** — `StainOrder` extended with `commentPrintsOnLabel`, `printStatus`/`printedAt`/`printedBy`/`printFailureReason`, `levelDepthMicrons`, `pairedControlSlideId`/`isControlSlide`, `preparationMethod`, `lastReprintReason`/`lastReprintOrderedBy`/`lastReprintOrderedAt`/`reprintCount`. `HistologyBlock` extended with `tinyTissue`/`fragile`.
- **`types/case/Material.ts`** — `Decant` extended with `totalVolumeMl`/`appearance`/`yieldPelletSize`.

## Notes

- Built with `useTranslation()` from the start — every visible string goes through the `microtomyWorkstation.*` locale namespace, across all 5 languages (see `i18n/README.md`'s running log). The tile's strings are now `pathologyWorkspace.microtomyTile.*`, since the tile moved to the Pathology Workspace hub. *(Corrected in the Batch 496 README audit: the earlier `home.microtomyTile.*` keys no longer exist.)*
- Control-slide pairing (`pairedControlSlideId`/`isControlSlide`) is a deliberate, separate, same-block sibling-slide mechanism — genuinely different from the existing `shouldAutoAppendControl.ts` (a batch/QC-level synthetic-control-CASE mechanism). Reconciling the two is a future design question, not resolved here.
- `processMicrotomyScan` (pre-existing, in `useGlobalMaterialScanTracking.ts`) already auto-dispatches the honest stub `dispatchSlideLabel` for every Pending-Cut stain when a block is scanned at a "Microtomy / Sectioning" station, regardless of the station's real `supportsPrinting` flag. This page is deliberately the first real place the actual GS1/ZPL `printSlideLabel` path gets used — the two print paths were NOT reconciled in this pass; that stub keeps running exactly as before.
- Deliberate scope cuts for this pass (ticket is Autopsy-module-scale): no specimen-level scan resolution (MatrixBlock support superseded this cut in Batch 460), schematic (non-decodable) label preview, no `buildSlideZplTemplate` rewiring to the new layout config, no action-registry/voice wiring, no admin editor UI for `SlideLabelLayoutConfig`. *(Since closed: voice/keyboard commands, Batch 388. The ZPL rewiring and admin editor are still open — checked in the Batch 496 README audit.)*
- **Real fix (foot-pedal follow-up, Sep 2026):** foot-pedal support was originally disclaimed here as out of browser reach — re-verified and found incorrect. `useFootPedal.ts` (Gamepad API + keyboard-emulation capture, already working for `SynopticReportPage.tsx`'s dictation controls) is now wired into this page: Pedal 2 fires the real `handlePrintNext()` — PS-284's own named "Print/Etch Next... physical foot pedal integration" trigger. Configured per-workstation at Config → System → Voice → Foot Pedal.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`MicrotomyWorkstationPage.tsx`: the patient name in the context bar is tagged. The page reads scan stations through `@/services`, so it came off the mock-import baseline.

## Batch 367 (PS-74): no inline CSS

`components/HardwarePrintPanel.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 388 (PS-359): comment drawer and slide grid

- **Field Requirements** (page `microtomy`, Configuration → System → Field Requirements): the comment drawer needs the comment text (locked); the slide grid's Add needs a stain (locked) and, if the organisation switches it on, a level depth (µm). Reprint reason and the cancel reason for a printed slide are locked and listed. Both components show "Still required: …", star required labels and keep Add off until filled.
- **Voice/keyboard:** "add comment" (Ctrl+Alt+Shift+A) and "add stain" (Ctrl+Alt+Shift+B), category `MICROTOMY`; the page now sets `VOICE_CONTEXT.MICROTOMY`. Each acts as its Add button, checks included.
- **Translated:** stain category tabs, reprint and cancel reasons (stored as the English values, shown through `microtomyWorkstation.reasons.*`), the comment label and meta line, level labels, and the scan errors that the hook sets (`microtomyWorkstation.scanErrors.*`). Dates (comment time, prior-slide history, date of birth) follow the user's locale.
- **Baseline:** `hooks/useMicrotomyWorkstation.ts` came off the mock-import baseline.
- **Tests:** `components/microtomyRequirements.test.tsx` (comment drawer and slide grid) and `MicrotomyWorkstationPage.i18n.guard.test.ts`.
- **Still English, on purpose:** print-failure text from the print chain (`printFailureReason`, stored on the slide and shown in the grid and the batch progress modal), and the block status string.
- **Not part of this pass:** `HardwarePrintPanel`, `CytologyPanel` and `BatchProgressModal` were not re-checked for hard-coded text.

## Batch 389 (PS-359): the rest of the page

- **`HardwarePrintPanel`:** the two label-fit warnings and the label size are words from `microtomyWorkstation.hardware.fit.*` / `.labelSize`; `resolveSlideLabelFitWarnings` now also returns `requiredMm` and `faceMm` (its English `message` stays for logs and tests).
- **`CytologyPanel`:** the suggested preparations are joined with `formatList`.
- **Checked and already translated:** `CytologyPanel`, `BatchProgressModal` and the page itself. What remains English is stored data: the print-failure text on a slide, the block status, and the tissue and specimen descriptions.
- **Not gated:** the decant fields (volume, appearance, yield) save as typed and the print buttons have no required fields, so there is nothing for Field Requirements to hold back there.
- **Tests:** `components/microtomyPanels.test.tsx`; the guard test now also covers the two components.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

`hooks/useMicrotomyWorkstation.ts`: when a save changes only decants, each change goes through the atomic, versioned save (`applyDecantChangeLive`) and publishes `MATERIAL_DECANTED`. Any other change saves as before. The decision is `decantOnlyUpdates` in `services/material/materialTree.ts`.

## Batch 460 — Matrix blocks, saving, slide order, billing

**Matrix blocks.** Scanning a matrix block (`S26-4404-M1`) or one of its slides opens it like a block.
- The left panel lists its cores (position and specimen).
- Add stain, levels, remove, print, reprint, reorder, comments and alert flags all work.
- A slide added here targets every core; billing still waits for the pathologist to confirm which cores were evaluated.
- It's saved to `Case.matrixBlocks`, through a one-block view (`utils/microtomyOperations.ts` `matrixBlockAsSpecimenView`).
- Before this batch, the scan stopped at "Specimen not found".

**Saving (PS-71).** Every change is an operation, re-applied to the newest case if someone saved first (`updateCaseWithRetry`).
- The app-wide scan tracker writes to the case on the same scan, so this happened routinely.
- Before, a conflicting save was only logged, and the tech's change was lost while the screen showed it.
- A save that still fails shows a red message and reloads the block.

**Slide order.**
- A slide's level is its printed one, so reordering never changes which slide a barcode means.
- A removed level is never reused.
- Batch prints follow the grid order, not the order the slides were ticked.

**Billing (Pete: read-only by default).** The Billing box lists each slide's codes, status and warnings. "$ Full billing review" (needs `billing:applied-code:review`) opens the full panel.
- See `services/billing/README.md` (Batch 460) for the User and Admin Guide.
- Files: `hooks/useMicrotomyBilling.ts`, `components/MicrotomyBillingPanel.tsx`.

**Strings.** The printer-setup errors that were English in the hook are now translated.

**Still open:**
- The two print paths (this page and the global tracker's placeholder labels) are still not reconciled.
- Embedding and Slide Distribution still don't take matrix blocks (Embedding now says so instead of "specimen not found").

**Batch 460, after independent review:**
- A label is printed only after its "Printing" mark (or a reprint's reason) is saved.
- A slide removed meanwhile isn't printed.
- A decant conflict reloads the block.
- Billing charges only orchestration cases, as on the report page, and the charge status refreshes after each charge.

---
*See [pages/README.md](../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 652 (defect fixes)

Correction: the note above that the scan path runs only the engraver stub "regardless of `supportsPrinting`" is fixed. `processMicrotomyScan` now uses `utils/labels/dispatchScanSlideLabel.ts`: a printing station sends the label through `printSlideLabel` (the service Print Next uses); a slide is marked Cut & Placed only if a label was produced.

## Batch 669 (ws-2, ws-3, ws-4, ws-5, ws-6, ws-19)

- **Decant slides (ws-2).** The slide comment and the Reprint reason now work on a decant (`updateDecantStainComment`, `reprintDecantStain` in `utils/microtomyOperations.ts`); before, both controls were shown and did nothing. Block comments, alert badges and Block exhausted stay block-only.
- **Print messages (ws-4).** **Print/Etch Next** (button and foot pedal) shows why nothing printed (block flagged exhausted, "The print couldn't be started") or the printer's failure message, in a red line above the work (`printNotice` in the hook). It clears on the next print, on **Scan next** and on a new scan. The per-row **Print** already showed these messages in the progress window (the finding was stale for that button).
- **Accept suggestion (ws-5).** Only the suggested slides not already on the decant are offered and added (`remainingPrepSuggestions`); the button goes and a line says so when all are there. A second press adds nothing and saves nothing.
- **Quick Undo (ws-6, Pete, Oct 24, 2026).** Remove and Reprint still act at once (the reason is the only click). A toast (`components/UndoToast.tsx`, `UndoToast.css`) offers **Undo** for 8 seconds (`MICROTOMY_UNDO_WINDOW_MS`). Undo puts the slide back (`restoreStainOrder`): a removed unprinted slide returns at its place; a cancelled printed slide gets its status back; a reprint's count and reason are cleared. A comment added meanwhile is kept. A reprint's label has already gone to the printer: the toast says to discard it. The toast goes after the window, on **Scan next** and when another Remove/Reprint replaces it.
- **Block exhausted (ws-3, ws-19).** The button needs `add-on:exception:flag` (greyed without it; the service checks again). When the slide has no ordering pathologist, or none with an e-mail address, the notice goes to the Supervisor / Accessioning Desk (`services/addOnOrders/blockExceptionRouting.ts`), and the control says so, or warns that nobody could be told.
- **Tests:** `hooks/useMicrotomyWorkstation.test.tsx` (new), `components/BlockExhaustedControl.test.tsx`, `components/microtomyPanels.test.tsx`, `utils/microtomyOperations.test.ts`.
- **Not done:** the two print paths (this page and the global scan tracker) are still not reconciled (ws-7).

## Batch 726

The **Carriers at this station** card: a tray of blocks from Embedding moves here when scanned; block scans are checked off against it. An open Staining carrier scanned here becomes the **output tray**, and **Add printed slides to tray** regroups the current block's printed slides into it (spec 2, row 5).

## Batch 729

- `hooks/useMicrotomyWorkstation.ts`: `printed` for each slide label, `completed` for the block after its last; `blocksStillWaiting`. Page: the waiting note (`MicrotomyWorkstationPage.css`, new) and the scan history.

## Batch 730

- `hooks/useMicrotomyWorkstation.ts`: a slide whose add-on label was printed at another station is not printed again (the cut is still recorded).

## Batch 731

- The block panel shows `ExhaustedBlockBanner` and `ItemEndStatePanel` (the block's end state); a printed slide's scan event carries `parentItemId` (the block, matrix block or decant). `useMicrotomyWorkstation.ts` now 611 lines.

## Batch 732

- Batch 732: `BlockPieceMapPanel` in the block panel with "Piece exhausted" (`handleMarkPieceExhausted`, `pieceView`); `SlideGridPanel.tsx` shows levels on the slide, large format and the pieces; slide labels carry the slide size.

## Batch 733

- Batch 733: the Block exhausted flag goes on every slide still waiting to be cut (`flagBlockExhaustedOnce`).

Batch 757: the dual scan. A label printed at the Microtome waits for its scan (`labelToScan`, shown above the grid); Print/Etch Next refuses until it is scanned; the scan records `sectioned` and the carrier hook places the slide in the staining rack. `useMicrotomyWorkstation.ts` 695 lines.

Batch 758: the print mode comes from the Microtome's own setting (`microtomePrintModeOf`); Block mode (`HardwarePrintPanel` third button) prints all of a block's labels when it is scanned (`printBlockLabels`, awaited so the label scans queued behind it find them printed) and lists every label still to scan (`labelsToScan`). The block lockout (`lockout`, `components/BlockLockoutBanner.tsx`, inline): another block scanned, or Scan next, while labels of this block are unscanned is held; Recut reprints with reason Damaged Section, Void cancels the slide, Continue logs each label `missing`, Stay closes it; when nothing is waiting the block scanned opens by itself. Reprint reasons gain Damaged Section. Hook: 695 → 795 lines.

Batch 759: no patient name or date of birth in the context bar; the Foreign ID of an outside case or item; the typed-entry check line.
