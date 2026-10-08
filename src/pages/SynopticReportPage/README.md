# pages/SynopticReportPage/

The core clinical workflow page — a case's full report/material/sign-out experience, reached at `/case/:caseId/synoptic`.

## Files

- **`SynopticReportPage.tsx`** — layout and modal wiring only. Deliberately kept to that: business logic lives in `hooks/`, presentational pieces in `components/`, and every dialog in `modals/` — this file's own job is assembling those, not implementing them.

## Subfolders

- **`hooks/`** — ten domain hooks (LIS integration, specimen/block management, report generation, amendment workflow, grossing completion, orchestrator draft lifecycle, sign-out/finalize, microscopic entry, cassette scan verification, release-buffer countdown). See its own `README.md` for the full architecture and `hooks/__tests__/README.md` for the testing approach.
- **`components/`** — presentational pieces specific to this page (header, sidebar, material tree, banners, panels).
- **`modals/`** — every modal reachable from this page (23 files — sign-out, holds, specimen/block editors, amendment, team, printing, and more).

## Signing authority on this page (Sep 2026, PS-327 / PS-341)

Who may sign out, and whose sign-out is routed to a countersign
instead, is decided per case from its **performing lab and that lab's
jurisdiction**:

- **`hooks/useSignOutWorkflow.ts`** resolves the lab and jurisdiction
  once per attempt (via `services/facilities/resolveCasePerformingLabScope.ts`)
  and feeds both the countersign gate and the `canFinalizeCase()` write
  guard. This covers Orchestration sign-out and Assist-mode finalize.
  An admin-configured role marked "Requires Countersign" (e.g. the UK
  Biomedical Scientist) now really routes to countersign.
- **`modals/CaseTeamModal.tsx`** offers only the roles valid in that
  jurisdiction, with local titles (e.g. "Specialist Pathologist (FRCPA)"
  on an Australian case) and the same effective Countersign/Finalise
  badges the gate enforces.

The rules themselves live in `services/participationTypes/` (overview:
`services/README.md` → "Signing authority"). Neither file makes the
decision itself; `CaseTeamModal.tsx` is guarded by
`services/participationTypes/standingRules.guard.test.ts`.

## Batch 318 (PS-137)

Abnormal-detection agreement signals captured at sign-out now carry the covering Validation Study. The capture logic moved to `services/abnormalDetection/`; see `hooks/README.md`.

## Batch 327 (HTTPS)

- **Report renderer URL:** `REPORT_PDF` is resolved through `utils/serviceEndpoint.ts`. A production build needs `VITE_REPORT_PDF_ENDPOINT` set to an `https://` URL. If it isn't set, or isn't https, PDF printing falls back to printing from screen with the reason in the toast, and the PDF/text snapshots report it as their generation error. The `http://localhost:8080/` emulator default applies to development builds only.
- **Inline style removed:** the Dev Tools menu's position is now passed as the CSS variables `--devmenu-top` / `--devmenu-left`, read by `.ps-syn-devmenu--portaled`. Checked in the browser: the menu opens 4 px below its button.

## Batch 331 (PS-327)

- **Autopsy signing:** the Sign PAD / Sign FAD banners and toasts are translated (`autopsySignOut.*`), and the PAD date uses the user's locale. `signAutopsyReport` now checks signing authority and, for forensic cases, the signer's jurisdictional appointment; its error codes map to translated text here. See `services/autopsy/README.md`.
- **Not converted:** the adjacent "Ready for Body Release" banner is still English.

## Batch 332

The Autopsy "Ready for Body Release" banner is now translated (`autopsyBodyRelease.bannerTitle` / `bannerSummary`; the button reuses `autopsyBodyRelease.title`). This closes the English-only item noted in Batch 331.

## Batch 338 (PS-342): spell checking

