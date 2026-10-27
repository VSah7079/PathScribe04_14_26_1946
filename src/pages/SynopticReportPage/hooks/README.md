**Batch 650:** `useBottomBarActionEvents.ts` (+ test): listens for the bar's commands and calls the button's own handler, once, only when `resolveBottomBarCommand` allows it.

**Batch 649 (Amendment window):** new `useRevisionReleaseAvailability.ts`, the release capabilities for this case and facility as `{ availability, loading }`; the decision is `services/reports/revisionReleaseCapability.ts`.

**Batch 649:** `useSignOutWorkflow.ts` calls `runSignOutReviewGates` for both sign-out paths and `completeSurgicalSignOut` / `completeAssistFinalize` / `releaseRevisionsAtSignOut` for the writes (logic moved to `services/surgicalSignOut/` and `services/signoutGates/`; the hook went from 2,377 to 1,813 lines). A countersign error is shown (`useSignOutWorkflow.toast.countersignFailed`); a sign-out that cannot complete says so (`signOutNotCompleted`, `signOutNotCompletedStatusKept`). `useAmendmentWorkflow.ts` checks the release result (a refused release is not marked released or sent) and sends the addendum released from the amendment window. Tests: `useSignOutWorkflow.orchestrationGates.test.ts` (new), `useSignOutWorkflow.test.ts`, `useAmendmentWorkflow.test.ts`.

# SynopticReportPage hooks

Fifteen hooks (ten extracted originally, five added since) from `SynopticReportPage.tsx`, which was originally one
5,330-line component — its own header comment said it was meant to be
"layout + modal wiring only," but had drifted into owning most of the app's
real business logic directly. This folder is that logic, pulled out and
given real names, real boundaries, and real test coverage.

**Read this file if**: you're adding a feature and need to know which hook
it belongs in, tracking down a bug and need to know which hook owns the
relevant state, or onboarding onto this codebase for the first time.

## The original ten hooks, and what each one actually owns

Line counts were updated in the Batch 496 README audit (`wc -l`, Oct 9, 2026). The five later hooks are listed after the table.

