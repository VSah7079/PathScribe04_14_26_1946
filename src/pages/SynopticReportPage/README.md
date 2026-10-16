# pages/SynopticReportPage/

The core clinical workflow page — a case's full report/material/sign-out experience, reached at `/case/:caseId/synoptic`.

## Files

- **`SynopticReportPage.tsx`** — the page: layout and modal wiring, with business logic meant to live in `hooks/` and services, presentational pieces in `components/`, and dialogs in `modals/`. In practice it is still a large file (about 6,750 lines) with a good deal of handler code of its own.
- **`resolveEmbeddedCoding.ts`** (+ test) — applies a synoptic template's embedded SNOMED/ICD codes when a pathologist approves an AI suggestion (see `../Synoptic/Codes/README.md`).
- **`reportPageText.guard.test.ts`** — fails on literal on-screen English text in this folder.

## Subfolders

- **`hooks/`** — fifteen hooks (LIS integration, specimen/block management, report generation, amendment workflow, grossing completion, orchestrator draft lifecycle, sign-out/finalize, microscopic entry, cassette scan verification, release-buffer countdown, peer review, organ map, case material store, effective specimen complexity, warning confirm) plus pure helpers. See its own `README.md` for the full architecture and `hooks/__tests__/README.md` for the testing approach.
- **`components/`** — presentational pieces specific to this page (header, sidebar, material tree, banners, panels).
- **`modals/`** — every modal reachable from this page (33 modal files plus two shared pieces, `CassetteColorControl.tsx` and `ForeignIdFields.tsx` — sign-out, holds, specimen/block editors, amendment, team, printing, gates, and more).

*Corrected in the Batch 496 README audit (Oct 9, 2026): the hook and modal counts were out of date (15 `use*` hooks in `hooks/`, 35 non-test `.tsx` files in `modals/`), the page file is far from "wiring only" at 6,756 lines, and two top-level files were missing.*

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

`hooks/useGrossingCompletion.ts`: Gross Complete / Update Gross apply the organisation's Grossing field requirements and `case:grossing:complete` (`services/grossing/reportGrossComplete.ts`); a Grossing template counts as the specimen's protocol. With the protocol rule off, `SynopticReportPage.tsx` shows a confirmation (the shared `ConfirmModal`) and the specimens are routed for secondary review. Still open: Update Gross asks its reason with `window.prompt`. *(Since closed: Update Gross now asks through `ReasonPromptModal` — `SynopticReportPage.tsx`, PS-359 quick fix — checked in the Batch 496 README audit.)*

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
- Two more sign-out checks after the stain QC gate, on both sign-out paths (`hooks/checkPeerReviewAndMismatch.ts`): a clinical-pathologic mismatch to decide (`modals/ClinicalMismatchModal.tsx`; moved to `components/ClinicalMismatch/` in Batch 523), then the peer-review gate where it is switched on (`modals/PeerReviewGateModal.tsx`). Both resume sign-out the way the stain QC gate does.

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
  - Reload their version (Batch 577: Use their version, in place).
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
- A plain text input beside the `organRetentionTier` select, saving `organRetentionTierReason` through the existing `handleOrganRetentionTierChange` handler on blur (only when the text actually changed). Disclosed, not fixed: that handler itself still has no capability check and still lives in this component rather than `services/autopsy/` — a pre-existing design, not something this batch introduced or was asked to refactor. *(Since closed: Batch 499 — `services/autopsy/recordAutopsyOrganRetentionTier.ts`, capability `autopsy:retention-tier:record`.)*
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

## Batch 483 — new "recorded signatures" chip (PS-359 tracker follow-up)

`services/signatures/` has recorded every signature applied to a case since Batch 345 with no screen ever reading it back. This page gains a `caseSignatures` fetch (same real-source pattern as `caseVersions`: on load and whenever the new modal opens) and wires `HeaderBar`'s new `signatureCount`/`onOpenSignatureHistory` props to a new `SignatureHistoryModal`. See `components/README.md` and `modals/README.md`'s own Batch 483 entries for the full account.

## Batch 484 — Gate B wired for real (PS-519 follow-up)