- **`SynopticReportPage.tsx`** calls `useCaseSpellCheck` and wraps the page in `<SpellCheckProvider>`, so the report editor, the synoptic text fields and every report modal are checked in the case's spelling language. Changing the language for the case saves `Case.spellingLocaleOverride` with the page's usual version check (`saveSpellingLocaleOverride`).
- **`components/OrchestratorSectionEditor.tsx`:** the Accept-time AI spelling check is retired (Pete, Sep 26); Accept commits directly. The "British/American English" badge is replaced by the spelling language control. Two faults went with it: its prompt treated every language other than UK English as American English (so an Australian report was checked against US spelling), and the badge said "British English" for every non-US country.
- See `components/README.md` and `modals/README.md` for the text boxes that now use `SpellCheckedTextarea`.

## Signer confirmation (Batch 344, PS-60 follow-up)

- **Autopsy PAD/FAD:** the Sign PAD and Sign FAD buttons now open a `SignatureConfirmModal` (`components/Signing/`) first; `handleSignAutopsyReport` runs only after the signer is confirmed.
- **Sign-out and finalize modals:** they confirm the signer themselves; see `modals/README.md`.
- **Leftover state removed:** the unchecked credential state is gone from `../Synoptic/useSynopticFinalize.ts`.
- **Still on the baselines:** the page stays on the deployment baselines (mock imports, browser storage) for code this batch didn't touch.

**Batch 345:**
- **Autopsy PAD/FAD:** `handleSignAutopsyReport(tier, confirmation)` checks the signature through `signatureGate` before signing. It records it after the snapshot is saved (link: autopsy snapshot + tier), and drops it if signing is refused further on.


**Batch 348 (PS-67):** `hooks/useSignOutWorkflow.ts` reads the AI service results in the app's one `{ ok, data }` shape. No visible change.

**Batch 349 (PS-100):** warnings and failures on this page (75 calls here and in `hooks/`) pass `'warning'` to `showToast`, so they stay until the pathologist closes them. Nine English-only warnings were moved to `synopticReportPage.toast.*` in all five languages.

**Batch 350:** whether the case was opened from Search, and the return to Search, go through `utils/search/searchSession.ts` (was direct session storage). The header's status pill is translated (`components/HeaderBar.tsx`).

## Batch 353

`components/InformalReviewBanner.tsx` now uses `delegationService`. See [components/README.md](components/README.md).

## Batch 355

`components/InformalReviewBanner.tsx` was deleted (PS-346). This page stopped rendering it when informal reviews stopped being a delegation type.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`SynopticReportPage.tsx`: the report toast passes `containsPhi` through to `SaveToast`; the intraoperative-merge toast is translated (`synopticReportPage.toast.intraopMerged`) and marked; the case-not-found message tags the id.


## Batch 364 (PS-349, PS-350): support references

`components/HeaderBar.tsx` shows the case's support reference, in both compact and full header modes.

## Batch 367 (PS-74): no inline CSS