| Hook | Lines | Owns |
|---|---|---|
| `useLisIntegration.ts` | 624 | Every LIS-facing transmission: material/stain orders, synoptic report sync, the CoPilot report-instance viewer, and the LIS amendment-notice pending-review flow. **Real, per direct follow-up (real outbound HTTP dispatch transport):** `sendSynopticReportToLis` now genuinely dispatches, immediately, fire-and-forget, right after its real payload (`fullPayloadText`/`embeddedHeader`) is built — the one real moment that payload exists, since `payloadBody` is a real, ephemeral parameter never persisted anywhere. See `services/reports/README.md`'s own account for the full real dispatch-transport story. **Real, per direct billing-expert guidance (PS-93):** `sendMaterialOrderToLis`'s order type gained `matrixBlockId`/`targetSpecimenIds` — a targeted ancillary stain order on a shared Biopsy Array now carries the full, explicit set of specimens it's targeting, not just the single `specimenId` every other order kind still uses. |
| `useSpecimenBlockManagement.ts` | 1627 | Day-to-day block editing: focused-block navigation (for voice commands like "mark grossed"), status advancement, triage confirmation, and adding blocks — both from the Material Tree Panel and the Add Orders modal's cassette/note flow. **New (Aug 2026), Step 4 of the label-printing build plan:** `handleAddBlock` now fires the real on-demand cassette-label trigger (per direct research: "triggering the print action sends jobs sequentially as each cassette/specimen is logged"), gated on `printSettingsService`'s `defaultPrintBehavior`. The actual print mechanism is a deliberate, honest stub (`utils/labels/dispatchCassetteLabel.ts`) pending PS-41 (Cerebro vs. an in-house ZPL pipeline) — the trigger and timing are real and fully wired regardless of how that resolves. *(Since added: alongside that engraver stub, `attemptPrintedLabel` also prints a real GS1/ZPL label through `printCassetteLabel`/`printSlideLabel` when the scan station supports printing and has a printer profile — checked in the Batch 496 README audit.)* Also wires the new soft-guardrail scan-verification warning (`useCassetteScanVerification.ts`, below) into the same function. Live-verified via direct debug logging (not fragile toast-DOM querying): the warning correctly stays silent on a genuinely first cassette and correctly fires when an earlier one is still unverified. **Step 6, same session:** adds `printCassetteForBlock` — the real, underlying single-cassette print logic, taking an explicit specimen/block rather than depending on what's currently focused. `handlePrintCurrentCassette` (the voice/hotkey action) is now a thin wrapper around it; `MaterialTreePanel.tsx`'s new per-block reprint icon calls it directly, so a reprint of ANY block — not just the focused one — uses the same real function, not a second implementation. Also adds `handleBatchPrintCassettes`, wired to both a real UI button and the new `BATCH_PRINT_CASE_LABELS` voice/hotkey action, using `utils/labels/getAllCassetteLabelRequests.ts`. Both fire through the same real `PATHSCRIBE_PRINT_CURRENT_CASSETTE`/`PATHSCRIBE_BATCH_PRINT_CASE_LABELS` custom events `services/actionRegistry/`'s new entries dispatch. Live-verified end to end: real popup windows with correct titles/content for requisition and container reprint, and a real dispatched-cassette console log for the per-block reprint icon on an already-existing block (not one just created) — the actual reprint scenario this exists for. **Real, per direct billing-expert guidance (PS-93):** adds `handleOrderTargetedMatrixStain` — the Array Mapper's own targeted ancillary stain order, sending the real LIS order (carrying the full `targetSpecimenIds` set) and appending one new `StainOrder` to the matrix block's own `slides[]`, reusing `handleUpdateMatrixBlock` for the actual write rather than a second, separate mutation path. |
| `useCassetteScanVerification.ts` | 85 | **New (Aug 2026).** Real feature, per direct research: "Barcode Scan Verification... to close the loop." A new, independent consumer of the already-real, already-working `PATHSCRIBE_SCAN` window event (`contexts/ScannerProvider.tsx` — no new scanning infrastructure needed). Deliberately a soft guardrail only — Pete's own research explicitly frames this as "Require (or offer a soft guardrail)," a real, legitimate choice; hard-blocking real grossing-bench workflow over a scanner hiccup isn't taken on without more explicit direction. Exposes real, inspectable `pendingVerification` state a future UI indicator could build on directly. **Real gap found and closed, same session:** this hook itself had no dedicated test file — `__tests__/useCassetteScanVerification.test.ts` (new, 12 tests) covers real scan matching (exact, trimmed-whitespace, non-matching), the guardrail check's own on/off/nothing-pending states, replacement of a still-unverified prior cassette, and listener cleanup across unmount — via real `renderHook`/`act` and genuine dispatched `PATHSCRIBE_SCAN` events, not mocked internals. |
| `useReportGeneration.ts` | 382 | Wiring `OrchestratorEngine`'s streaming AI-generation callbacks to React state, and the 2-second auto-generate-once trigger. This hook does not itself decide what the AI writes — it owns the plumbing between the engine and the UI. |
| `useAmendmentWorkflow.ts` | 893 | The full amendment/correction/addendum lifecycle: releasing a pending amendment, the drift-alert admin email, Stage 1 protocol-change review (add/remove/replace), opening a draft with version-history and pre-override-snapshot capture, field-override lineage tracking, and the two-stage (unlock vs. release) submission split. **New (Aug 2026):** a real, separate protocol-change review for Grossing Templates (`showGrossingProtoReview`/`grossingProtoChanges`/`handleGrossingProtocolChangesDetected`/`handleGrossingProtoCommit`) — deliberately parallel state from the Synoptic review above, not shared, since a single Gross Complete can propose real changes to both independently. See `useGrossingCompletion.ts`'s entry below for the full feature. |
| `useGrossingCompletion.ts` | 632 | Completing the grossing stage: per-specimen required-answer validation, the audit-trailed correction-reason prompt on re-finalize, automatic pool routing, and triggering Stage 1 AI synoptic-assignment evaluation. **New (Aug 2026), per direct follow-up:** "there is kind of a workflow that allows the Gross to be dictated and on submission, the AI reads the Text, and updates the template... Not sure if there is bearing here." Real bearing, confirmed — now also evaluates whether each specimen's *Grossing* Template still fits, given the just-dictated Gross text (mirrors the existing Synoptic evaluation's own proven pattern, one stage earlier). Runs before the existing dictation-to-fields pass; a specimen with a proposed template change is excluded from that pass and instead gets fresh field suggestions re-derived for its newly-accepted template in `useAmendmentWorkflow.ts`. Live-verified end-to-end, including the exact "don't lose information" behavior: accepting a proposed template change re-populates the new template's fields from the same dictated narrative rather than leaving it blank. |
| `useMicroscopicEntry.ts` | 128 | **New (Aug 2026).** Real feature, per direct follow-up: "after gross complete, the next logical step is to generate a Microscopic Description... a gap in our orchestration flow." A free-text microscopic narrative, entered independently of the Grossing checklist (per direct decision: "both, pathologist's choice" for entry method), with its own real `draft → saved` state machine — deliberately never `'finalized'` the way a Grossing report is (see `MicroscopicReportInstance`'s own doc comment in `types/case/Case.ts`). Deliberately its own hook rather than folded into `useGrossingCompletion` — a genuinely separate concern. Same real `caseRouter.updateCase()`/`knownVersionRef`/concurrency-conflict pattern every other write hook here already uses.
| `useReleaseBufferCountdown.ts` | 36 | **New (Aug 2026).** Real, shared live countdown to a known expiry timestamp, extracted from `ReleaseBufferBanner.tsx` (Post-Sign-Out Release Buffer, Phase 1) so `HeaderBar.tsx`'s own "MM:SS remaining" status badge (Phase 3, spec §13b) shares the exact same countdown logic rather than a second, separately-maintained copy. Ticks every second only while genuinely relevant (a real `expiresAt` is provided), not an unconditional background interval. |
| `useOrchestratorDraft.ts` | 388 | The Orchestration draft lifecycle: save (the one real, shared save path every trigger in the app uses — see `writeCaseDraft` below), restore-on-load (from the case only; the browser copy was removed in Batch 431), sync-to-diagnostic for the Full Report tab, the voice/keyboard save/generate event listeners, and the five section-editing actions (accept, keep version, accept all, etc.). |
| `useSignOutWorkflow.ts` | 2340 | The highest-stakes hook in this directory: finalize, sign-out, the resident/FPPE countersign gate, the fixative-time hard block, and pre-finalisation review construction. **Real, per direct follow-up ("we had a configurable delay feature that allowed the Pathologist time to fix typos... Hopefully that still works given all the updates?" — the full "Path B Execution Plan" that followed, closing services/reportRelease/README.md's own previously-open §18b gap): `handleSignOutConfirm()` now genuinely owns the attending's real sign-out + release-buffer decision, not just the resident/FPPE gate it always had.** Right after `finalizeSignOut()` creates the real version snapshot, it now evaluates `resolveBufferForCase()` (the same real decision `finalizeCase()` already used) and either starts a real buffer (`status: 'pending-release'` + fields) or dispatches immediately via the new `dispatchCaseInstances()` (`services/reports/README.md`) when no buffer applies. The two real, hard-block compliance gates `finalizeCase()` always had (pre-analytic date, fixative-time) are now shared with this path too, via a new, pure `checkPreAnalyticAndFixativeGates()` helper — never two independently-maintained copies — since "🔒 Finalize" is now retired for Orchestration Mode (`components/README.md`'s own `BottomActionBar.tsx` entry) and those gates would otherwise have silently gone unenforced there. PS-114, Stage 4 (gate cutover, done): the FPPE countersign-redirect gate and the case-count increment now both read from the new `qaSupervisionAssignmentService` first (`FPPE_ACTIVITY_TYPE_ID`), not the old `fppeAssignmentService` — see `services/quality/README.md` for the full account. Reviewer resolution uses the new type's `supervisorUserId` field (renamed from `proctorUserId`). A real, temporary drift-check runs alongside every gate evaluation, comparing the old system's own answer and logging (never altering behavior on) a disagreement — meant to catch a real mismatch immediately during the transition, not left running once the old system is retired. Old-system writes are NOT retired in this change — `FppeAssignmentsSection.tsx`'s own list view still reads them as its source of truth, confirmed directly before scoping this change; migrating that screen is separate, later work. **Real, per direct follow-up ("Yes we should scope 'Return to Trainee'/'Reject with Notes'"): a new `handleReturnToTrainee()`** — the attending's real alternative to `handleSignOutConfirm()`, not called from within it. Reuses `syncPrimaryAssignee()` directly (`services/cases/caseAssignmentSync.ts`, the same primitive `delegateCase()`'s own ownership-transfer branch uses) rather than a parallel `DelegationRecord` — see `services/cases/README.md`'s own fuller account of that decision. Requires real feedback text (reuses the existing `countersignFeedback` state the accept path already had), reverts each `SynopticReportInstance.status` from `pending-countersign` back to `draft`, and sets `Case.status: 'returned'` — a previously-dormant status value, now genuinely wired for the first time. **Real, PS-327 ("requiresCountersign gating also resolves per-lab through the same mechanism" as `canFinalizeCase()`'s own `authorityOverrides` resolution):** `resolveFinalizeAuthorityContext()` — previously called twice per sign-out (once, silently, never for the countersign gate at all; once separately right before `canFinalizeCase()`) — is now resolved exactly once, up front in `handleSignOutConfirm()`, and its `participationTypes`/`performingLabFacilityId` feed BOTH `resolveCountersignRequiredTypeIds()` (new, `services/auth/caseAccessControl.ts`) and `canFinalizeCase()`, removing a duplicate facility/participation-type fetch from every sign-out attempt in the process. The resolved `countersignRequiredTypeIds` are passed into `resolveResidentCountersignRequired()` (`services/cases/README.md`) as a new, optional, purely additive field — see that function's own updated doc comment for the real gap this closes: an admin-defined participation type with "Requires Countersign" checked in the Participation Types Config screen (`components/Config/System/TypeModal.tsx`) previously drove nothing but a cosmetic badge in `CaseTeamModal.tsx`; it now genuinely routes that participant's sign-out into release-for-countersign, same as the two hardcoded resident/cytotechnologist checks already did. **Jurisdiction-bound authority (Sep 2026):** `resolveFinalizeAuthorityContext()` now delegates to the shared `services/facilities/resolveCasePerformingLabScope.ts` and returns the performing lab's own `jurisdiction` too, passed into `resolveCountersignRequiredTypeIds()` and `canFinalizeCase()` at **both** real call sites — Orchestration sign-out (`handleSignOutConfirm()`) and Assist-mode finalize (`finalizeCase()`) — so a country's own regulatory profile (`services/participationTypes/README.md`) genuinely governs who may sign out there. |

Added since the table was written:

| Hook | Lines | Owns |
|---|---|---|
| `useEffectiveSpecimenComplexity.ts` | 102 | Resolves which synoptic instances belong to each specimen and whether each template is diagnostic, for the billing complexity check (`services/billing/shouldAutoUpgradeComplexity.ts`). |
| `useCaseMaterialStore.ts` | 70 | Batch 452: binds the open case to its material store (`services/material/caseMaterialStore.ts`) and mirrors the store's tree into `caseData`. |
| `usePeerReview.ts` | 30 | Batch 439 (PS-144): loads the case's peer-review status and the possible reviewers (`services/quality/peerReviewStatus.ts`). |
| `useOrganMap.ts` | 119 | Batch 461: the anatomical map beside the synoptic, worked out from the synoptic answers (`services/organMapping/`). |
| `useWarningConfirm.tsx` | 39 | Batch 465b: a passable warning asked from a save or sign-out that waits for the answer. |

Pure helpers in this folder (not hooks): `checkStainQcGate.ts`, `checkPeerReviewAndMismatch.ts`, `checkInkingSignOutGate.ts`, `buildReviewFieldsFromAiSuggestions.ts`, `buildSynopticNarrativePrompt.ts`, `resolveBuildReportDirection.ts`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the folder holds fifteen hooks, not ten; line counts updated; the draft no longer restores from localStorage (Batch 431, `useOrchestratorDraft.ts` has no localStorage use).*

`sharedHookTypes.ts` (85 lines) isn't a hook — it's the types and one small
helper (`handleConcurrencyConflict`) that were independently re-declared,
identically, across five of the seven files above. See "Shared types" below.

## How the hooks connect

They're called in this order in `SynopticReportPage.tsx`, and three real
values get threaded from one hook's return into another's parameters:

```
useLisIntegration          → sendSynopticReportToLis, sendMaterialOrderToLis
useSpecimenBlockManagement  (receives sendMaterialOrderToLis)
useOrchestratorDraft
useAmendmentWorkflow        → handleProtocolChangesDetected, openAmendmentDraft,
                               releasePendingAmendmentOrAddendum,
                               handleGrossingProtocolChangesDetected
useGrossingCompletion        (receives handleProtocolChangesDetected,
                               handleGrossingProtocolChangesDetected)
useSignOutWorkflow           (receives openAmendmentDraft,
                               releasePendingAmendmentOrAddendum)
useReportGeneration
```

Everything else — `caseData`/`setCaseData`, `knownVersionRef`,
`setConcurrencyConflict`, `signingUser`, `showToast`, `log` — is genuinely
shared, cross-cutting state that stays in the main component and gets
passed into every hook that needs it, rather than being owned by any one
hook.

**`generateReportPdfSnapshot`** is defined directly in the main file, not
inside any hook — it's used by both `useAmendmentWorkflow` and
`useSignOutWorkflow`, but doesn't belong conceptually to either.

**`writeCaseDraft`** (exported from `useOrchestratorDraft.ts`) is the one
exception to "hooks own their logic, the main file owns wiring" — it's a
plain, standalone async function, not a hook. It exists because
`handleConcurrencyForceSave` (the "Save Mine Anyway" conflict-resolution
action) is defined very early in the main file, before `useOrchestratorDraft`
is even called, and needs the exact same mode-aware write logic
`saveDraftInternal` uses. A standalone function sidesteps that ordering
problem without duplicating the logic — which is what was happening before
this consolidation (see the file's own header comment for the full history:
there were once four independently-written copies of "save the draft").

## What's deliberately *not* in these hooks

A few things were investigated and deliberately left in the main file,
not because they were missed, but because moving them would have been the
wrong call:

- **`handleConcurrencyForceSave`** — defined very early in the main file
  (before `orchSections` itself is declared), and calls `writeCaseDraft`
  directly rather than going through a hook.
- **The `orchSections` state itself**, and `activeSectionId` — both are
  read directly in JSX and by multiple hooks; extracting the *state* would
  have meant either dragging in every consumer or splitting state from its
  own usage. What moved to `useOrchestratorDraft` is the *lifecycle logic*
  that operates on that state (save/restore/sync), not the state itself.
- **Small, genuinely page-specific handlers** (`navigateToCase`, tab-switch
  guards, browser `beforeunload`/back-button listeners) — these don't share
  a cohesive concern with each other or with any of the seven domains
  above. Forcing them into a hook would produce a grab-bag file, which is
  worse than leaving them where they are.

## Shared types (`sharedHookTypes.ts`)

Added during a review pass after the initial extraction, when several
hooks turned out to have independently re-declared identical types:
`SigningUser`, the `setConcurrencyConflict` signature, and
`SendSynopticReportToLisFn`'s full payload shape. Five separate copies of
the same type is a real drift risk — a future fix to one copy silently
missing the other four. Now declared once and imported everywhere.

`handleConcurrencyConflict(e, setConcurrencyConflict, options?)` is the
other thing here — a small helper wrapping the `instanceof
ConcurrencyConflictError` check that appeared, identically, at roughly 14
call sites across five hooks. It returns a boolean rather than forcing a
single return shape, specifically so each call site keeps its own return
statement and — critically — its own `blockOverride` choice explicit. That
distinction is real: high-stakes writes (finalize, sign-out, amendment
release) pass `blockOverride: true` and give the pathologist no "proceed
anyway" option; routine draft edits don't. One call site
(`useSpecimenBlockManagement`'s block/recut retry, which force-writes
through a conflict because the LIS has already acknowledged the physical
order) doesn't use this helper at all — it doesn't fit the pattern, and
forcing it in would have been wrong.

## Type safety

Every hook was originally extracted as a pure move — the logic was
unchanged, but that meant existing `any` casts came along for the ride. A
later pass (see git history / delivered patches around "any-fixes-batch")
went through all ~134 of them individually and found they fell into three
real categories, not one:

1. **Stale casts on already-declared fields.** The large majority.
   `SynopticReportInstance`, `Specimen`, `HistologyBlock`, `CaseParticipant`,
   and others were already properly typed in `@/types/case/*` — the casts
   were leftovers, likely written before those types caught up, never
   cleaned up after.
2. **Genuinely missing fields**, added to the shared `Case` type after
   confirming each was a real, established, actively-used field with
   nothing in the codebase currently declaring it — not invented. Examples:
   `pendingAddendumId` (used identically to its declared sibling
   `pendingAmendmentId` throughout `useAmendmentWorkflow`), and
   `finalizedAt`/`finalizedBy` (the former drives a real TAT metric
   elsewhere in the app).
3. **One real, flagged-not-fixed behavior gap.** `requiredFields` is
   declared on `SynopticForReview` (an *output* shape `useSignOutWorkflow`
   itself builds) but was never declared on `SynopticReportInstance` (the
   real, persisted *input*). That means the field always evaluated to
   `[]`, and the "required field incomplete — sign-out blocked" warning it
   drives in `PreFinalisationModal` can never fire. Preserved as an
   explicit `[]` with a comment rather than guessed at silently — see the
   comment at the source for what a real fix would need.

Every hook file is now genuinely clean of `any` — the only remaining
matches for the string `any` are the English word, inside comments.

## Testing

189 tests across all ten hooks (see `__tests__/README.md` for the
patterns, tooling, and how to run them). Every hook has real coverage —
not smoke tests, but tests that exercise the actual branches: the
CoPilot send-before-release ordering guarantee, the resident/FPPE
countersign routing (including the real, id-synchronized shadow-write
to `qaSupervisionAssignmentService` — PS-114, Stage 3), the
required-field gate's singular/plural toast phrasing, the `userEdited`
vs. not-yet-accepted branching in the streaming AI callbacks, and so
on.

## Batch 318: `useSignOutWorkflow.ts`, PS-137

- **Agreement signals:** the two critical-finding handlers no longer each build the agreement signals inline. Both call one `captureAbnormalDetectionOutcomes(outcome)` helper, which delegates to `services/abnormalDetection/recordAbnormalDetectionOutcomes.ts`. Signals now carry the covering Validation Study. Capture is still fire-and-forget and never blocks sign-out; the hook tests now wait for it.
- **Narrative-edit signals:** they resolve their study through the same shared `services/validationStudies/resolveActiveStudyId.ts`.

- **Batch 331 (PS-327):**
  - **Shared resolver:** `resolveFinalizeAuthorityContext()` moved out of `useSignOutWorkflow.ts` into `services/auth/resolveFinalizeAuthorityContext.ts`, unchanged in behaviour. Autopsy sign-out uses the same resolver, and Cytology will next, instead of each keeping a copy. It gains an optional `jurisdictionOverride`, which Autopsy uses for the coroner jurisdiction.
  - **Autopsy sign strings:** `SynopticReportPage.tsx`'s Autopsy PAD/FAD sign banners and toasts are now translated (`autopsySignOut.*`), with the PAD date formatted in the user's locale.
- **Batch 345 (PS-60 follow-up), `useSignOutWorkflow.ts`:** every signed state change now goes through `signatureGate` (`services/auth/signatureEvidence.ts`).
  - **Before the change:**
    - `handleSignOutConfirm(confirmation)`, `handlePreFinalConfirm(…, confirmation)` and `handleFinalizeConfirm(confirmation)` accept the modal's confirmation;
    - `finalizeCase` requires one already accepted for the case;
    - a resume after a data gate reuses the held confirmation.
    A refused or missing confirmation stops before anything is written, with a toast (`signatureEvidence.refused.*`).
  - **After the save:** `finalizeSignOut` commits it as `signed`, the resident release as `released_for_countersign`, `finalizeCase` as `finalized`.
  - **Tests:** `__tests__/useSignOutWorkflow.test.ts` mocks the gate and adds a refusal test and a commit test.

## Batch 348: `useSignOutWorkflow.ts`, PS-67

The AI synoptic suggestions and the narrative-from-answers call read `PathScribeAIService`'s result as `{ ok, data }` (`result.ok === false` means it failed), now that the AI services use the app's one `ServiceResult` shape. Behaviour is unchanged.

## Batch 349: toast kinds, PS-100

`showToast` takes an optional kind: `(message, kind?: ToastKind)`. Every hook here passes `'warning'` for a block, refusal or failure, so those messages stay until closed; confirmations are unchanged. Hook tests expect the `'warning'` argument (26 assertions updated).

## Batch 363 (PS-72): patient data tagged for screenshot redaction

- `useSpecimenBlockManagement.ts`: the cassette and slide printing toasts (their ids contain the accession) pass `containsPhi`. Scan stations come from `@/services`, so it came off the mock-import baseline.
- `useSignOutWorkflow.ts`: the released-for-countersign toast passes `containsPhi`.
- `__tests__/`: the two hook tests expect the new toast arguments.

- **Batch 380, `useAmendmentWorkflow.ts`:**
  - When the modal's mode changes, the draft's type follows (`amendmentService.changeDraftType`), and it's checked again before saving. Before this, minor amendments and addenda couldn't be saved from a new draft.
  - It reaches the audit service and the AI suggestion functions through `@/services`, so it came off the mock-import baseline.

## Batch 398

`useGrossingCompletion.ts` applies the Grossing field requirements and `case:grossing:complete` before Gross Complete / Update Gross, and returns `pendingProtocolConfirmation` with confirm/cancel for the protocol-off case. The decisions are in `services/grossing/reportGrossComplete.ts`.

## Batch 426

- `useLisIntegration.sendSynopticReportToLis` sends the workup itself through `services/reports/dispatchAssistSynopticResult.ts`: the structured result, its PDF and the text block. Before, it sent a header and a placeholder sentence.
- `useSignOutWorkflow.finalizeCase` marks an Assist case's released workups `finalized` and, with no release buffer, publishes the release so they go to the LIS.

## Batch 428: Configuration permissions

`__tests__/useSpecimenBlockManagement.test.ts` allows Configuration changes in its mocked authorization (the specimen dictionary it writes is checked now).

## Batch 431

`useOrchestratorDraft.ts`: the AI draft sections are saved to and loaded from the case only; the browser copy is gone (a copy left on one workstation could override a newer save made at another).

## Batch 433

`useSignOutWorkflow.ts`: the billing deficiency severity map covers the new `MISSING_CHARGE` and `POST_SIGNOUT_CORRECTION` types.

## Batch 439

- `usePeerReview.ts`: the case's peer review status and the possible reviewers.
- `checkPeerReviewAndMismatch.ts`: the mismatch check (once per case: a recorded decision ends it) and the peer-review gate, for `useSignOutWorkflow.ts`, which runs both after the stain QC gate in `handleSignOutConfirm` and `finalizeCase`.

## Batch 445

`useSpecimenBlockManagement.ts` marks unsaved sections by id (`blocks`, `blockEdit`, `triageChecklist`, …) instead of English labels.

## Batch 450 — test evidence for Priority 1 and 2 tickets

See `../README.md` (Batch 450): logic moved to services and new tests for PS-57, PS-141, PS-274, PS-275, PS-317, PS-318, PS-324.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

New `useCaseMaterialStore.ts`. `useSpecimenBlockManagement`: `handleAddDecant` (which takes an optional parent decant), `handleUpdateDecant` and the new `handleDeleteDecant` go through the material store and return `materialStore`.

## Batch 454 — Follow-up not received: report, alerts and clinician email

`useSignOutWorkflow.ts`: once the sign-out has landed, a ticked "follow-up expected" box marks the case (`markFollowUpExpectedLive`). If that fails, a warning says why (`followUpMarkFailureKey`), and the sign-out still stands.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

`useSpecimenBlockManagement`: the nine force-writes now go through `persistBlockChange` (`services/material/blockCaseChanges.ts`). `useOrchestratorDraft`: `writeCaseDraft` requires the version.

## Batch 458 — PS-71 (continued)

`useOrchestratorDraft`: draft saves merge section by section onto a newer save (`saveDraftParts`); the merge base can be owned by the page (`draftBaseRef`) so the browser copy carries it.

## Batch 458 — PS-71 (review before saving over someone else's save)

`useOrchestratorDraft`: with `onMergeReview`, a draft save that meets someone else's save in other parts stops for the person's review instead of saving the merge. With `pendingPartsRef`, a stopped instant change goes with the next draft save.

## Batch 460

`checkStainQcGate.ts` and `useLisIntegration.ts` use each slide's printed level (`services/material/slideLevels.ts`), not its position, so a reordered slide's staining batch and LIS steps are still found.

## Batch 461

- `useOrganMap.ts`: the anatomical map companion. Loads the active synoptic's map context (template, binding, the facility's colours), works the map out from the synoptic answers on every render, and inserts or removes the report image (`insertOrganMapFigure` / `removeOrganMapFigure`, which check `report:organ-map:insert`). Decisions stay in `services/organMapping/`.
- `useSignOutWorkflow.ts`, `useLisIntegration.ts`: pass the case's parts to `resolveAnswers` (results grid text).

