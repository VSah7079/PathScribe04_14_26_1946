**Batch 759:** the Foreign case ID beside the accession in the header; after a typed accession, the parts to check.

**Batch 741:** Divide specimen under each specimen (`components/Material/DivideSpecimenPanel.tsx`, `hooks/useSpecimenDivision.ts`).

**Batch 735:** in the station touch layout; its windows are `role="dialog"`/`alertdialog` with `aria-modal`. An accession scanned here with nothing focused opens that case's grossing screen (scanRoutePolicy).

# pages/GrossingScreenPage/

**NEW (Sep 2026)** — Protocol-Driven Workflow Infrastructure story, Part 3. "New workflow surface between accessioning and sign-out. The grossing tech operates here; the pathologist does not." A deliberately separate, dedicated page from `SynopticReportPage.tsx` (the pathologist's own reporting surface) — reuses the exact same real `Specimen`/`HistologyBlock`/`StainOrder` data model, not a parallel schema.

**Route**: `/case/:caseId/grossing`, using the same `synopticLoader` (`loaders/synopticLoader.ts`) as `/case/:caseId/synoptic` — a grossing tech needs the same real pediatric/orchestration access checks a pathologist does. Reachable today via a "Open Grossing Screen" button on `SynopticReportPage.tsx`'s own Material tab.

## Files

- **`GrossingScreenPage.tsx`** — the page itself: protocol header (name, version from `Specimen.protocolSnapshot`, a "Protocol Modified" badge when any block has `userModified: true`), a histology block table (Block ID · Piece Count · Stains · Status · Actions), a separate cytology decant table (Slide ID · Stain · Imager Batch · FOV Count, cross-referenced live against `batchService.getAll()`'s own items by `displayId`), Add/Remove Block, Add/Remove Stain (with the confirmation dialog for removing a protocol default), and a collapsible per-specimen audit panel.
- **`hooks/useGrossingScreen.ts`** — wraps `utils/grossingScreenOperations.ts`'s pure functions with real `caseRouter.updateCase` persistence and concurrency-conflict retry, same shape as `SynopticReportPage/hooks/useSpecimenBlockManagement.ts`'s own write handlers.

## Related files elsewhere

- **`utils/grossingScreenOperations.ts`** (+ `.test.ts`) — the pure, tested business logic: `addGrossingBlock` (another instance of a given `ProtocolPathway`'s own defaults), `removeGrossingBlock` (Pending-only), `addGrossingStain`/`removeGrossingStain` (confirmation + audit log only for removing a protocol default — removing your own addition needs neither), `updateGrossingPieceCount` (always logged).
- **`types/case/Specimen.ts`** — `StainOrder.userAdded`, `HistologyBlock.userModified`, `Specimen.grossingOverrides?: SpecimenGrossingOverride[]` (field/blockLabel/originalValue/newValue/actor/timestamp — the audit panel's own real data).

## Notes

- Built with `useTranslation()` from the start (new page, per `i18n/README.md`'s rule #1) — every visible string in `GrossingScreenPage.tsx` goes through the `grossingScreen.*` locale namespace, across all 5 languages.
- Deliberately does NOT reuse `BlockStainEditorModal.tsx` (the pathologist-facing, 1,300+ line general block/stain editor) — that modal has no `allowedAdditionalStainTypeIds` filtering and no override-audit logging, and retrofitting either into an already-large, delicate file risked real regressions to working pathologist-facing behavior for a genuinely different real user (the grossing tech).
- Does NOT reuse `useSpecimenBlockManagement.ts`'s own `handleAddBlock` — that handler always defaults to a single H&E stain (the real, correct behavior for a pathologist manually ordering an ad-hoc recut), not the protocol-pathway-aware defaults this story's own Add Block needs.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`GrossingScreenPage.tsx`: the page title, which names the accession, is tagged.

## Batch 378 (PS-359)

- **Complete grossing** bar under the title:
  - While the case is waiting for grossing, it offers **Complete grossing** (a `CapabilityButton` for `case:grossing:complete`, greyed out until nothing is missing) and lists what's still required, e.g. "Piece count (A2)".
  - After completion it shows "Grossing completed".
  - Past grossing, it says so.
- **Voice and keyboard:** the page sets the new `GROSSING` voice context and listens for `GROSSING_COMPLETE` ("complete grossing", "finish grossing", "grossing done", with French, German, Dutch and Korean phrases; Alt+Shift+F9). The service decides, exactly as for the button.
- `hooks/useGrossingScreen.ts` loads the Grossing requirements and calls `services/grossing/completeGrossing`.

## Batch 379 (PS-359): completing without a protocol

- **Before completing**, when the organisation has switched off the protocol rule, the Complete grossing bar says which specimens have no protocol and will be routed for secondary review.
- **Complete grossing** then asks for confirmation: "Completing specimen without an attached protocol. This case will be routed for secondary review." (Pete's wording), naming the specimens. The confirmation can be answered by button, voice ("confirm complete grossing" / "cancel complete grossing") or keyboard (Alt+Shift+F10 / Alt+Shift+F11).
- **After completing**, the bar says which specimens were routed. If a routing deficiency couldn't be raised, it says so and asks the user to raise one by hand.
- **Converted on touch:** the fixation fields' labels and buttons ("Fixation ended:", "Record now", "Confirm adequate ratio", "Raise deficiency", "Deficiency raised", the ratio confirmation line) were English-only, and the ratio line showed a literal `\u2014` instead of a dash. They now go through `t()` in all five languages, and those dates, plus the override audit's, use `formatDateTime` in the user's language. A failed block removal shows a translated message instead of the service's English error. These strings should have been converted in Batch 378, when this page was last edited.
- Completion runs one attempt at a time, so a double click or a repeated command can't start a second attempt against the same case version.
- `hooks/useGrossingScreen.ts`: `secondaryReviewSpecimens`, `pendingProtocolConfirmation`, `confirmCompleteWithoutProtocol`, `cancelCompleteWithoutProtocol`, `completionReview`; the decisions stay in `services/grossing/`.

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

## Batch 481 — Structured Inking, Module 2: recording margins and ink applications (PS-359 follow-up)

A new **Margins & Ink Applications** section per specimen, below its block/decant tables: lists every margin recorded so far, grouped by where it lives (on the specimen directly, or on one of its blocks — never both for the same margin, per `types/case/Margin.ts`), each with its full append-only ink-application history and examination status. "+ Add margin" opens an inline form (attach to the specimen or a specific block, name, optional orientation/laterality, ink colour name/code, "mark examined" checkbox); each existing margin has its own "+ Add ink application" to append a further colour without ever renaming the margin or touching its prior history. Both forms are gated by `CapabilityButton capability="grossing:margin-ink:record"`.

`hooks/useGrossingScreen.ts` gains `handleRecordMarginInk`, which calls the real, capability-checked `services/grossing/recordMarginInkApplication.ts` (Batch 480) and, only on success, re-reads the case — that service doesn't hand back the updated case the way `recordAutopsyOrganTag.ts` does, so this follows the hook's own initial-load idiom instead of reconstructing the new margin locally.

**Deliberately not wired in this batch:** the severity engine's (`resolveInkingValidationSeverity.ts`) WARN_ONLY/STRICT_ENFORCE advisory display. It needs a real site id to read the site's `inking_validation_mode` from, and `Case` has no real link to a `Site` yet — the Organisation/Site admin UI is still unbuilt (see `services/grossing/README.md`'s own Batch 480 entry). Wiring that in is a later batch's own scope, once that link exists.

## Batch 482 — Structured Inking, Module 3: severity display + ink-colour palette (PS-359 follow-up)

The display deferred above, now wired in. `GrossingScreenPage.tsx`'s margin/ink forms:

- Pick a colour from the active ink-colour palette (`services/inkColors/`) via a `<select>`, instead of free-text colour name/code inputs.
- Show the severity engine's own real, current issues for each margin (`grossingScreen.margins.issues.*` — `margin_not_examined`/`margin_no_ink_applied` at severity 2, the new `margin_ink_color_unmapped` at severity 3) and a per-specimen notice naming the facility's own `inking_validation_mode` (`grossingScreen.margins.validationNotice.*`).

Unblocked by re-scoping `inking_validation_mode` from Site to the real, current `Case.order.facilityId` (`services/grossing/inkingSiteSettings.ts`'s own header explains why) — Pete's own choice, via `AskUserQuestion`, over deferring the display again until the Organisation/Site admin UI exists.

`hooks/useGrossingScreen.ts` gains `inkColors` (the active palette), `inkingValidationMode`, and `inkingValidation` (`resolveInkingValidationSeverity`'s real output, recomputed from the case's own current margins). **Display only** — doesn't change what blocks Complete grossing (`services/grossing/grossingCompletion.ts`); that's further, separate scope.

## Batch 484 — Gate A wired for real (PS-519 follow-up)

The "further, separate scope" above, now built: `handleCompleteGrossing` (`hooks/useGrossingScreen.ts`) runs `services/grossing/evaluateInkingGate.ts` before `completeGrossing` —

- A Severity 3 issue, or an unreadable ink-colour palette, opens a new blocking modal (no bypass — `showInkingGateBlock`/`cancelInkingGateBlock`).
- A Severity 2 issue (and nothing worse) opens a "Proceed with Advisory Note" confirmation (`showInkingAdvisoryConfirm`) instead of blocking; confirming logs an "Inking gate advisory acknowledged" audit entry, then completes grossing exactly as before.
- Also resolves the facility's own jurisdiction (`facilityService.getById`, new effect) and tracks whether the ink-colour palette read actually succeeded (`inkColorsLoaded`/`inkPaletteAvailable`) — distinct from the pre-existing `inkColors` display state, which stays unchanged.

Both new modals render in `GrossingScreenPage.tsx`, same `ps-overlay`/`ps-modal-dark`/`ps-batch-modal-*` shell as the existing `pendingProtocolConfirmation` modal.

---
*See [pages/README.md](../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 511 (PS-478): full strict type-checking

Click handlers check that the case is loaded before acting; one fixation test narrows its result. No visible change.

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. `useGrossingScreen` returns reason codes (`noCase`, `specimenNotFound`, `notPermitted`, …) that the screen translates. A refused margin-ink save shows a translated message chosen by reason.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 530 (Pete)

`CaseClinicalHistoryBar` under the header: add or reconcile the coded clinical history while grossing.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 652 — Specimen pipeline gaps

- Complete grossing now routes the case to its pool (`services/grossing/routeCaseAfterGrossing.ts`, the call the report page's Gross Complete makes) and a note under "Grossing complete" names the pool (`completionReview.routedToPool`, existing text key `useGrossingCompletion.toast.routedToPool`).

Batch 659: piece-description column and `GrossingMatrixBlocks` (shared blocks), saved through `useGrossingScreen`.


## Batch 705: stain tags tell the truth about where a stain came from

- Before: every stain not flagged `userAdded` was tagged "Auto-generated", even on a specimen with no protocol (demo case S26-4403 showed "No protocol assigned" beside "Auto-generated" stains), and removing it said it was "a default from the assigned protocol".
- Now `stainOrigin(specimen, stain)` (`utils/grossingScreenOperations.ts`) gives `userAdded`, `protocol` (a protocol is attached and no one added it) or `existing` (no protocol: the stain arrived with the case). The tags read User-added, Auto-generated and **Existing**.
- Removing a protocol or existing stain still asks for confirmation and is still logged as a `stainRemoved` override; the window wording follows the origin ("Remove Protocol Default Stain?" or "Remove Stain?"). Removing your own addition still needs neither.
- Locale keys: `grossingScreen.stainOrigin.*` and `grossingScreen.confirmRemoveStain.*` replace `autoGenerated`, `userAdded`, `confirmRemoveStainTitle` and `confirmRemoveStainBody`.

**Batch 715:** Add Block labels the new block in the case's letters/numbers style (it ignored the facility setting and always used letters before the fix) and never repeats a label after a removal.

## Batch 720 — bench tools
`GrossingBenchTools.tsx` (+ `.css`) puts the Material tab's grossing tools on this screen: print cassettes, gross photo (`CameraCaptureControl`), decal batch assignment (`batchService.addItemByScan`), Add-On Orders button, and the release panel with the triage checklist. It reuses `useSpecimenBlockManagement` so both screens behave alike. `hooks/useGrossingBenchEvents.ts` listens for the four `GROSSING_*` actions (`constants/grossingBenchActionGroup.ts`, `services/actionRegistry/grossingBenchVoiceCommands.ts`) and foot pedals 1 (photo) and 2 (print). The page reaches this screen from the Grossing tile or the report's Material tab.

## Batch 726

The bench tools' decal bench became **Load into carrier**: open, unsealed Decal or Processing carriers (spec 2, row 1), loaded with this computer's station (a 'loaded' station scan event). Locale keys `grossingBench.carrier.*` replace `grossingBench.decal.*`.

## Batch 729

- `GrossingScreenPage.tsx`: the wrong-case warning (`hooks/useWrongCaseScanCheck.ts`) and the scan history.

## Batch 732

- Batch 732 (spec §11.1, §11.2): `components/BlockPieceMapEditor.tsx` (+ `.css`, new): the block's type and piece map under the piece description; `hooks/useGrossingScreen.ts`: `handleSetBlockPieceMap`. `GrossingScreenPage.tsx` 805 lines.

Batch 756: `GrossingBlockTable.css` (new) gives the block table's piece description its dark field style (it had no rule, so it showed as a white box).