Subfolders converted their last inline styles to `pathscribe.css` classes (see each folder's README). Standing rule 1 now holds app-wide, checked by `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368 (PS-353): Change history

- **Header:** a "📝 N recorded saves" chip opens the new `modals/ChangeHistoryModal.tsx`.
- **The page** loads the case's change log and refreshes when an entry is recorded (`REPORT_CHANGE_LOGGED_EVENT`).
- **Export:** goes through `services/reportChangeLog/exportChangeLog.ts`, which checks the capability `report:change-history:export` (Batch 369, PS-355) and audits both the check and the export.

## Batch 369 (PS-355)

The Change history modal's Export button is a `CapabilityButton` for `report:change-history:export`. The page passes `authorizationService` to `exportChangeLog`, which checks and audits before building the CSV.

## Batch 370 (PS-356)

The change-history export passes the case's `order.facilityId` for facility scope, both to the modal's button and to `exportChangeLog`.

## Batch 380 (PS-359)

Field Requirements now cover the page's first three modals: Add/Edit specimen, amendments and addenda, and critical findings. Each has a voice command for its save button. Also fixed:
- minor amendments and addenda couldn't be saved from a new draft;
- a specimen's laterality was never saved.

See `modals/README.md` and `hooks/README.md`. `SynopticReportPage.tsx` itself wasn't changed.

## Batch 381 (PS-359)

- **Group 2 modals:** Field Requirements now cover the holds, comments, Delegate, biopsy arrays, and block cancellation and restains. See `modals/README.md` and `pages/Synoptic/`.
- **`SynopticReportPage.tsx`:**
  - After a hold is placed or released, or a case delegated, the page takes the case's new version. Before, its next save (a comment, a draft) was refused as someone else's change.
  - "Case delegated" is translated.
  - It came off both deployment baselines: services through `@/services`, display preferences through `utils/uiPreferences`.

## Batch 382 (PS-359)

- **Group 3, part 1:** Field Requirements now cover the frozen-versus-final reconciliation modal and the two billing modals (post-sign-out reason, applied-code correction). See `modals/README.md`.
- **`SynopticReportPage.tsx`:** correcting an applied billing code asks `billing:applied-code:correct` before it changes anything, and says so if refused (a translated toast).
- **Signed-out fallback name:** the English "Unknown User" appeared in twelve places (not six, as first reported); all use `common.unknownUser` now, read once as `unknownUserName`.

## Batch 383 (PS-359)

- **Group 3, part 2:** Field Requirements now cover `FixativeTimeGateModal` and `PreAnalyticDateGateModal`, and the page mounts the two autopsy forms with the same rules. See `modals/README.md`.
- **`SynopticReportPage.tsx`:** four success toasts were English text and are translated: authorization recorded, body released, fixation time recorded, pre-analytic dates recorded (`synopticReportPage.toast.*`).

## Batch 392

`buildReportRenderPayload` sends `language` and `labels` (from `services/reports/surgicalReportLabels.ts`, in the performing lab's language) and writes the date of birth in the lab's locale (it was always British English). The renderer (`functions/main.py`) uses them. The PDF the page makes at release now also travels with the result message (`services/reports/`).

## Batch 397

Field Requirements for Add Orders → Blocks / Recut and the block and matrix block editors' piece fields. See `modals/README.md`.

## Batch 398

`hooks/useGrossingCompletion.ts`: Gross Complete / Update Gross apply the organisation's Grossing field requirements and `case:grossing:complete` (`services/grossing/reportGrossComplete.ts`); a Grossing template counts as the specimen's protocol. With the protocol rule off, `SynopticReportPage.tsx` shows a confirmation (the shared `ConfirmModal`) and the specimens are routed for secondary review. Still open: Update Gross asks its reason with `window.prompt`.

## Batch 425

The header's patient field shows the registry opt-out badge (`components/HeaderBar.tsx`).

## Batch 426

- An Assist Finalize sends the case's synoptic workups to the LIS, each with its own PDF.
- Corrections and addenda send the corrected workup.
- The synoptic panel asks "keep or update?" for fields the AI re-evaluated.

## Batch 427

A draft synoptic workup can be set to cover several parts (sidebar → ⧉ "Parts covered"). Like any synoptic edit, the change is saved with Save.

## Batch 428: Configuration permissions

`components/HeaderBar.tsx`: LIS flag auto-creation moved to a service. See `components/README.md`.

## Batch 431

`hooks/useOrchestratorDraft.ts`: no browser copy of the AI draft sections. Saving writes the case only; opening reads the case only. Before, a browser copy was read first and could override a newer save made at another workstation.

## Batch 433

When the performing lab (or its enterprise) requires billing approval, the charges and credits made at sign-out wait as `PENDING_APPROVAL` (`services/billing/chargeApproval.ts` `markAwaitingApproval`), for Quality Assurance → Financials → Charges awaiting approval. The "Correct code" action goes through the one correction engine (`services/billing/billingCorrection.ts`).

## Batch 437

- **PS-329:** the AI badge counts Must Have fields only. `RightSynopticPanel` reports the template's required, shown fields; `services/templates/aiSynthesisStatus.ts` decides.
- **PS-282:** the report's Print is planned first (`planReportPrint`). A reprint asks for a reason when the lab requires one, and a Pending Release report says its copy carries the watermark, in `modals/ReportPrintPromptModal.tsx`; this was an English `window.confirm`. Each print is audited with the route it took.
  - The Copilot report view's print does the same.
  - Opening a stored version's PDF is audited, as are label prints and the material tracking history print.

## Batch 439 (PS-144, PS-145)

- A peer review banner (`components/PeerReviewBanner.tsx`, via `hooks/usePeerReview.ts`).
- Two more sign-out checks after the stain QC gate, on both sign-out paths (`hooks/checkPeerReviewAndMismatch.ts`): a clinical-pathologic mismatch to decide (`modals/ClinicalMismatchModal.tsx`), then the peer-review gate where it is switched on (`modals/PeerReviewGateModal.tsx`). Both resume sign-out the way the stain QC gate does.

## Batch 441

`modals/CaseTeamModal.tsx` saves through `services/cases/saveCaseTeam.ts` (`case:team:manage`; a cytotech can't be put in a pathologist slot, and the refusal names who and which slot). Adding the assignee when the modal opens is `withAssigneeOnTeam` (a cytotech assignee joins as cytotechnologist).

## Batch 444

Environment settings here are read by full name (`import.meta.env.VITE_X`). The previous whole-object forms made Vite copy every `VITE_` variable into the bundle (`services/security/envExposure.guard.test.ts`).

## Batch 445: translated

The report page's remaining English is translated (about 100 items; the readiness one-pager said 8, then 40, both undercounts). Covered:
- toasts;
- the required-fields banner;
- the tab names;
- the template picker;
- the LIS amendment and autopsy banners;
- the Organ Retention Tier list;
- the countersign banner;
- the AI tool buttons;
- the "someone else changed this case" dialog;
- Cannot Finalise;
- the tab-switch dialog;
- the development-only Dev Tools menu.

Also changed:
- `markDirty` takes a section id (`services/reportEditing/dirtySections.ts`), so the Unsaved Changes list is translated too.
- The default template's stored name stays English in the saved data and shows translated on screen.

**Guard:** `reportPageText.guard.test.ts` parses every file in this folder and fails on literal on-screen text: JSX text, title/placeholder/aria-label/alt strings, `showToast('…')`, or a `markDirty` label that isn't a section id.

**Not caught by the guard:** text assigned to a variable first (the tab names were). Those are found by review.

**Dates:**
- The header, the left panel and the version history show the date of birth with the shared `formatDate`, in the user's language.
- `toLocaleDateString()` used the browser's language, and a date-only birth date showed as the day before west of UTC.
- `MaterialTreePanel` no longer hard-codes `'en-US'`.

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

## Batch 450 — test evidence for Priority 1 and 2 tickets

- Code Manager save/reopen logic moved to `services/codes/codeManagerCoding.ts` (PS-141); ICD-O codes are no longer erased on save.
- Full Patient Report rows moved to `services/reports/fullPatientReportRows.ts` (PS-318); Regen All sequencing and section labels to `services/reportEditing/orchestratorSections.ts` (PS-317).
- LIS-sync flag placement moved from `HeaderBar.tsx` to `services/flags/applyLisSyncFlags.ts` (PS-57).
- `AiNarrativeReviewModal` showed the escape text `\u2726` / `\u00d7` instead of ✦ and ×; fixed and tested.
- New hook tests: Suggest Synoptic from Narrative (PS-274), Generate Narrative review and insert (PS-275), surgical sign-out runs post-sign-out QA (PS-324).
- **Open:** the Code Manager stores code objects in `Case.coding.icd10/snomed`, typed as string lists; a cast keeps behaviour identical until the type is corrected.

## Batch 451 — screen-level test evidence for Priority 2 tickets

- AI tool buttons moved to `components/AiReportToolButtons.tsx`; which show is decided in `services/aiIntegration/aiReportTools.ts`. Generate Narrative appears only in orchestrator mode (PS-274, PS-275).
- Material ↔ billing selection matching moved to `services/billing/billingMaterialSync.ts` (PS-316). Decants not syncing and reselecting the same block not re-syncing were fixed in Batch 452.
- Change history's ordering and filter moved to `reportChangeRules.ts` (`changeHistoryView`) (PS-353).
- The Print button's audit entry is built in `services/printing/reportPrintAudit.ts`; Report Preview print, stored PDFs and CoPilot print are tested against the audit store (PS-282).
- Tests for the empty state and Assign Code button (PS-310).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

- **Inline finding highlights (PS-323):** after Finalize detects critical findings, each one is highlighted in the Report Draft section that feeds its field, with a note above the section. They are also marked in the Full Patient Report's Gross, Microscopic and Ancillary rows. The highlight is never saved.
- **Decant ↔ billing (Pete, Oct 4):** decant changes go through the case material store (`hooks/useCaseMaterialStore.ts`, `services/material/`).
  - The Material tab updates at once.
  - `MATERIAL_DECANTED` tells the billing panel, which recalculates from the material tree. Decants now have billing rows and can be coded.
  - The save is atomic and on the case's current version.
  - If the save fails, both panels roll back.
  - A conflict opens the edit-conflict dialog instead of forcing the save through as before.
  - Clicking a decant selects its billing row, and clicking the same block again re-syncs billing.
  - Decants can be split from another decant ("Cell block from D1") and removed (`case:decant:delete`).
  - Billing codes on a decant row are written to the decant (`updateBillableMaterial`).

## Batch 453 — The Batch 452 open items, and the native-speaker review register

`SynopticReportPage.tsx` passes the microscopic findings (`findingsForField(criticalFindings, 'microscopic')`) to `MicroscopicEntryPanel`.

## Batch 454 — Follow-up not received: report, alerts and clinician email

`SynopticReportPage.tsx` holds the "follow-up expected" box state, offers the box only to a signer holding `case:follow-up:expect`, and clears it when the sign-out modal closes.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

- **Edit Conflict dialog** (`components/EditConflictDialog.tsx`):
  - Keep working.
  - View changes: which parts differ from the saved version, and which "Save mine anyway" would replace.
  - Reload their version.
  - Save mine anyway: now checked (`case:edit-conflict:override`), saved against the newest version and audited. Before, it saved with no version.
- `writeCaseDraft` requires a version; `caseDraftUpdates` is shared with the overwrite.
- The page keeps its old version after a save that was merged with someone else's (holds, team, delegation, blocks), so its next save of anything else is checked rather than overwriting theirs.

## Batch 458 — PS-71 (continued)

The browser draft copy carries its merge base and version; restoring it merges section by section like a refused save (Batch 458).

## Batch 458 — PS-71 (review before saving over someone else's save)

- Every instant save goes through `savePagePatch`, which uses `services/cases/caseWrite.ts` `savePageChange`. Covered: specimen and case comments, flags, codes, priority, specimen and block details, autopsy details.
- A change that stops at either dialog is kept (`pendingPartsRef`) and saved with the next save or with Save mine anyway.
- The review's choices use `commitMergeReview` and `takeUpSavedCase`.
- User and admin explanations: `services/cases/README.md`.

## Batch 459

`SynopticReportPage.tsx` loads the follow-up offer whenever the case or its status changes, and passes it to the action bar. Clicking "Mark follow-up expected" calls `markFollowUpExpectedAfterSignOutLive` and shows the due date, or the reason it wasn't marked (`bottomActionBar.followUp.notMarked.*`). See `services/followUp/README.md`.

## Batch 460

The billing panel's handlers now call `services/billing/caseBillingCoding.ts` and `caseBillingCharges.ts`, shared with the Cytology Workspace and Microtomy, instead of computing inline.
- Each change first checks `billing:applied-code:review`; a refusal shows a warning and changes nothing.
- Behaviour is otherwise unchanged: the same post-sign-out reason, ledger entries and audit text.
- Rule 2 progress: the charge, credit and correction decisions left the page; `recordChargeTransaction` and `recordCreditTransaction` are now one-line wrappers.

**Batch 460, after independent review:** these now use the printed slide level:
- Manage Reprints;
- the staining QC gate;
- LIS decant-slide steps;
- Material Tracking History.

Correcting a code and confirming a matrix block's evaluated cores now also check `billing:applied-code:review`.

## Batch 461: the anatomical map companion (prostate)

- A **Map** button above the synoptic (shown when the active synoptic has a map) opens the `OrganMapPanel`; open or closed is remembered per user. **The map's cancer data comes from the synoptic report**: a map is worked out from the synoptic answers every time it is drawn and stores nothing of its own. Change an answer and the map changes.
- Clicking a sector jumps to (and highlights) its synoptic question (`alertFieldId`).
- **Insert into report** is optional per case: a snapshot in print colours and the report's language (SVG + PNG; nothing is inserted when no PNG can be drawn). When the answers change afterwards the panel says "Report image is out of date — insert again", and sign-out stops until it is inserted again or removed (`useSignOutWorkflow`: when sign-out is requested and in `finalizeCase`). After sign-out it is locked (the report version keeps it with its SHA-256). The saved figure is taken up with `takeUp`, so unsaved work on the page is kept.
- The **Map** button and the panel show only for a synoptic that has a map (PathScribe's map questions or a lab binding).
- Both PDF payloads (`printReport`, `buildReportRenderPayload`) carry `reportFigures`; the PDF renderer draws them after the body (`functions/main.py`).
- The CoPilot payload passes the case's parts to `resolveAnswers`, so a results grid prints as text.
- `hooks/useOrganMap.ts` orchestrates; `components/RightSynopticPanel.tsx` renders the results grid question.

## Batch 462

The map companion shows the breast map for the three breast synoptics (with the case's parts passed so a lab's parts-row foci grid is labelled A, B…). The report image is drawn with the specimen side.

## Batch 463

Preview and print carry the maps that are always in the report (Mohs) drawn from the answers at that moment, in the report's language (`reportFiguresWithAuto`, `reportTranslateFor`). See `components/` and `hooks/` for the Mohs question and the panel.

## Batch 463b

Mohs blocks: incomplete questions are listed and sign-out stops until every positive sector has a block within Blocks cut, on both the Assist and Orchestration sign-out paths (see `hooks/`, `components/`).

## Batch 465b

- `components/RightSynopticPanel.tsx`:
  - A grid row whose count exceeds its limit is flagged under the grid.
  - A total calculated from its grid is kept in step by an effect, whatever changed the answers, and is read-only once the grid has counts.
  - A hint says how the total is set.
- `hooks/useOrchestratorDraft.ts`: the draft save stops on a blocking count, and asks before saving totals that differ from their grid.
- `hooks/useSignOutWorkflow.ts`: the same checks at the three sign-out gates.
- `hooks/useWarningConfirm.tsx` (new): the warning dialog. A warning the person has already gone past isn't asked again on the page.

## Batch 466

`components/RightSynopticPanel.tsx`: a node count that isn't a whole number of 0 or more is flagged, both in a grid cell and on a numeric question. Inputs take steps of 1 from 0.

## Batch 466b

`components/RightSynopticPanel.tsx`:
- Loads the template's map binding and calculates the generic margin questions from the map, locking them with a hint.
- Shows when a count exceeds the question it can't exceed.

## Batch 466d

Sign-out warns when invasive carcinoma is on the map with margins unreported (`hooks/useSignOutWorkflow.ts`).

## Batch 467 — In-house molecular orders

The synoptic shows where a molecular result came from, and a delta tag when the answer differs (`components/RightSynopticPanel.tsx`).

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

Sign-out warns about answers that still differ from their molecular result (`hooks/`).

## Batch 468 — Autopsy: consent-scope warning, organ-retention block, chain-of-custody

Three new pieces in the Autopsy section of this page, all presentational — the decisions live in `services/autopsy/`:
- A warning banner when an organ the hospital consent on file excludes is present among the case's specimens (`resolveExcludedOrgansPresent`).
- `handleOrganRetentionTierChange` now refuses (with a toast) a retention tier beyond "none" when consent doesn't permit retention or has been revoked (`resolveRetentionTierConsentCheck`).
- For forensic cases: a read-only chain-of-custody log and a "Record Custody Transfer" form (`recordAutopsyCustodyTransfer`).

Not covered by a direct component test, consistent with this page's existing strategy — the page itself has no render test; its logic is tested where it's extracted to pure functions/hooks, which is where these three are.

**Review fix:** the custody-log entry's timestamp is now `formatDateTime(entry.occurredAt, i18n.language)` (was a raw, unlocalized ISO string); `handleCustodyTransferSubmit`'s failure toast now maps `recordAutopsyCustodyTransfer`'s `reasonCode` to a translated `synopticReportPage.autopsy.custody.errors.*` key instead of showing the service's literal-English `error` string.

## Batch 469 — Autopsy: toxicology, organ-retention disposal, consent narrowing/revocation (PS-261 follow-up)

Three more presentational pieces in the Autopsy section, decisions kept in `services/autopsy/`:
- A read-only toxicology order/result log, an order-form toggle, and a per-open-order result-form toggle (`handleToxicologyOrderSubmit` / `handleToxicologyResultSubmit`), shown for any autopsy case.
- An organ-retention disposal panel inserted right after the `organRetentionTier` select — a read-only summary once recorded, a form toggle until then (`handleOrganRetentionDisposalSubmit`) — gated on `resolveHtaApplicability()` and a tier set beyond "no retention."
- A consent narrowing/revocation panel inserted after the custody-transfer block, for hospital-consented cases with a `hospitalConsent` record — a current-status summary plus a "Narrow or Revoke Consent" form (`handleConsentStatusChangeSubmit`). Opening the form seeds its draft (status, excluded organs, retention permitted, note) from the case's current consent record rather than a fixed default — fixed during this batch's independent review, which found the first cut always reset to the same default regardless of what was already on file.

Same strategy as Batch 468: no direct component test for the page itself; the narrow-only enforcement and the ancillary-hold matching logic are tested as pure functions in `services/autopsy/`.

## Batch 471 — Autopsy: toxicology cancellation, organ-retention detail, consent reinstatement (PS-261 follow-up)

Three more presentational pieces, decisions kept in `services/autopsy/`:
- A "Cancel Order" button and inline cancel-reason mini-form on each still-`'ordered'` entry in the toxicology log (`handleToxicologyCancelSubmit`), mutually exclusive with that same order's result-recording mini-form via state guards (`.ps-autopsy-custody-entry__actions` holds both buttons).
- A new organ-retention detail panel inserted between the `organRetentionTier` select and the existing disposal panel (`handleOrganRetentionDetailSubmit`) — recipient, location, and an optional reason, gated the same way the disposal panel is.
- A "Reinstate Consent" button and separate form on the consent panel, shown when `status !== 'active'` (`handleConsentReinstateSubmit`).

Same strategy as Batch 469: no direct component test for the page itself; the pure reinstatement merge and the orchestration's note-required/forensic-case refusals are tested as pure/service functions in `services/autopsy/`. One fix found during this batch's independent review: the retention-detail panel's optional reason was concatenated with a raw `` ` · ${reason}` `` template literal instead of a translated key — now `retentionDetail.reasonSuffix`.

## Batch 472 — Capability-greying, retention-tier reason, punctuation sweep (PS-261 follow-up)

Three small items, deliberately scoped smaller than the four genuinely-new Front End features raised in the same conversation (per-organ tagging, a dedicated worklist, toxicology specimen barcoding, a unified timeline) — those need Pete's own scoping, not a build, and weren't started here.

- All eight autopsy action buttons (toxicology order/result/cancel, retention detail, disposal, custody transfer, consent narrow/revoke, consent reinstate) converted from plain `<button>` to `CapabilityButton`, each with its own capability and `{ caseId }` context — the same component already used on `SearchPage.tsx`, `AuditLogPage.tsx`, and the Batch Management pages. Presentation only; the service-layer enforcement underneath each is unchanged.
- A plain text input beside the `organRetentionTier` select, saving `organRetentionTierReason` through the existing `handleOrganRetentionTierChange` handler on blur (only when the text actually changed). Disclosed, not fixed: that handler itself still has no capability check and still lives in this component rather than `services/autopsy/` — a pre-existing design, not something this batch introduced or was asked to refactor.
- Two pre-existing hard-coded-punctuation lines fixed: the custody log's "received by" (now baked into the `custody.receivedBy` key itself) and the consent panel's note line (now `consent.noteSuffix`).

## Batch 475 — Autopsy Module 3: toxicology specimen barcode & chain-of-custody link (PS-261 follow-up)

The toxicology order form gets a required specimen-barcode field, shown as a badge on each order line. The existing forensic-only custody-log section (`caseAuthority === 'statutory_judicial'`) gets an optional "link to a toxicology specimen" picker in its transfer form, seeding the item description and setting `toxicologyOrderId`; each toxicology order, in turn, shows its own linked custody entries inline via the new `custodyEventsForToxicologyOrder()` selector. No new form state pattern, no new capability — reuses the existing `custodyForm`/`toxOrderForm` state and `autopsy:custody:transfer`/`autopsy:toxicology:order`.

## Batch 474 — Gross-update reason capture: `window.prompt()` → `ReasonPromptModal` (PS-359)

`hooks/useGrossingCompletion.ts`'s re-finalize correction reason was a blocking `window.prompt()`, flagged as MVP-only in its own code comment since the feature was first built. Replaced with `ReasonPromptModal` (`components/Common/`), driven by a promise the hook awaits: `promptForUpdateReason()` opens the modal, and the hook's new `confirmUpdateReason`/`cancelUpdateReason` (rendered here, in this page) resolve it. Same behavior as before — blocks the update until given a non-empty reason, still logged with `gross_updated` — just no browser-native dialog. New locale key `useGrossingCompletion.prompt.title`.

## Batch 476 — Autopsy Module 4: unified case timeline (PS-261 follow-up)

A new "Case Timeline" section, right under the intake-status badge and above the organ-retention/custody/toxicology sections, shows every autopsy event already recorded on the case — forensic orders, consent given/status change, custody transfers, toxicology ordered/resulted/cancelled, organ retention detail/disposal, ancillary hold start/end, PAD/FAD signing, addenda — merged into one chronological list, newest first. Built from `services/autopsy/buildAutopsyCaseTimeline.ts` (a pure read-model off the existing case data, no new persisted record) and rendered by `components/AutopsyCaseTimeline.tsx`. Read-only; no new capability, no new write site. See [services/autopsy/README.md](../../services/autopsy/README.md) for the full reasoning and the one disclosed limitation (consent status history is last-change-only, not a full log, since the underlying record itself only ever keeps one).

## Batch 478 — Autopsy Module 6: gross-exam gate override, per-organ tagging (PS-261 follow-up)

The gate-blocked warning banner (above the Case Timeline) gains a second, capability-gated button, "Override & Sign {tier}", shown only to whoever holds the new `autopsy:gross-exam-gate:override` — before this batch the gate drove only this banner, never an actual block; `services/autopsy/signAutopsyReport.ts` now refuses the sign outright unless overridden. Clicking it opens `ReasonPromptModal` for a required written reason, then hands off to the existing signature-confirm flow (`confirmingAutopsyTier`) — the reason rides along unchanged to `handleSignAutopsyReport`/`signAutopsyReport.ts`. See [services/autopsy/README.md](../../services/autopsy/README.md) for the full reasoning, including the disclosed gap (the gate's own `blockedReasons` stay literal English; the new toasts are translated and generic instead).

New "Organ Tags" section (below the custody log; available for either `caseAuthority`, unlike that forensic-only section): a read-only, append-only list of per-organ findings plus a form (organ picker reusing `AUTOPSY_ORGAN_LABEL_KEY`, status select, optional finding text), gated behind the new `autopsy:organ-tag:record`. Same presentational-only shape as every other autopsy write-site form on this page — `recordAutopsyOrganTag.ts` decides everything.

The Case Timeline (Batch 476) shows both new event kinds (every organ tag, every gate override) alongside the existing ones.

## Batch 479 — fix: gate-blocked banner now shows translated text, not literal English (PS-261 follow-up)

The gate-blocked warning banner's summary line (`{{gate.blockedReasons.join(' ')}}`, Batch 478's own disclosed gap) now reads `formatList(gate.blockedReasons.map(r => t(\`autopsySignOut.blockedReasons.${r}\`)), i18n.language)` — the same locale-aware join `cytologySignOut`'s own block-reason display already uses, instead of raw English sentences. No behavior change beyond the fix: still the same banner, same override button, same reasons — just translated now. See [services/autopsy/README.md](../../services/autopsy/README.md)'s own Batch 479 entry.

---
*See [pages/README.md](../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