## Batch 463

`useOrganMap.ts`: the panel state comes from `organMapReportState` ('auto' for maps that are always in the report).

## Batch 463b

`useSignOutWorkflow.ts`: sign-out stops when a Mohs positive sector has no block or one beyond Blocks cut (`findMohsBlockGaps`): up front and in finalize (Assist), and in `handleSignOutConfirm` (Orchestration sign-out and a resident's release), where the stale-map gate now runs too.

## Batch 466d

`useSignOutWorkflow.ts`: sign-out asks before going on (a warning, not a block) when a synoptic's map records invasive carcinoma and its margins aren't all reported (`findInvasiveMarginGaps`). This is at the modal and pre-check gates.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

`useSignOutWorkflow`: an answer that still differs from its molecular result asks first, as a warning, at both sign-out entry points (`services/molecularOrders/molecularSignOutCheck.ts`).

## Batch 484 — new: checkInkingSignOutGate.ts (Gate B, PS-519 follow-up)

New **`checkInkingSignOutGate.ts`**, mirroring `checkStainQcGate.ts`'s own real, established shape exactly: gathers the active ink-colour palette and the case's own facility/jurisdiction, then calls `services/grossing/evaluateInkingGate.ts`. Returns `null` for anything that doesn't need to interrupt Sign-Out (clean, or Severity-2-only — advisory, never a block at Gate B); the real result only for BLOCK/OVERRIDE_REQUIRED/PALETTE_UNAVAILABLE.

`useSignOutWorkflow.ts` checks it at both real sign-out call sites (the initial click, and the finalize path), right after the existing stain-QC gate — same real ordering principle as every gate already there. New param `setInkingGateBlocking`, same shape as `setStainQcGateBlocking`/`setPeerReviewGate`.

## Batch 491 — margin-distance extraction + Tumor Board auto-flagging wired at sign-out (PS-359 follow-up)

`useSignOutWorkflow.ts`'s `finalizeSignOut` now calls `services/tumorBoardRules/runMarginRuleEvaluation.ts`, fire-and-forget, right after the existing `applySurgicalPostSignOutQa(caseData.id)` call — reusing the already-resolved `authorityLabId` for the facility context rather than re-deriving it. Runs `marginExtractionService.extractAndStore()` over every synoptic instance on the case (closing Batch 490's own disclosed "nothing calls this yet" gap), resolves the case's facility's effective Tumor Board rules, and — on a match with no listing already active — creates one with `source: 'Rule'`. A toast (`useSignOutWorkflow.toast.autoFlaggedForTumorBoard`) tells the signing pathologist when it fires. See `services/tumorBoardRules/README.md`.

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 515 (PS-124)

