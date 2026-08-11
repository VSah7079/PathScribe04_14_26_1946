# SynopticReportPage hooks

Seven hooks extracted from `SynopticReportPage.tsx`, which was originally one
5,330-line component — its own header comment said it was meant to be
"layout + modal wiring only," but had drifted into owning most of the app's
real business logic directly. This folder is that logic, pulled out and
given real names, real boundaries, and real test coverage.

**Read this file if**: you're adding a feature and need to know which hook
it belongs in, tracking down a bug and need to know which hook owns the
relevant state, or onboarding onto this codebase for the first time.

## The seven hooks, and what each one actually owns

| Hook | Lines | Owns |
|---|---|---|
| `useLisIntegration.ts` | 298 | Every LIS-facing transmission: material/stain orders, synoptic report sync, the CoPilot report-instance viewer, and the LIS amendment-notice pending-review flow. |
| `useSpecimenBlockManagement.ts` | 207 | Day-to-day block editing: focused-block navigation (for voice commands like "mark grossed"), status advancement, triage confirmation, and adding blocks — both from the Material Tree Panel and the Add Orders modal's cassette/note flow. |
| `useReportGeneration.ts` | 292 | Wiring `OrchestratorEngine`'s streaming AI-generation callbacks to React state, and the 2-second auto-generate-once trigger. This hook does not itself decide what the AI writes — it owns the plumbing between the engine and the UI. |
| `useAmendmentWorkflow.ts` | 614 | The full amendment/correction/addendum lifecycle: releasing a pending amendment, the drift-alert admin email, Stage 1 protocol-change review (add/remove/replace), opening a draft with version-history and pre-override-snapshot capture, field-override lineage tracking, and the two-stage (unlock vs. release) submission split. |
| `useGrossingCompletion.ts` | 303 | Completing the grossing stage: per-specimen required-answer validation, the audit-trailed correction-reason prompt on re-finalize, automatic pool routing, and triggering Stage 1 AI synoptic-assignment evaluation. |
| `useOrchestratorDraft.ts` | 326 | The Orchestration draft lifecycle: save (the one real, shared save path every trigger in the app uses — see `writeCaseDraft` below), restore-on-load (localStorage-over-caseData priority), sync-to-diagnostic for the Full Report tab, the voice/keyboard save/generate event listeners, and the five section-editing actions (accept, keep version, accept all, etc.). |
| `useSignOutWorkflow.ts` | 762 | The highest-stakes hook in this directory: finalize, sign-out, the resident/FPPE countersign gate, the fixative-time hard block, and pre-finalisation review construction. |

`sharedHookTypes.ts` (67 lines) isn't a hook — it's the types and one small
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
                               releasePendingAmendmentOrAddendum
useGrossingCompletion        (receives handleProtocolChangesDetected)
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

131 tests across all seven hooks (see `__tests__/README.md` for the
patterns, tooling, and how to run them). Every hook has real coverage —
not smoke tests, but tests that exercise the actual branches: the
CoPilot send-before-release ordering guarantee, the resident/FPPE
countersign routing, the required-field gate's singular/plural toast
phrasing, the `userEdited` vs. not-yet-accepted branching in the
streaming AI callbacks, and so on.
