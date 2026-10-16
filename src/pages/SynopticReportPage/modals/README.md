# pages/SynopticReportPage/modals/

Every modal reachable from the case report page — 35 files (33 modals plus `CassetteColorControl.tsx` and `ForeignIdFields.tsx`), roughly grouped below by what they're for. All but `FinalizeSynopticModal.tsx` (and the `ForeignIdFields.tsx` helper) import `../../../pathscribe.css` directly rather than relying on a shared shell, per this codebase's established modal convention.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the folder has 35 non-test files, not 23, and two of them don't import `pathscribe.css` themselves.*

## Case-level workflow

- **`CaseSignOutModal.tsx`** — the real sign-out modal (stain types, real-time coding summary via `computeCaseCodingSummary`). **Real, per direct guidance ("Yes we should scope 'Return to Trainee'/'Reject with Notes'"): a new `onReject` prop, rendered as "↩️ Return to Trainee"** alongside the existing "✍️ Sign Out Case" button, only when `isCountersign` is true — disabled until real feedback text is entered, since a rejection with no explanation gives the resident nothing to act on. Wired to `useSignOutWorkflow.ts`'s new `handleReturnToTrainee()` — see `hooks/README.md`'s own entry, and `services/cases/README.md`'s fuller account, for the real logic this button triggers.
- **`PreFinalisationModal.tsx`** — the pre-finalize review screen: drag-to-reorder specimens/synoptics, per-field completeness warnings, biometric/password signing panel. (The old drag-to-*exclude* mechanism — which fed the now-removed "Deferred" synoptic status — was removed; every synoptic report's required fields must be complete before finalize, no bypass.)
- **`FinalizeSynopticModal.tsx`** — lighter-weight finalize confirmation for a single synoptic.
- **`AiReviewModal.tsx`** — AI triage/spell-checker flow (Space/→ confirm, O override, S skip, Esc cancel).
- **`UnsavedWarningModal.tsx`** — shown navigating away from a case with unsaved changes.
- **`FixativeTimeGateModal.tsx`** — blocks sign-out when a specimen requiring fixation-time tracking (CAP/ASCO biomarker guidance, cold-ischemia timing) is missing it.
- **`ProtocolChangeModal.tsx`** — shown when AI re-evaluates synoptic protocol assignment after microscopic description is submitted; diff view with per-change checkboxes.

## Holds

- **`RetentionHoldModal.tsx`** — place/release a case-level hold gating **disposal** after finalization (litigation, patient request, research).
- **`CaseHoldModal.tsx`** — place/release a case-level hold gating **finalize** on an active case ("something truly wrong" — quality issue, awaiting outside materials, clinical discrepancy, pending consultation). Deliberately separate from `RetentionHoldModal` — see `types/case/CaseHold.ts`'s own header for the full distinction.

## Specimens, blocks & material

- **`SpecimenEditModal.tsx`** — add/edit a specimen.
- **`AddOrdersModal.tsx`** — replaces the old, single-purpose "+ Add Specimen" button with a richer flow.
- **`BlockStainEditorModal.tsx`** — the "Blocks & Stains" modal: block/decant status, stain ordering, foreign ID fields, cassette color control, secondary-label printing.
- **`MatrixBlockEditorModal.tsx`** — tab-gated editor for shared/matrix blocks (`types/case/MatrixBlock.ts`): "Details" (status, piece tracking) and, per direct billing-expert guidance (PS-93), "Biopsy Array / Matrix Mapping" — the real Array Mapper for targeting a new ancillary stain order at specific cores.
- **`CreateBiopsyArrayModal.tsx`** — real feature for assigning multiple specimens into one shared cassette (biopsy array).
- **`ForeignIdFields.tsx`** — small, local-state component for foreign-ID inputs; fixes a real rapid-keystroke data-corruption bug in the old inline foreign-ID JSX.
- **`CassetteColorControl.tsx`** — the cassette color picker/display used inside `BlockStainEditorModal`.
- **`MaterialTrackingHistoryModal.tsx`** — real, nested Specimen → Block → Slide scan-log/location history viewer.

## Amendment, versioning & review

- **`AmendmentModal.tsx`** — real amendment/addendum/correction modal (replaced an earlier, fully decorative version whose submit handler never persisted anything).
- **`VersionHistoryModal.tsx`** — real report version history (`ReportVersionRecord`), including the patient/encounter snapshot at each version.
- **`DeficiencyHistoryModal.tsx`** — read-only view of a case's specimen deficiency history.
- **`DiscordanceReconciliationModal.tsx`** — Frozen-to-Permanent reconciliation entry. **Real, current status (PS-113, Stage 5):** writes exclusively to `qaActivityRecordService`/`QaActivityRecord.ts` (`services/quality/`) now — the old `reconciliationService`/`ReconciliationRecord.ts` this modal originally wrote to, and briefly dual-wrote to during the Stage 3/4 migration, is retired and deleted (first release, no real production history to preserve). Real, disclosed gap: this modal has no test of its own — no established pattern for testing a modal exists anywhere in this codebase yet, so one wasn't invented unprompted as a side effect of this migration. Its correctness is verified indirectly, through the already-tested service it calls.

## Team, printing & CoPilot

- **`CaseTeamModal.tsx`** — drag-and-drop staff assignment onto participation-type lanes. **Jurisdiction-aware (Sep 2026, per Pete's own per-country role data):** on open, resolves the case's performing lab and its `jurisdiction` via the shared `services/facilities/resolveCasePerformingLabScope.ts`, then (1) only offers lanes for types valid in that jurisdiction (`isParticipationTypeOfferedIn()` — a UK-scoped Advanced Practitioner BMS never appears on a Canadian case), (2) shows each type's real local title (`resolveParticipationTypeLabel()` — "Specialist Pathologist (FRCPA)" on an Australian case), and (3) shows the **effective** Countersign/Finalise badges via `resolveParticipationTypeAuthority()` — the same lab → country → platform-default resolution the sign-out gate enforces. Real fix in (3): the badges previously showed the raw platform-default flags, which could promise a different rule than the gate actually applied. A type an existing active participant already holds always stays visible even when out of scope, so a real assignment is never silently hidden — only never newly offered. All of that selection/resolution lives in `resolveCaseTeamParticipationTypes()` (`services/participationTypes/IParticipationTypeService.ts`) — the modal only calls it (no business logic in components; guarded by `standingRules.guard.test.ts`). See `services/participationTypes/README.md`.
- **`ManageReprintsModal.tsx`** — cascading, checkbox-driven 4-column reprint manager.
- **`CopilotReportViewModal.tsx`** — CoPilot mode's own "print" — the completed synoptic data sent back to the LIS, since CoPilot has no separate narrative document.

## Batch 338 (PS-342): spell checking

The free-text boxes in `AmendmentModal`, `CaseSignOutModal` (countersign feedback), `CaseHoldModal`, `RetentionHoldModal`, `DiscordanceReconciliationModal` and `AiNarrativeReviewModal` use `SpellCheckedTextarea`, so they're checked in the case's spelling language. `AiReviewModal`'s "Skip" hint now uses `common.skip`, since the key it borrowed belonged to the retired AI spelling check.

## Signer confirmation (Batch 344, PS-60 follow-up)

`CaseSignOutModal`, `FinalizeSynopticModal` and `PreFinalisationModal`'s signing panel asked for a username and password and never checked them (the pre-finalisation panel accepted any three characters). Each now uses `useSignerConfirmation` + `SignerConfirmationFields` (`components/Signing/`), and calls its sign callback only with a confirmation in hand:
- **Demo password session:** the password, plus the username on the first signature of a sign-in session.
- **SSO session:** the identity provider's sign-in popup.
- **Biometric button:** demo builds only, because the WebAuthn check is still simulated.
- **Pre-finalisation panel:** names the signed-in user instead of the case's assigned pathologist, and no longer signs automatically when the biometric "cadence" says a recent verification is still good. A signature always takes a click.
- **Props removed:** `CaseSignOutModal` lost `signOutUser` / `signOutPassword` / `signOutError` and their change handlers; `FinalizeSynopticModal` lost `finalizePassword` / `finalizeError`; `PreFinalisationModal` lost `userId` / `userDisplayName` / `userCredentials`.
- **Confirmation passed on:** `onConfirm` receives the `SignatureConfirmation`.
- **Checked by:** `services/auth/signingScreens.guard.test.ts`.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`MaterialTrackingHistoryModal.tsx` (the header accession) and `PreFinalisationModal.tsx` (the accession and patient name line) are tagged.

## Batch 367 (PS-74): no inline CSS

`AiReviewModal.tsx`, `CaseTeamModal.tsx`, `CassetteColorControl.tsx`, `MatrixBlockEditorModal.tsx`, `ProtocolChangeModal.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368 (PS-353)

- **`ChangeHistoryModal.tsx`** (new) shows the report's change history:
  - entries newest first;
  - an area filter;
  - old → new, or a word-level diff for long text;
  - every value tagged `data-phi`;
  - Export CSV for anyone holding `report:change-history:export` (Batch 369, PS-355). The button is greyed out, with the reason in its tooltip, for anyone else.
- **`VersionHistoryModal.tsx`:** the patient/encounter snapshot values (name, MRN, date of birth) are now tagged `data-phi`. They weren't. The PHI check missed them because the values come through a generic label/value list; noted in `services/phi/`.
- **`CaseTeamModal.tsx`** takes `participationTypeService` from `@/services`.

## Batch 369 (PS-355)

`ChangeHistoryModal` no longer takes a `role` prop. Its Export button is a `CapabilityButton` (`report:change-history:export`), shown greyed out with the reason for anyone without it.

## Batch 370 (PS-356)

`ChangeHistoryModal` takes `exportContext` (the case and its facility) so the Export button reflects the user's facility assignment.

## Batch 380 (PS-359): Field Requirements, group 1

- **`SpecimenEditModal`:**
  - Save checks the organisation's "Add or edit specimen" requirements and marks required labels.
  - Voice: "save specimen".
  - **Fixed:** the laterality chosen here was never saved. It now goes to `collection.laterality`, and the modal shows it when reopened.
- **`AmendmentModal`:**
  - Save/Release checks the "Amendments and addenda" requirements.
  - When an organisation requires clinician notification for minor amendments or addenda, the notification section shows for them too, with its own note and a matching description.
  - Voice: "save amendment", "save correction", "release addendum".
  - Converted on touch: dates use the user's locale (they were fixed to `en-US`); the banner, the version line, the reason placeholder and the unknown-user fallback are translated instead of joined with English punctuation.
  - The reason dictionary comes through `@/services`, so the modal came off the mock-import baseline.
- **`CriticalFindingsModal`:**
  - Record checks the "Critical findings" requirements; read-back can be made required.
  - Voice: "record notification".
  - The quoted finding uses each language's quotation marks.
  - New `CriticalFindingsModal.test.tsx` (3).

## Batch 381 (PS-359): Field Requirements, group 2

- **`CaseHoldModal`, `RetentionHoldModal`:**
  - Place/Release go through `services/cases/caseHolds.ts` (note, capability, fresh hold list, audit).
  - The buttons are `CapabilityButton`s, and a refusal is shown.
  - Voice: "place hold", "release hold".
  - Dates use the user's locale.
- **`CreateBiopsyArrayModal`:** Save checks `biopsyArrayMissing`. Voice: "save biopsy array".
- **`BlockStainEditorModal`:**
  - The cancel-block and restain forms check `blockCancelMissing` / `restainMissing`.
  - Converted on touch: their dates (fixed to `en-US`) and the comment author/date lines use the user's locale, and the author line is a translated template.
  - Molecular targets and cassette colours come through `@/services`, so it came off the mock-import baseline.

## Batch 382 (PS-359): Field Requirements, group 3 (part 1)

- **`DiscordanceReconciliationModal`:**
  - What each step needs comes from `discordanceMissing`; the modal shows "Still required: …" and marks required labels. The button follows the stage: concordant, discordant, or (no category yet) a disabled Record.
  - The record is built by `services/quality/discordanceRecord.ts`, not in the component. Voice: "record discordance".
  - Off the mock-import baseline.
- **`components/Billing/PostSignoutBillingChangeModal`:** Confirm checks `billingChangeMissing`. Voice: "confirm billing change". Off the mock-import baseline.
- **`components/Billing/CorrectAppliedCodeModal`:** Correct checks `correctedCodeCheck` (a code that differs from the original) and needs `billing:applied-code:correct` (`CapabilityButton`). Voice: "correct billing code". Off the mock-import baseline.
- New tests: `DiscordanceReconciliationModal.test.tsx` (3), `PostSignoutBillingChangeModal.test.tsx` (2), `CorrectAppliedCodeModal.test.tsx` (3).

## Batch 383 (PS-359): Field Requirements, group 3 (part 2)

- **`FixativeTimeGateModal`:**
  - A specimen is resolved by a time (documented or estimated) or by confirming that none is possible; `fixativeGateMissing` decides and the modal shows "Still required: …". `buildFixativeResolutions` builds what sign-out saves. Both are in `services/signoutGates/fixativeGate.ts`, no longer in the component.
  - The "no time possible" path now has a reason field. The resolution already had a place for it, but the modal never offered one (the old code read a comment nothing could set). An organisation can require it.
  - Voice: "continue fixation gate".
- **`PreAnalyticDateGateModal`:**
  - Only the dates a specimen is missing are asked for; each takes the date/time or the jurisdiction's administrative override, and an override needs its justification. `preAnalyticGateMissing` and `buildPreAnalyticResolutions` (`services/signoutGates/preAnalyticGate.ts`) decide. Voice: "continue date gate".
- Both modals still export their specimen and resolution types, now re-exported from the services, so `useSignOutWorkflow` is unchanged.
- **Autopsy forms** (`components/Autopsy/`) are mounted from this page; see that folder's README.
- New tests: `FixativeTimeGateModal.test.tsx` (3), `PreAnalyticDateGateModal.test.tsx` (3).

## Batch 397 (PS-359)

- `AddOrdersModal.tsx`: Add Block needs the specimen and cassette label (Field Requirements, locked); shows "Still required: …", marks both labels, and "confirm block order" does what the button does. The appended sentence comes from `reportPageChecks.addOrdersBlockSentence`; its "Will append" preview is one translated template.
- `MatrixBlockEditorModal.tsx` and `BlockStainEditorModal.tsx`: the piece count and piece description are marked required when the organisation's Grossing rules require them, with a note when missing (`components/Grossing/GrossingFieldNote`). They save as you type; Complete grossing checks them.
- Still open: Add Orders' tab order (by case status) is decided in the component.

## Batch 427

`WorkupPartsModal`: Independent or Combined, with the parts to combine. It reports why a choice isn't allowed (a released workup, or a part already covered by this protocol). The rules are in `services/reports/workupParts.ts`.

## Batch 437

- `ReportPrintPromptModal.tsx` (new): before a report prints, when there is something to say first. It asks for a reprint reason when the lab requires one, and warns about the Pending Release watermark.
- `CopilotReportViewModal.tsx`, `VersionHistoryModal.tsx`, `MaterialTrackingHistoryModal.tsx`: prints audited.
- `MatrixBlockEditorModal.tsx`, `BlockStainEditorModal.tsx`: secondary label prints audited.

## Batch 439

- `PeerReviewGateModal.tsx` (PS-144): sign-out stopped by the peer-review gate. Ask for the review, or sign out now for urgent care with a reason (`case:peer-review:override`; the review is owed within 24 hours).
- `ClinicalMismatchModal.tsx` (PS-145): the suggestion with its confidence and source; the pathologist decides.
- Tests: `peerReviewAndMismatch.test.tsx` (also covers the banner).

## Batch 445

- `UnsavedWarningModal.tsx` shows section ids through `unsavedWarningModal.sections.<id>`. Its old note said the entries were already-translated text; they were English labels.
- `VersionHistoryModal.tsx` shows the snapshot's date of birth with `formatDate` in the user's language.

## Batch 450 — test evidence for Priority 1 and 2 tickets

See `../README.md` (Batch 450): logic moved to services and new tests for PS-57, PS-141, PS-274, PS-275, PS-317, PS-318, PS-324.

## Batch 451 — screen-level test evidence for Priority 2 tickets

`ChangeHistoryModal` uses `changeHistoryView` (PS-353); `printOutputAudit.test.tsx` (PS-282).

## Batch 454 — Follow-up not received: report, alerts and clinician email

`CaseSignOutModal.tsx`: a "A follow-up specimen (resection or excision) is expected" box. It shows only when the page passes `onFollowUpExpectedChange`. Test: `CaseSignOutModal.followUp.test.tsx`.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

`CaseTeamModal`: the team save is versioned; the modal says so if the team changed elsewhere (`caseTeamModal.rejection.teamChangedElsewhere`).

## Batch 460

`ManageReprintsModal.tsx` and `MaterialTrackingHistoryModal.tsx` use each slide's printed level. Before, a reprint after Microtomy reordered the slides printed another slide's barcode.

## Batch 483 — new: SignatureHistoryModal.tsx (PS-359 tracker follow-up)

`services/signatures/` has recorded every signature applied to a case since Batch 345 (who, what action, when, how confirmed) with no screen ever reading it back — its own README said so plainly. New **`SignatureHistoryModal.tsx`**: read-only, same shell and fetch pattern as `VersionHistoryModal.tsx` (a new "recorded signatures" chip in `HeaderBar.tsx`, re-fetched on load and whenever the modal opens). Shows each record's action, outcome, signer, confirmation method, SSO issuer (when used, never the ID token itself), and whether verification was done in-browser or by the server. Signer/attending names are staff names, not patient PHI (CLAUDE.md), so nothing here is tagged `data-phi`.

## Batch 484 — new: InkingGateModal.tsx (Gate B, PS-519 follow-up)

New **`InkingGateModal.tsx`**, mirroring `StainQcGateModal.tsx`'s own real, established shape (a hard block with real resolution paths, not a dismissible warning). Shown only when `hooks/checkInkingSignOutGate.ts` returns a real interruption:

- **BLOCK** / **PALETTE_UNAVAILABLE**: the jurisdiction-specific regulatory blocking message (`signOutInkingGate.blockingMessage.<profile>`, `services/grossing/jurisdictionInkingGateMessages.ts`) plus the unresolved Severity 3 issue(s) — cancel only, no bypass.
- **OVERRIDE_REQUIRED**: the same message, plus a reason dropdown (`FOREIGN_OBJECT_PRE_INKED`/`EMERGENCY_INTRAOP_CONSULTATION`/`SPECIMEN_CONSUMED_UNAVAILABLE`/`OTHER`, with optional free text for `OTHER`) and a "Record Administrative Override" button, which calls `services/grossing/recordInkingGateOverride.ts` directly (real `authorizationService.enforce('case:inking-gate:override')` + audit, same as every other real action this modal layer calls straight from a button handler).

---
*See [pages/README.md](../../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 495 — print permission and revision header (PS-283)

- `CopilotReportViewModal.tsx`: Print calls `beginReportPrint()` before planning the print (refused: nothing prints, nothing is recorded); the button is a `report:case-report:print` `CapabilityButton`. The printed header now carries a revision line (amended/addendum/corrected, original sign-out date vs latest revision date) from `useReportRevisionStatus`, styled both on screen (`.ps-copilot-report-revision`) and in the print window's own stylesheet.
- `VersionHistoryModal.tsx`: opening a stored version's PDF is checked the same way (new optional `facilityId` prop); a refusal shows `reportPrint.notPermitted` and opens nothing.
- `printOutputAudit.test.tsx`: grants the permission for its audit-entry tests, waits for the now-async prints, and adds two refusal tests (preview window, version history).

## Batch 497

`printOutputAudit.test.tsx`: the preview-window tests are removed with the window; a refusal test for the CoPilot report view's Print replaces the preview one, so each remaining print path keeps its refusal check.

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 512

`SpecimenEditModal`: the LIS sync state on save comes from `services/specimens/resolveSpecimenLisSyncState.ts`. That fixes ordinary LIS specimens never being flagged "Pending sync" after an edit.

## Batch 517 — critical findings by secure email (PS-143)

`CriticalFindingsModal`:
- **Opening the email.** Choosing "Secure email" and pressing "Write the secure email…" opens the shared secure message window. The window is pre-filled with the case and the findings (`services/clinical/criticalFindingEmail.ts`) and marked as carrying patient data, so only a gateway with its BAA or data processing agreement in force can send it.
- **Recording.** The notification is recorded once the email is sent. Closing the window without sending records nothing.
- **Read-back.** It is hidden for email, with a note explaining why.
- **New props:** `caseReference` and `senderEmail`.

Tests: 2 new cases in `CriticalFindingsModal.test.tsx`.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 538

`VersionHistoryModal.tsx`: a **Released documents** section lists the case's released report documents (type, release time, how made, SHA-256). **View as sent** opens the stored bytes, after the print permission check, and is audited as `report-document`. A document that fails its hash check is not shown.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 556 (PS-539 phase 2d: report documents through the API)

- `VersionHistoryModal.tsx` (Batch 556): "View as sent" reads with `purpose 'view'`, says when the document can't be fetched or isn't permitted, and notes when the server's list of sent documents couldn't be read. Test: `VersionHistoryModal.test.tsx` (new).

## Batch 558 (PS-539 phase 2d: report versions through the API)

- `VersionHistoryModal.tsx` (Batch 558): "View PDF" shows for any version with a PDF (one kept here, or one the server lists by its hash) and opens it through `reportVersionPdfReader` with purpose `view`; says why a PDF can't be opened; notes when the server's list of versions couldn't be read (`versionsPartial`). Test: `VersionHistoryModal.test.tsx`.

## Batch 567 (WCAG 2.1 AA, 4.1.2)

- `ProtocolChangeModal.tsx`: each proposed change, and "Select all", was a button holding a checkbox; each is now the checkbox's label (click anywhere on it to tick). A change's checkbox is named by the specimen and the proposed template and described by the reason. The close button has a name. Tests: `ProtocolChangeModal.labels.test.tsx`.