`useSignOutWorkflow.ts`: the legacy FPPE shadow write and the old-vs-new drift check are gone; the FPPE gate and its case-count increment use the QA supervision service only.

## Batch 530 (PS-554)

`useClinicalMismatchAlert.ts`: Gate A, the mismatch check in the background two seconds after the diagnosis (or autopsy sections) stops changing. `checkPeerReviewAndMismatch.ts`: Gate B now goes through `clinicalMismatchService.atSignOut`, so only a high-risk mismatch opens the window; a low-risk one is logged.

## Batch 531

`useClinicalMismatchAlert.ts` now wraps the shared `hooks/useClinicalMismatchCheck.ts`; the check re-runs when the compared text changes (`clinicalMismatchService.assess`).

## Batch 536 (PS-558)

`useSignOutWorkflow.ts`: the critical-findings check passes the case and facility, for the jurisdiction's AI vendor policy.

## Batch 538

`useSignOutWorkflow.ts`: the two sign-out release events with no release buffer (Orchestration and Assist) now carry the performing facility, so print and fax route. It was missing.

## Batch 540

`useAmendmentWorkflow.ts`: a correction or addendum refused during the release delay closes the window with `useAmendmentWorkflow.toast.inReleaseDelay`.

## Batch 572

`useSignOutWorkflow.ts`: confirming an abnormal finding saves the case and now moves the page's known version on (it didn't, so the next save could be refused as a conflict).

