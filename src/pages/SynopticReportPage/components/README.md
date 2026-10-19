# pages/SynopticReportPage/components/

Presentational and semi-presentational pieces specific to the case report page — real business logic lives in `../hooks/`, not here. 27 component files (plus tests).

## Layout & navigation

- **`HeaderBar.tsx`** — the rich case header: accession, patient info, progress steps.
- **`Sidebar.tsx`** — specimen list, case-level actions (Case Comment, Retention Hold, Case Hold), delegate/team/flags entry points.
- **`LeftReportPanel.tsx`** — left-hand report panel, wires in `InternalNotesDrawer`.
- **`RightSynopticPanel.tsx`** — the main synoptic-answering panel; required-field validation, AI suggestions, template resolution.
- **`OrchestratorSectionEditor.tsx`** — Orchestration mode's own right-hand narrative editor, deliberately mirroring `RightSynopticPanel`'s structure so a pathologist moving between modes doesn't need to relearn the UI. **Real addition ("Personal Quick Text" — Enterprise then Facility then Staff), per direct guidance:** a real "QT" button per unlocked section, using the existing `editorRefs`/`getEditor()` handle (no changes needed to `PathScribeEditor.tsx`/`PathScribeEditorRef.ts` — `getEditor()` already exposed the raw TipTap instance) to read the current selection via the standard `editor.state.selection`/`textBetween()` API. Identity (`getSessionUser()`) and facility (this case's own real performing lab, resolved via the same facility fetch already made for jurisdiction, plus `resolvePerformingLabFacilityId()`) are auto-attributed — the confirmation modal only ever asks for the voice trigger. Saves a real `VoiceMacro` (`types/voiceMacros.ts`) with `ownerUserId` set — the Personal tier of the same three-tier model `services/macros/IMacroService.ts`'s `isMacroVisibleTo()` already established for "My Macros." Real, deliberate accuracy fix caught while wiring this: the resolved performing lab can genuinely be a different facility than the case's own ordering client (`Facility.performingLabFacilityId`'s real override) — the confirmation modal fetches and shows that actual resolved facility's own name, not the ordering client's, so the auto-attribution shown is never wrong.
- **`BottomActionBar.tsx`** — Previous/Next, Save, Finalize, and the rest of the persistent bottom action row. **Real, per direct follow-up (retiring Finalize for Orchestration Mode — see `services/reportRelease/README.md`'s own full account of why): "🔒 Finalize"/"🔒 Finalize & Next" now only render for `reportingMode === 'assist'`.** Save Draft/Save & Next/Gen. Report are untouched — only the Finalize buttons themselves moved inside a mode check, matching this same file's own pre-existing `reportingMode !== 'assist'` pattern already used for "✍️ Sign Out Case." Presentational only, as this folder's own purpose requires — the real decision of what Finalize being retired actually means (compliance gates, buffer start, dispatch) lives entirely in `../hooks/useSignOutWorkflow.ts`, not here. **New (Sep 2026), PS-290:** a "🌐 Consult" action, alongside "🔍 Req. Review," opens `components/ExternalConsult/ExternalConsultAccessModal.tsx` — same `caseData`/`user` props already threaded through for the review modal, no new plumbing. NOT real token security — see that modal's own README.
- **`SequencerPanel.tsx`** — case sequencing/navigation panel.

## Material & specimens

- **`MaterialTreePanel.tsx`** — the Specimens/Blocks/Slides/Decants tree, including the Grossing Release panel and cassette color display.
- **`GrossingReleasePanel.tsx`** — real scan-triggered grossing release UI (grossing-scan → hydrate → release workflow).
- **`MicroscopicEntryPanel.tsx`** — simple microscopic-description entry step, filling a real gap in the Orchestration flow ("after gross complete, what's the next logical step?").
- **`BiopsyArrayDiagram.tsx`** — real, visual diagram for assigning each biopsy core to a specific section of a shared block, so a pathologist can always identify which section of the block a given core was embedded in. Real, per direct billing-expert guidance (PS-93): `columnsFor()` is now exported and `positionToCoreCoordinate()` (new) derives a real "A1"/"B2" core coordinate against that same layout, so `MatrixBlockEditorModal.tsx`'s Array Mapper tab always shows the same coordinate for the same cell this diagram renders — never a second, independently-computed layout that could disagree.
- **`BillingReviewPanel.tsx`** — AI Billing Code Review tab: left tree (specimens/blocks with pending/applied-count badges), right detail panel (pending suggestions, applied codes, manual add), matching the Code Manager's own left-tree/right-detail interaction pattern. Real, per direct billing-expert guidance (PS-93): a separate `MatrixArrayCoverageSection` below the tree, the real Evaluated Cores Checklist for Biopsy Array coverage — see `services/billing/README.md`'s own PS-93 entry for the full account.
- **`AddSynopticModal.tsx`** — two-panel Flag-Manager-style modal for adding synoptic reports to a case.

## Amendment, release & status banners

- **`AmendmentDraftBanner.tsx`** — persistent Amendment Summary Box plus a live Changed Items Summary while an amendment/addendum is being drafted.
- **`AmendmentStatusBanner.tsx`** — one N-column version matrix per synoptic instance with released amendments (a case can have multiple, independently-amended reports).
- **`ReleaseBufferBanner.tsx`** — shown while a case is `pending-release`: live countdown to automatic release, with a real recall option for the signing pathologist (Post-Sign-Out Release Buffer).
- **`RevisionFeedbackBanner.tsx`** — new, real, per direct follow-up ("Continue" — a real gap found while double-checking the just-built "Return to Trainee" feature, not asked for directly): shown while a case is `returned`, surfacing the attending's real rejection feedback to the resident. Closes a real, pre-existing gap that predates this session's own work — `countersignService.getForCase()` had never been called anywhere in the app, meaning `attendingFeedback` (real since the countersign workflow was first built) was never shown to a resident in context, for either the original `countersign()` (accept) path or this session's new `reject()` path; the only place it was ever displayed was `CountersignTurnaroundTab.tsx`, a QA/management dashboard a resident wouldn't naturally open while actively fixing their own case. `getForCase()` itself (`services/cases/README.md`) was extended to also match `'returned'`, not just `'pending'`, to make this possible.
- **`PendingReleaseWatermark.tsx`** — non-removable diagonal watermark on any PDF/browser/internal view of a case still in the release buffer window.

## Other

- **`MarkersPanel.tsx`** — resolved biomarker values grouped by marker (e.g. all ER-related fields — Status, % Positivity, Intensity — under one card).
- **`EMRSidecarDrawer.tsx`** — slide-in EMR sidecar drawer (replaces an earlier floating/draggable modal version, now matching the app's standard drawer convention).
- Added later and described in the batch notes below: `AiReportToolButtons.tsx` (Batch 451), `AutopsyCaseTimeline.tsx`, `DispatchHistoryTimeline.tsx`, `EditConflictDialog.tsx`, `MergeReviewDialog.tsx`, `PeerReviewBanner.tsx` (Batch 439).
- **`WsiViewerLaunchButton.tsx`** — opens a slide's scan in the external whole-slide-image viewer. Used by `../modals/BlockStainEditorModal.tsx` and the Cytology screening page.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the folder has 27 component files, not 17; listed the ones the sections above left out.*

## Batch 338 (PS-342): spell checking

- **`OrchestratorSectionEditor.tsx`:**
  - the AI spelling check (`SpellCheckPopover`, the review state, `handleAcceptWithSpellCheck`) is removed, and Accept commits directly;
  - the header shows `SpellingLanguageControl` instead of the jurisdiction badge;
  - specimen section titles take the template's label formatting as `--label-*` custom properties (`utils/labelStyleVars.ts`) instead of an inline style;
  - macros and voice macros now come from `@/services` (`macroService`, `voiceMacroService`), so the file is off the mock-import baseline.
- **`MicroscopicEntryPanel.tsx`:** shows the spelling language control above its editor.
- **`RightSynopticPanel.tsx`:** free-text synoptic fields use `SpellCheckedTextarea`; the progress bar's width is passed as `--syn-progress-pct`.

**Batch 349 (PS-100):** `ReleaseBufferBanner.tsx`'s `showToast` prop takes the optional toast kind.

**Batch 350:** `HeaderBar.tsx`'s status pill label is translated (`getCaseStatusLabel(status, revision, t)`, `caseStatusDisplay.*`); it was the English status code in Title Case.

## Batch 353

`InformalReviewBanner.tsx` reads and completes the informal review through `delegationService`. It used to call the demo case service, and it is now off the mock-import baseline. *Deleted in Batch 355; see below.*

## Batch 355 (PS-346)

- **Deleted:** `InformalReviewBanner.tsx`, along with its `.ps-informal-review-banner` CSS and its `informalReviewBanner.*` keys in all five languages. No page rendered it.
- **Comments updated:** `ReleaseBufferBanner.tsx` and `RevisionFeedbackBanner.tsx` no longer point to it.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

- `LeftReportPanel.tsx`: the case/MRN/patient/date-of-birth row tags each value with its kind (it was untagged). The pending-release watermark comes in as `--ps-watermark-image` with a CSS class; it was three inline style properties. The panel reads report release through `@/services`, so it came off the mock-import baseline.
- `MaterialTreePanel.tsx`: specimen, block and decant ids (they contain the accession) are tagged.


## Batch 364 (PS-349, PS-350): support references

`HeaderBar.tsx`: a "Support reference" chip (compact header) and field (full header). Clicking creates or reveals the case's reference and copies it.

## Batch 367 (PS-74): no inline CSS

`BottomActionBar.tsx`, `DispatchHistoryTimeline.tsx`, `SequencerPanel.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

`BottomActionBar.tsx`: the action buttons' look and hover live in `.ps-bab-action-btn`; only the colour is per button.

## Batch 368

- **`HeaderBar.tsx`:** optional `changeCount` / `onOpenChangeHistory` add the Change history chip beside the version chip.
- **`BottomActionBar.tsx`:** reads the release settings through `reportReleaseService` from `@/services`, and is off the deployment baseline.

## Batch 425

`HeaderBar` shows the registry opt-out badge under the patient's name when the patient has opted out.

## Batch 426

`RightSynopticPanel`'s field rows show "The updated narrative suggests X — Keep mine / Accept new value" for a re-evaluated field.

## Batch 427

The `Sidebar` has a "Parts covered" button (⧉) on each draft synoptic workup, and shows "Parts A + B" on a combined one.

## Batch 428: Configuration permissions

`HeaderBar.tsx`: resolving (and, when new, adding) the flag a LIS-reported code stands for is `services/flags/resolveLisFlagDefinition.ts` now, not the component. Adding to the flag catalog is a Configuration change; this one is the LIS sync's, so it isn't checked against the person.

## Batch 437 (PS-329)

`RightSynopticPanel.tsx` reports the template's Must Have fields (`onMustHaveFieldsUpdate`). `HeaderBar.tsx` takes `AiSynthesisStatus` from the service instead of a duplicate type.

## Batch 439 (PS-144)

`PeerReviewBanner.tsx`: recommended or required (first-time malignancy), waiting on the reviewer (who records their read here; the requester can withdraw), a disagreement (either pathologist records the outcome), overridden for urgent care, or complete. Any pathologist can ask for a review on a case not yet signed out.

## Batch 445

- `HeaderBar.tsx` and `LeftReportPanel.tsx` show the date of birth with `formatDate(…, i18n.language)`.
- `MaterialTreePanel.tsx` shows location and exception dates in the user's language (it hard-coded `'en-US'`).

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

## Batch 450 — test evidence for Priority 1 and 2 tickets

See `../README.md` (Batch 450): logic moved to services and new tests for PS-57, PS-141, PS-274, PS-275, PS-317, PS-318, PS-324.

## Batch 451 — screen-level test evidence for Priority 2 tickets

New `AiReportToolButtons.tsx`; tests for billing/material sync (PS-316), Assign Code (PS-310) and the synoptic empty state (PS-310).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

- `BillingReviewPanel`: rows come from the material tree with decants included. It listens to the case's material events, and takes `caseId` and `materialSelectionSeq`.
- `MaterialTreePanel`: decant rows can split a cell block from a residual fluid decant, or be removed.
- `OrchestratorSectionEditor` and `LeftReportPanel` take `criticalFindings` and highlight them.
- New tests: `DecantBillingSync.test.tsx` (integration).

## Batch 453 — The Batch 452 open items, and the native-speaker review register

`MicroscopicEntryPanel.tsx` takes `highlightFindings` and passes it to the editor, so the microscopic findings are highlighted per specimen (PS-323). The saved text is unchanged. Test: `MicroscopicEntryPanel.highlight.test.tsx`.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

`EditConflictDialog.tsx` (with its test): the report page's conflict dialog.

## Batch 458 — PS-71 (review before saving over someone else's save)

`MergeReviewDialog.tsx` (with its test): "Someone else changed this case while you were working". It shows what they changed and what you're saving, with Save mine with theirs or Not yet. The page uses it for draft and instant saves; the Edit Conflict dialog is shown only when the same field was changed both ways.

## Batch 459

`BottomActionBar.tsx` takes `followUpOffer` and `onMarkFollowUp`. When the offer is `offer`, it shows "Mark follow-up expected" (a `CapabilityButton` for `case:follow-up:expect`). When the offer is `marked`, it shows "Follow-up expected · due <date>", with who marked it in the tooltip. The bar decides nothing itself: the page loads the offer from `loadFollowUpMarkOffer`.

## Batch 460

`MaterialTreePanel.tsx` shows each slide's printed level (`material/slideLevels.ts`), not its position.

## Batch 461

`RightSynopticPanel.tsx`: renders the results grid question (`partGrid`: a row per part of the case, a dropdown or number per cell; each cell is an ordinary answer via `setAnswer`). Answered/unanswered checks now use `synopticFieldAnswered` (progress badge, section counts, "next unanswered", required-field validation, the sign-out statistics; `useSignOutWorkflow`'s required-field gate too), and a hidden question's answers are cleared with `clearSynopticFieldAnswers` (all of a grid's cells).

## Batch 462

`RightSynopticPanel.tsx`: a results grid uses the template's own rows when it has them (numbered foci, one row per margin), with the template's heading over them; number cells don't take negatives.

## Batch 463

`RightSynopticPanel.tsx`: a `spatialStageCanvas` question renders the Mohs stage question (`MohsStagesInput`) with the facility's map colours and the default histology from the tumour type; its patches go through `applyAnswerPatch` and the usual hidden-question clean-up.

## Batch 463b

`RightSynopticPanel.tsx`: progress, Next unanswered / Next required and the Cannot-finalise list use `synopticFieldComplete` / `synopticFieldMissing`, so a Mohs question with an unassigned block counts as incomplete and is listed, required or not.

## Batch 467 — In-house molecular orders

`RightSynopticPanel.tsx`: a question filled from a molecular result says so; when the answer differs from the result it shows the engine-delta tag "Result differs" with the result's answer and **Use result**.

## Batch 476 — Autopsy: unified case timeline (PS-261 follow-up, Module 4)

New `AutopsyCaseTimeline.tsx`: renders the real, merged timeline `services/autopsy/buildAutopsyCaseTimeline.ts` builds from the case's own autopsy record. Per-kind rendering, same pattern as `DispatchHistoryTimeline.tsx` — each of the 14 real event kinds gets its own translated label line, newest-first. No `data-phi` tagging: every name shown (staff, next-of-kin) is already displayed untagged elsewhere in this same autopsy section.

## Batch 478 — Autopsy: two new timeline entry kinds (PS-261 follow-up, Module 6)

`AutopsyCaseTimeline.tsx` gains two more per-kind render cases, now 16 in all: `organ_tag_recorded` (organ name via the existing `AUTOPSY_ORGAN_LABEL_KEY`, plus status) and `gate_overridden` (tier, who, reason). No new component, no new props shape — `buildAutopsyCaseTimeline.ts` already carries the fields these two cases need.

## Batch 483 — HeaderBar: a new "recorded signatures" chip (PS-359 tracker follow-up)

`HeaderBar.tsx` gains `signatureCount`/`onOpenSignatureHistory` props, rendered as a chip in the same row as the existing version/change-history chips, only shown once there's actually something to see — same real gap this section's deficiency/version indicators already closed, now closed for `services/signatures/` too. Opens the new `SignatureHistoryModal.tsx` (see `modals/README.md`'s own Batch 483 entry).

## Batch 492 — BottomActionBar: a real button for "Flag for Tumor Board / MDT" (PS-359 follow-up; real, found-while-testing bug fix)

Real, found-while-testing bug: `showFlagForMdtModal` in `SynopticReportPage.tsx` was only ever set by the `'delegation.tumorBoard'` voice/keyboard action handler — there was no clickable UI entry point for it at all, and Batch 491's own deactivation of `DelegateModal.tsx`'s `'TUMOR_BOARD'` delegation type removed the last (awkward) menu path that used to exist. A pathologist with no reason to know the voice phrase or `F18+PS006` shortcut had no way to reach it by mouse. `BottomActionBar.tsx` gains a new `onFlagForMdt?` prop and a `CapabilityButton` (capability `case:tumor-board:flag`, context `{ caseId }`) next to Flags/Codes — `CapabilityButton` rather than the plain `ActionButton` other delegation-family buttons use here, since this maps to exactly one capability rather than opening a modal with several actions of its own. New CSS class `.ps-bab-action-btn--flag-mdt` (`#EC4899`, distinct from the bar's existing purple/red/teal hues). Full i18n in all 5 locales (`bottomActionBar.actions.flagForMdt{Label,Title}`).

---
*See [pages/README.md](../../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 495

`BottomActionBar.tsx`: the assist-mode Print button is a `CapabilityButton` for `report:case-report:print` (new `.ps-bab-action-btn--print` modifier carries its colour, replacing the inline `ActionButton` colour). It opens the CoPilot report view, whose own Print is checked in the service.

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 512

`Sidebar`: the specimen badge component is `LisSyncBadge`, reading `specimen.lisSyncState`.

## Batch 519 (PS-494)

`RightSynopticPanel.tsx`: a free-text node count shows an inline hint when it isn't a count, "cannot be determined" or "at least N", when it exceeds its limit, and when a total is below the counts it covers (props `exceeds`, `belowSum`).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

`Sidebar` specimen and report rows and the `RightSynopticPanel` field header keep their click and keyboard handling but no button role, because they hold buttons of their own (axe: nested-interactive).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- `ReleaseBufferBanner.tsx` (Batch 555): the countdown's end goes through `services/reportRelease/releaseCountdown.ts` (the page releases, or waits for the server's release).

## Batch 567 (WCAG 2.1 AA, 4.1.2)

- `BillingReviewPanel.tsx`: a pending code's row holds buttons (confirm, override, dismiss), so it is no longer a button; clicking it still selects it, and its code is the button (`aria-current` when selected). The dismiss button has a name.
- `SequencerPanel.tsx`: a report's preview card holds its own "more fields" control, so it is no longer a button; its name is the button that opens the report.

## Batch 569 (WCAG 2.1 AA, 4.1.2)

- `Sidebar.tsx`: the collapsed rail's "changes to review" dot is a button beside the specimen's button (it was inside it), named with the review hint.

## Batch 572 (PS-539)

- `CaseUpdatedBanner.tsx` (new): "Someone else saved this case" with Reload and Later; shown above the tabs; not a window (click economy); only the message is a polite live region.

## Batch 573 (PS-539)

- `CasePresenceStrip.tsx` (new): each other person with the case open, editing or viewing, with email and call links when known; "You, in another window"; one polite announcement (repeated words are read again). Takes no space when nobody else is there.

## Batch 575

- `CaseUpdatedBanner.tsx`: Show their changes (in place) and Later; after an overlap, a lasting note with "Got it".

## Batch 583

- `HeaderBar.tsx`: the breadcrumb's second crumb and the compact header's back button use `caseReturnTarget` (Search or Worklist); strings `headerBar.breadcrumb.search`, `headerBar.nav.backToSearchTooltip`.

## Batch 612 (part C)

`OrchestratorSectionEditor` takes `fontUnits` so a specimen title uses the template's units.

## Batch 611 (part G)

`SmartCaptureLauncher.tsx`: the Smart Capture prototype drawer in `BillingReviewPanel` (suggested lines with rule and evidence, accept/reject, pathologist confirmation, payload preview, export). Labelled *Prototype, not compliance-reviewed*.

- Batch 612 (part A): `Sidebar.tsx` mounts `VendorFieldsPanel` after the add-synoptic button.