New `inkingGateBlocking` state (same resume shape as `clinicalMismatch`/`peerReviewGate`): checked via `hooks/checkInkingSignOutGate.ts` at both sign-out call sites in `useSignOutWorkflow.ts`, right after the existing stain-QC check. `null` for a clean or Severity-2-only case (advisory only at Gate B — nothing new to show); set only for a real interruption (BLOCK/OVERRIDE_REQUIRED/PALETTE_UNAVAILABLE), rendered by the new `modals/InkingGateModal.tsx`. A successful Administrative Override (Severity 3, override-eligible role only) resumes exactly as `resumeAfterGate()` already does for the mismatch/peer-review gates. See `hooks/README.md` and `modals/README.md`'s own Batch 484 entries.

## Batch 491 — margin-distance extraction + Tumor Board auto-flagging wired at sign-out (PS-359 follow-up)

`finalizeSignOut` (in `hooks/useSignOutWorkflow.ts`) now runs the margin-distance extraction layer and the Tumor Board auto-flagging rule evaluator, fire-and-forget, right after the existing post-sign-out QA call — closing Batch 490's own disclosed "nothing calls this yet" gap. See `hooks/README.md`'s own Batch 491 entry and `services/tumorBoardRules/README.md`.

## Batch 492 — real "Flag for Tumor Board / MDT" button; naming consistency (PS-359 follow-up; found-while-testing bug fix)

Real, found-while-testing bug: Pete assigned a case and added a flag through the voice/keyboard path, then couldn't find any clickable way to repeat it — `showFlagForMdtModal` was only ever set by the `'delegation.tumorBoard'` voice/keyboard action handler, and Batch 491's own deactivation of `DelegateModal.tsx`'s `'TUMOR_BOARD'` delegation type removed the last (awkward) menu path that used to reach it. `BottomActionBar.tsx` gains a new `onFlagForMdt?` prop and a `CapabilityButton` (capability `case:tumor-board:flag`, context `{ caseId }`) next to Flags/Codes, wired here via `onFlagForMdt={() => setShowFlagForMdtModal(true)}`; the pre-existing `'delegation.tumorBoard'` voice/keyboard case is unchanged — the button is a second way in, not a replacement. New CSS class `.ps-bab-action-btn--flag-mdt` (`#EC4899`). See `components/README.md`'s own Batch 492 entry for the full button detail.

Also, in the same change: display text now reads "Tumor Board / MDT" consistently (home tile title/description, `tumorBoard.pageTitle`) in en/de/nl/ko — fr's "RCP" stays alone, since that's the actual regional clinical term, not a shortening. See `src/i18n/README.md`'s own Batch 492 entry.

**Disclosed, not fixed (surfaced while answering Pete's own follow-up questions on the workspace, not a bug in this batch's scope):** assigning a presenter on `TumorBoardWorkspacePage.tsx` sends no notification to that presenter — there's no messaging/notification system to send one through yet, so this is a new-feature-level gap, not something to patch in here. The Presenter dropdown is, by design, limited to users with the Pathologist or Fellow role (`useTumorBoardWorkspace.ts`'s own filter) — confirmed deliberate, not a bug.

**Correction (Batch 493, CLAUDE.md rule 6):** the notification claim above was wrong — this app already had a real in-app messaging service (`services/messages/`) and a generic email transport (`services/communications/`), not checked carefully enough before writing that disclosure. Now wired up for real — see Batch 493's own entry below. The presenter-filter note was genuinely accurate as of this batch; Pete has since asked that Residents be included too, also done in Batch 493.

## Batch 500 (PS-473)

The HTML fallback print window escapes the accession in its `<title>` and in the CSS page header (`escapeHtml`, `cssString`); `modals/CopilotReportViewModal.tsx` escapes its print window's title. The page body is copied from the already-rendered (sanitised) report.

## Batch 504 (lint clean-up)

- **Sign-out (`hooks/useSignOutWorkflow.ts`, `handleSignOutConfirm`):** the callback didn't list the specimen dictionary or the PDF snapshot generator among its inputs, so it could keep stale copies of both. The finalize path did list them. Two consequences:
  - **Fixative-time check could be skipped.** If the dictionary finished loading after the callback was last rebuilt, the check ran against an empty dictionary and let a specimen through that should have been held.
  - **Stored PDF snapshot could use older text.** The snapshot could be built from report text as it stood when the callback was last rebuilt.

  Both are now listed.