## Batch 588

- `useSpecimenBlockManagement.ts`: `handleDeleteBlock(specimenId, blockId, reasonCode, note)` saves the soft delete through this page's own version tracking and calls `services/material/deleteBlockInProcess.ts`; `canDeleteBlocks` is false once the case is signed out.

## Batch 589

- `useLabelBridgeNotice`: shows the "label printer is not connected" toast (PS-55).
- `useSignOutWorkflow`: the check reads `narrativeForDetection(caseData)`, saves the flagged findings per case and loads them when the case opens (PS-323).
- `useOrchestratorDraft`: sections feed the case narrative by their stable part id (PS-323).

## Batch 607

`useSignOutWorkflow.ts`: a required code system with no code on the case asks before sign-out; going ahead is audited (`CODE_POLICY_SIGNOUT_OVERRIDE`, system names only). No way to ask means sign-out stops.

## Batch 609 (#31)

`checkPeerReviewAndMismatch.ts`: `checkClinicalMismatch` uses the revision rules (`clinicalMismatchService.atRevision`) when a report is unlocked for an amendment or correction; new `checkAddendumMismatch`. `useAmendmentWorkflow.ts` holds an addendum with a high-risk mismatch (`amendmentMismatch`, `resumeAddendumAfterMismatch`, `cancelAddendumMismatch`). `useClinicalMismatchAlert.ts` marks the alert on an amended report with the lab setting.

## Batch 615 (PS-138): `useTriggerCodeQueries`

Loads the Code Manager's trigger searches (`services/abnormalDetection/triggerCodeQueries.ts`) while the Code Manager is open, honouring the enterprise and facility abnormal-detection switches and the performing-lab scope of each rule. Returns an empty list when off or on any error.

## Batch 639

New `useDiscardChangesConfirm.tsx` (+ test): the confirmation shown before Discard Unsaved Changes runs.

## Batch 650 (650a)

`useReportDraftVoiceActions.ts` (new): registers the Report Draft's spoken commands while it is open and carries Enter Gross / Micro / Diagnosis to the section editor (showing the Report Draft first when another tab is open). Replaces the inline list and the `registerAction` call that never registered anything. Test: `useReportDraftVoiceActions.test.tsx`.



## Batch 651
`useReportGeneration.ts`: `onSectionComplete` keeps `result.provenance` on the section.

## Batch 652 — Specimen pipeline gaps

- `useSpecimenBlockManagement.ts` asks `checkTriageReleaseGate` (service) instead of a worklist tile's predicate; the comment no longer calls the check server-side. 1722 to 1716 lines.
- `useGrossingCompletion.ts` calls `routeCaseAfterGrossing`.
- `useSignOutWorkflow.ts`: the reconciliation step loads a queue (`createReconciliationQueue`) from `planFrozenReconciliation`; `finalizeSignOut` hands out the next frozen specimen before signing. 1813 to 1800 lines.

- `useReportOpenCommands.ts` (Batch 661): listens for the four report voice actions and the specimen selection event; the decisions are in `services/reports/reportOpenCommands.ts`.

- Batch 663: `useReportOpenCommands.ts` also handles Maximise, Minimise, Preview, Internal Note and Skip Field; `useAddendumCommand.ts` listens for Add Addendum and calls `handleRequestAddendum` from `useAmendmentWorkflow.ts` (kept separate so the workflow hook needs no sign-in context).

- Batch 664: `useCollaboratorCommand.ts` (Add Collaborator), `useSignOutAndNext.ts` (Orchestration Sign Out and Next; the page passes its `arm` function to the bottom bar button), and `useReportDraftVoiceActions.ts` also carries Edit Field to the section editor.

- Batch 665: `useSignOutAndNext.ts` returns `{ arm, disarm }` and serves Assist Finalise & Next as well; every plain sign-out / finalise button disarms. `useSynopticEditField.ts`: Edit Field for synoptic panel questions (called from `RightSynopticPanel` on an existing line). `useCollaboratorCommand.ts` sends the collaborator notice.