- **Other screens in this folder:** many callbacks now list `savePagePatch`, `tGrossingNav` and `t`, so messages follow a language switch. `knownVersionRef` (a ref) comes out of dependency lists. Two that can't be listed are explained in the code: `savePagePatch` in `handleChangePriority`, and `handleReturnToTrainee` in the action-registry effect. Both are declared further down the page.
- **Printed age (`ReportPreviewRenderer`):** uses `utils/ageFromDateOfBirth.ts`. The old "viewer-relative" justification was wrong: the age went up a day early in the Americas.

---
*See [pages/README.md](../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 495 — print permission, revision header, autopsy release reasons translated

- **Print permission (PS-283 §4.2.4):** `printReport` (the orchestration print) calls `beginReportPrint()` first and shows `reportPrint.notPermitted` on a refusal; the orchestration Print button and the version-history modal are `report:case-report:print` `CapabilityButton`s. `VersionHistoryModal` now receives the case's `facilityId` for the check.
- **Revision status (PS-283 §4.2.2):** `useReportRevisionStatus(caseData)` feeds `ReportPreviewRenderer`'s new revision banner, and the orchestration PDF payload carries `revisionStatus` (sent so `render_report` can draw it; unverifiable from here, PS-333). The HTML fallback print window's own stylesheet gained the revision-banner and footer-reference rules, since that window doesn't load `pathscribe.css`.
- **Found, not fixed (disclosed):** that same HTML fallback stylesheet hard-codes English in its `@page` margin boxes ("CONFIDENTIAL — CLINICAL RECORD", "Page … of …"). It predates this batch; converting it means passing translated strings into a CSS `content:` value and was kept out of this batch's scope.

*Correction (Batch 496 README audit): the surgical/orchestration PDF renderer is not external — it is `render_report` in `functions/main.py` in this repo. It reads only the case header, institution, body parts, sections, synoptic answers, map figures and render scope; it ignores `amendments`, `revisionStatus`, `watermarkText`, `preAnalyticDisclaimerText`, `documentStyle` and the header/footer parts, so none of those appear on the generated PDF yet. That work is in this repo (PS-333), not blocked.*

## Batch 498 — what the PDF now shows

Both PDF request builders (the sign-out snapshot, `buildReportRenderPayload`, and the orchestration print, `printReport`) send `revision` (dates in the report locale) and `documentVersion`, which `render_report` now draws with the watermark and disclaimer it already received. **Also fixed:** the orchestration print sent no `language` or `labels`, so its PDF was always worded in English and its date of birth always in en-GB; it now uses the lab's language like the sign-out snapshot. The two builders are still separate code paths — a candidate for merging.

## Batch 499

- **Organ retention tier:** `handleOrganRetentionTierChange` now calls `services/autopsy/recordAutopsyOrganRetentionTier.ts` (capability `autopsy:retention-tier:record`, consent and jurisdiction rules, audit) instead of writing the case itself. The tier select and its reason field are greyed without the capability; the select's label is now tied to it (`htmlFor`).

## Batch 502 (PS-472)

The organ map panel and the synoptic panel each sit in their own error boundary (`panel:organ-map`, `panel:synoptic`): a crash in one shows a small notice with Try again, and the rest of the report page keeps working. The synoptic answers live in the page's own state, so trying again reloads the panel with them.

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 511 (PS-478): full strict type-checking

- **Bug fixed:** picking a report in the Sequencer set the active report type to `undefined` (the Sequencer doesn't pass one), which hid the organ-map panel. It now defaults to `synoptic`, the only kind the Sequencer lists.
- **Bug fixed:** "Open Grossing Screen" before the case had loaded threw an error. It now does nothing until the case is loaded.
- **Bug fixed, `hooks/checkStainQcGate.ts`:** for a case without a full accession, the stain-QC sign-out gate looked for slide ids starting `undefined-…`. The batch queue builds them from the case id, so a failed staining batch never blocked sign-out. Both now use the case id when there is no full accession.
- **Bug fixed, labels (`hooks/useSpecimenBlockManagement.ts` 4 print paths, `modals/ManageReprintsModal.tsx`):** for a case without a full accession, cassette and slide labels printed `undefined-A1` and couldn't be scanned back. They now use the case id, as the scan resolver does.
- **Critical-result notification:** the sign-out hook accepts every method the modal offers (secure email and fax included); it was typed for three.
- The amendment, grossing and sign-out hooks take the page's typed audit logger (`AuditLogFn`), which found four audit events missing from the catalogue (see `components/Audit/README.md`).
- Typing only: `ReleaseBufferBanner`, `BlockStainEditorModal` (decant rows typed as `Decant`), `CaseHoldModal`, `RetentionHoldModal`, `SpecimenEditModal`, `MaterialTreePanel`.

## Batch 512

**Bug fixed: editing an ordinary LIS specimen never flagged it "Pending sync".** `modals/SpecimenEditModal.tsx` now takes the state from `services/specimens/resolveSpecimenLisSyncState.ts`. `components/Sidebar.tsx` shows the badge through `lisSyncStateNeedsBadge()`. The field is renamed `lisStatus` → `lisSyncState` (see `types/case/README.md`).

## Batch 515 (PS-124)

`hooks/useSignOutWorkflow.ts` no longer writes to the retired legacy FPPE service.

## Batch 516 (PS-283, PS-72)

- **Watermark:** printing before sign-out carries "PRELIMINARY — SUBJECT TO CHANGE" in the report's language.
- **Restricted cases:** a restricted (VIP/confidential) case says so when printing is refused.
- **CoPilot report view:** dates are in the user's format.
- **Material tree:** the block and decant tooltips are tagged as PHI.

## Batch 517

The report page passes the case's accession to `CriticalFindingsModal`, for the secure email's subject (PS-143).

## Batch 519 (PS-494)

Free-text lymph node counts (seven templates) are checked at draft save and sign-out: not a count, above examined, or (Breast) total below A + B + C (`services/templates/nodeCountText.ts`).

## Batch 523 (PS-145, decision 15)

- **Autopsy:** before the FAD is signed (the button, or after a gate override), the clinical-pathologic mismatch check runs against the report sections as on screen (`checkAutopsyClinicalMismatch`). A suggestion is decided in the mismatch window, then the signature step follows. PAD signing isn't checked.
- `ClinicalMismatchModal` moved to `components/ClinicalMismatch/`.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

The required-fields banner row has no button role (it holds the details button); the details chevron is a named button that says whether it is open.

## Batch 530 (PS-554)

The report page shows the inline mismatch alert (`components/ClinicalMismatch/ClinicalMismatchAlert.tsx`, `hooks/useClinicalMismatchAlert.ts`) above the peer-review banner, for surgical reports and autopsy reports awaiting the FAD. The sign-out and FAD windows open for high-risk mismatches only.

`CaseClinicalHistoryBar` above the mismatch alert: the clinical history line, the deferred notice, and adding the history later.

## Batch 533

`modals/SignatureHistoryModal.tsx`: the new signing action and link, "Cytology preliminary report".

## Batch 534

- Under the release-buffer banner, `HeldReportsBanner` lists the case's reports held for the release delay (preliminary, corrections, addenda, autopsy), with Recall for the person who released them.
- `hooks/useAmendmentWorkflow.ts`:
  - corrections and addenda go through the delay (`releaseThroughDelay`);
  - a correction released during the case's sign-out buffer leaves it 'pending-release' (`caseStatusAfterCorrection`; before, it set 'finalized' and left the buffer fields behind).
- `hooks/useSignOutWorkflow.ts` hands a buffered sign-out to the background release (`trackSignOutBuffer`).
- The preliminary release says when a held preliminary goes.

## Batch 535

- `hooks/useSignOutWorkflow.ts` (bug fix): a correction released at an Orchestration re-sign-out is now sent (`services/reports/publishReleasedRevision.ts`). The instance and the case are labelled Final (Corrected / Amended), and the instance is no longer flagged unlocked for amendment.
- `hooks/useAmendmentWorkflow.ts`: the held correction or addendum records what Recall reopens (the record, its instance, the status and label before).
- Recall on the held-reports line now works for corrections, addenda and autopsy PAD/FAD.

## Batch 536

`hooks/useSignOutWorkflow.ts`: the critical-findings AI call carries the case for the AI vendor policy.

## Batch 538 (Pete: the preview must match what is sent)

- `SynopticReportPage.tsx`: print and preview use the same payload builder as the released PDF (`buildReportRenderPayload(outputFormat, purpose)`). Only the watermark depends on the purpose. Before, print built its own payload.
- Version History gets the case id and shows the documents sent.

## Batch 539

The renderer's address comes from `services/reports/reportRenderer.ts` (shared with Assist and cytology).

## Batch 540

`hooks/useAmendmentWorkflow.ts`: when starting a correction or addendum is refused because the report is still in its release delay, the window closes with a message (`useAmendmentWorkflow.toast.inReleaseDelay`). `SynopticReportPage.tsx` checks the same before adding an addendum workup to a finalized case. The release snapshot's watermark comment is updated (no release-buffer mark on a released PDF).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `components/` and `modals/`: loading text through `LoadingState`.

## Batch 550 (PS-539 phase 2d: exports through the server)

- The change history export goes through the export service (`report.change-history`, `{ caseId }`).

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: the release countdown on `components/ReleaseBufferBanner.tsx` no longer releases a report the server releases.

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: `modals/VersionHistoryModal.tsx`: sent documents through the API server.

## Batch 558 (PS-539 phase 2d: report versions through the API)

- Batch 558: `modals/VersionHistoryModal.tsx`: versions' PDFs through the reader; `SynopticReportPage.tsx` passes whether the server's list of versions was read.

## Batch 567 (WCAG 2.1 AA)

- Batch 567: `components/BillingReviewPanel.tsx`, `components/SequencerPanel.tsx`, `modals/ProtocolChangeModal.tsx`: no control inside another.

## Batch 569 (WCAG 2.1 AA)

- Batch 569: `components/Sidebar.tsx` (the rail's review dot beside, not inside, the specimen button).

## Batch 572 (PS-539)

- "Someone else saved this case": `components/CaseUpdatedBanner.tsx` above the tabs, from `hooks/useCaseUpdateNotice.ts`. The first-open write and the abnormal-detection confirmation (`hooks/useSignOutWorkflow.ts`) now move the known version on, so they don't show the notice or cause a refused save.

## Batch 573 (PS-539)

- Who else has the case open: `components/CasePresenceStrip.tsx` above the tabs (in the tab bar's row from Batch 577), from `hooks/useCasePresence.ts`; "editing" follows `services/cases/caseEditingSignal.ts`, which the unsaved-changes warning now uses too.

## Batch 575

- "Show their changes" on the case-updated notice takes the newer case up in place (`services/cases/caseWrite.ts` `takeUpNewerCase`), keeping unsaved report text and held changes; an overlap leaves a lasting note.

## Batch 576

- `markDirty` notes the person's own edits (not the set-up prefill or a restored draft), for presence and the unsaved-changes warning.

## Batch 577

- `components/EditConflictDialog.tsx`: "Use their version" (was "Reload their version") takes the saved case up in place; every choice is disabled while it is read.
- `SynopticReportPage.tsx`: `takenUpKey` is bumped whenever the page takes up someone else's version; deficiencies, versions, signatures, the change log, the follow-up mark, the resolved context, `hooks/useLisIntegration.ts` (`refreshKey`), `components/AmendmentStatusBanner.tsx` (`refreshKey`) and `components/RightSynopticPanel.tsx` (`reloadKey`, its answers) read again. What their save removed is replaced as at case open (`selectionAfterTakeUp`).
- `components/CasePresenceStrip.tsx` sits in the tab bar's row (`.ps-syn-tabbar-end`, pinned right with the tools), no longer above the tabs' content.

## Batch 579

- `SynopticReportPage.tsx` `saveSpecimensNow`: a specimen's billing codes and the Sequencer's specimen order are saved at once, one at a time; billing codes all or nothing (no charge or credit unless the code saved). `components/RightSynopticPanel.tsx`: a re-read keeps the open section.
