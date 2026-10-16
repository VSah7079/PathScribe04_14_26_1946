# services/templates/

Synoptic template LIBRARY MANAGEMENT ONLY, post-July-2026 split — seeds the CAP/RCPath-derived generic JSON templates into editorStore.

**Pattern:** `templateService.ts` plus pure rule modules (`protocolLifecycle.ts`, `templatePublishingRules.ts`, `conditionEdits.ts` and others listed below); no interface/mock split.

## Files

- **`templateService.ts`** — Core template seeding/management logic.
- **`protocolLifecycle.ts`** (Batch 317, PS-73): pure rules for the protocol library's row actions.
  - `prepareProtocolCopy`: **Duplicate** gives a new protocol (new id, localized copy name, patch bump, no lineage). **New Version** gives the next version (new id, same name, minor bump, `supersedesId` → the published source).
  - `findProtocolNameConflict`: names are unique among live protocols; archived ones and a protocol's own version lineage don't count.
  - `protocolActions`: which actions each lifecycle state offers.
  - `matchesStatusFilter`: "All" hides archived.
  - `buildProtocolExport` / `protocolExportFilename`: the Export JSON payload (`format: 'pathscribe-synoptic-protocol'`, version 1, full editor template) and its file name.
  - `bumpVersion`: moved here from SynopticEditor.tsx.
- **`protocolLifecycle.test.ts`**, **`templateService.archive.test.ts`**
## Notes

- The AI-suggestion sub-system that used to live here moved to services/templateSuggestions/ — see that folder's README.
- The old top-level `src/templates/mockDcisTemplate.ts` that once needed relocating no longer exists; there is no `src/templates/` folder anywhere in the repo.

*Corrected in the Batch 496 README audit (Oct 9, 2026): pattern line updated (many files, not one); the `mockDcisTemplate.ts` relocation item is moot, the file is gone.*

## Archive, restore and New Version (Batch 317, PS-73)

`templateService.ts` gained:

- **`archiveTemplate(id)`**: status `'archived'` (a new `LifecycleState`) plus `archivedAt`. Allowed from any state. The protocol drops out of every status-filtered list, so it is no longer offered for new reports; reports already written with it keep their content.
- **`restoreTemplate(id)`**: archived → `'draft'`. A restored protocol must be reviewed again before anyone can report with it.
- **`publishTemplate`** now archives the published protocol a New Version `supersedesId`, so only one version of a protocol is live at a time. `saveDraft` carries `supersedesId` into the registry.
- **`transitionTemplate(id, 'archived')`** dispatches to `archiveTemplate`.
- **List-cache invalidation.** Every registry write now clears the `listTemplatesCached` cache. Before this, a cached `'published'`/`'approved'` list kept showing a protocol after its status changed until the page reloaded.

Lifecycle transitions here are still logged to the console only, not to the audit log. That was true of every transition before this batch too.
- **Copies keep registry-only attributes.** `prepareProtocolCopy` sets `copiedFromId`. On a copy's first save, `saveDraft` inherits the source's `isDiagnostic`, `type` and `group` (`inheritedCopyAttributes`). Without this, a copy of a non-diagnostic Grossing checklist would have defaulted to diagnostic.
- **Reviewer cache cleared.** Archive, restore and supersede clear `TemplateRenderer.tsx`'s cached `ps_state_<id>`. Otherwise a restored draft would still show as published in the reviewer, with no way back into review.

## `editorUrlAfterSave` (Batch 326, PS-63)

In `protocolLifecycle.ts`. After the first save of a new template or a Duplicate / New Version, it gives the editor the saved protocol's own address. Without it, a page refresh opened another fresh copy and the next save created a second protocol. It is tested in `protocolLifecycle.test.ts`.

## Review governance (Batch 328, PS-63)

Pete's rules for approving and publishing, enforced in the service. The Admin Guide text is in `components/Config/Protocols/README.md` → "Who may approve and publish".

- **`templatePublishingRules.ts`** (+ `.test.ts`, new; pure):
  - `calcTemplateCoverage`, moved here from `SynopticEditor.tsx` so the editor and the publish check use the same figure;
  - `SNOMED_PUBLISH_THRESHOLD` (80);
  - the settings type with its safe defaults and `normalizeGovernanceSettings`;
  - `isTemplateApprover`: the Template Approver / Lab Director / Admin roles, or an admin app role. Since Batch 329 the check is by built-in role id, not name;
  - `decideApprove` and `decidePublish`, which implement Can Publish = approver ∧ (self-approval allowed ∨ not an author), plus Required Reviewers and the SNOMED gate;
  - `countingApprovals`.
- **`templateGovernanceSettings.ts`** (new):
  - the site settings, stored as `pathscribe_template_governance`;
  - `saveTemplateGovernanceWithAudit`, which records a change in the audit log with literal English detail.
- **`templateService.ts`:**
  - `saveDraft` records every saver's id in `editorIds` and clears `approvals`. Submit, resubmit and request-changes also clear `approvals`.
  - `approveTemplate` and `publishTemplate` read the signed-in user and the settings, and throw `{ code, message }` on a refusal: `NOT_APPROVER`, `SELF_APPROVAL`, `ALREADY_APPROVED`, `NOT_ENOUGH_APPROVALS`, `SNOMED_BELOW_THRESHOLD`.
  - Approve returns `approvalCount`, and stays `in_review` until enough approvals are in.
  - Publish records `publishedById` / `publishedAt`.
  - **Where publish reads coverage:** from the stored editor content when there is some, else the registry's seeded `snomedPct`.
  - **New `resetToDraft`:** `transitionTemplate(id, 'draft')` used to throw, so the reviewer page's Reset never reached the registry.
- **Legacy data:** a template approved before this batch has no approval records. Its recorded approval counts as one approval by a non-author. Seeded templates have no `editorIds`, so no one counts as their author.
- **Tests:** `templatePublishingRules.test.ts` (rules) and `templateService.governance.test.ts` (end to end through the service). `templateService.archive.test.ts` now approves before publishing a New Version.

## Drafting by role, and roles by id (Batch 329, PS-63)

Per Pete: drafting is locked to **Template Author**, Admin inherits it, and the template roles are built in and checked by id.

- **`templatePublishingRules.ts`:**
  - **Drafting:** `canDraftTemplates` allows the Template Author role, the Admin role, and admin app roles.
  - **By id, not name:** it and `isTemplateApprover` now take `roleIds` and compare fixed built-in ids (`services/roles/systemRoles.ts → SYSTEM_ROLE_IDS`). They no longer compare names.
- **`templateService.ts`:**
  - **`currentActor()`** is now async. At the moment of the action it reads the signed-in user's staff record and the role catalog, and maps role names to ids (`roleIdsForNames`). A role granted or renamed therefore works without signing in again.
  - **Drafting guard:** `saveDraft`, `submitForReview` and `deleteTemplate` throw `NOT_TEMPLATE_AUTHOR` for anyone else. `resubmitForReview` allows authors and approvers.
  - **New `canCurrentUserDraftTemplates()`:** the editor uses it to open read-only.
- **Tests:** `templatePublishingRules.test.ts` (+1) and `templateService.governance.test.ts` (+2):
  - a Template Author can draft but not approve, and a Template Approver can approve but not draft;
  - approval still works after a built-in role is renamed.

  `templateService.archive.test.ts` now signs in an admin before saving.

## Batch 425 — saving the template review settings needs a capability

`saveTemplateGovernanceWithAudit` checks `config:template-governance:manage` before storing anything, and returns `{ ok, settings }`. Without it, nothing is stored or audited. The capability is in the administration group, so Admin starts with it. Before Batch 425 anyone who could open Configuration could change these settings, including the Lab Director; a Lab Director now needs it granted in the Role Dictionary. The API server checks it again on its save endpoint (PS-345).

## Batch 428: Configuration permissions

Synoptic protocols: drafting, reviewing (approve, request changes, reset), publishing and retiring are capabilities (`config:protocol:draft` / `approve` / `publish` / `retire`), checked in `templateService.ts`. The rules (`templatePublishingRules.ts`) read the person's capabilities; the built-in roles decide only for an actor built without them. An app-level "admin" no longer stands in for the roles. Before, retiring a published protocol, requesting changes and resetting had no check.

## Batch 431: template review work

- `templateReviewWork.ts` (new) keeps a reviewer's trial answers and the comments on a template's questions (same keys as before). Production (PS-345): saved with the template version, visible to every reviewer.
- The reviewer page no longer keeps its own copy of a template's lifecycle state; the template service's status is the one record. So archive, restore and supersede no longer clear that copy (`clearReviewerStateOverride` removed). Old copies are removed at start-up (`services/browserCleanup/`).

## Batch 437 (PS-329)

- `aiSynthesisStatus.ts` decides the report header's AI badge ("Draft ready" / "Review pending"). Only Must Have fields count: fields the template marks required and that are shown with the answers so far. Pete (Oct 2): required counts as CAP Must Have for now.
  - An optional field below the threshold no longer trips the badge.
  - A field the template doesn't list still counts, the safe side, and so does every field until the template is known.
  - Before, any unreviewed field below the threshold tripped it.
- `fieldVisibility.ts`: `isVisible` moved here from `components/Config/Protocols/SynopticEditor.tsx`, which re-exports it, so services can use it without importing a component.
- Test: `aiSynthesisStatus.test.ts`.

## Batch 461: the results grid question (`partGrid.ts`)

A synoptic question type `partGrid` (Pete: "a results grid question"): one row per part of the case (core A, B, …) and fixed columns (dropdown or numeric). Each cell is an ordinary synoptic answer under `${fieldId}__${specimenId}__${columnId}`, so storage, merging (PS-71), audit and AI are unchanged; the question's own id holds no answer. Used by the PathScribe prostate needle-biopsy **Core results** question that draws the biopsy map.

- `partGridKey`, `isPartGridKey`, `partGridRowsOf(specimens)` (rows in label order), `partGridRowsFromAnswers` (when the parts aren't to hand), `partGridRowValues`, `partGridHasAnswer`.
- `synopticFieldAnswered(field, answers)`: whether any question counts as answered (progress counts, "next unanswered", sign-out statistics in `RightSynopticPanel`).
- `clearSynopticFieldAnswers(field, answers)`: removes a hidden question's answers, every cell for a grid.
- `partGridDisplay`: the grid as report text, a line per answered part with the option labels. (Known limit: the ": " and "; " between a column's label and its answer are written in, as `resolveAnswers` already joins choices with ", "; the labels themselves come from the template.)
- `synopticResultPayload.ts` (structured result): each answered grid cell is its own observation (`field_id` = the cell's key). `orchestrator/contextBuilder.ts` `resolveAnswers` now resolves a grid as one entry with this text (report preview, PDF, ORU^R01, LIS release, abnormal-trigger rules).
- Templates: the four PathScribe prostate templates gain the section **Anatomical map (PathScribe)** (`psmap_*` questions with real values). **The map's cancer data comes from the synoptic report**: a map is worked out from the synoptic answers every time it is drawn and stores nothing of its own.
- Tests: `services/organMapping/organMapConfigDraft.test.ts`.

## Batch 462: grid rows from the template

A results grid's rows are the case's parts unless the template gives its own (`rows`): `{ kind: 'numbered', count, label }` (r1…rN, "Focus 1"…, the breast foci) or `{ kind: 'fixed', heading, rows }` (one per oriented margin). `partGridRowsForField(field, parts)` picks them; `partGridRowHeading` names the row column; the synoptic panel, the report text, `resolveAnswers` and the structured result use them. Numeric grid cells don't take negative numbers on screen. The three breast templates gain "Anatomical map (PathScribe)": side, **Tumour foci**, **Margin distances**.

## Batch 463: the Mohs stage question (`mohsStages.ts`)

Field type `spatialStageCanvas` (the spec's SPATIAL_STAGE_CANVAS). The answers are ordinary synoptic answers under the question's id: `F__stages`, `F__s{n}__positive`, `F__s{n}__blocks`, `F__s{n}__time`, `F__s{n}__{sector}__block|histology|pni`. Every change is a pure function returning an answer patch (`undefined` removes a key), so the canvas and the checklist hold no state:
- `addMohsStage` (stamped HH:MM), `removeLastMohsStage`, `clearMohsStage`;
- `setMohsSector` / `toggleMohsSector`: positive → the default histology and no block (Batch 463b; superseded: the Batch 463 automatic letter in click order); negative → its details removed;
- `setMohsSectorDetail`, `setMohsStageDetail`, `applyAnswerPatch`;
- `mohsSectorToggleEvent` (the spec's SectorToggleEvent from a canvas click), `mohsShapePositive`;
- `mohsStagesDisplay` + `mohsReportWords`: the report text, a line per stage;
- `parseMohsVoiceCommand` / `mohsVoicePatch` / `mohsVoiceOutcome`: voice in en/fr/de/nl/ko; ambiguous commands (two clock positions, a clock position with "deep", "negative" without a sector) are not taken, and only the clear word clears a stage;
- `applyAnswerPatch` also takes a function of the answers, so quick successive changes build on each other;
- `mohsDefaultHistology`: the label of the answer to the question named by `defaultHistologyFieldId` (the tumour type), or for an "other" answer the free text shown for it.

`partGrid.ts`: a stage question counts as answered once a stage is added, and clearing it clears every stage key. `templateService.ts` registers PathScribe's "Mohs Micrographic Surgery" template. Tests: `mohsStages.test.ts`.

## Batch 463b

`mohsStages.ts`: no automatic block letter; `mohsBlockOptions` (A up to Blocks cut), `mohsBlockProblems` / `mohsStageBlockProblem` (unassigned or beyond Blocks cut), voice "block A" and `normaliseSpoken` (noon/midi/Mittag/midnight → 12; Korean number words → digits), `mohsHistologySourceProblem` / `mohsTemplateProblems` for the template editor. `partGrid.ts`: `synopticFieldComplete` (a Mohs question is incomplete while a block problem remains) and `synopticFieldMissing` (what stops sign-out: required and incomplete, or any Mohs block problem).

## Batch 465

`templateService.ts` registers PathScribe's **Oral Cavity Resection** (`oral_cavity_resection`) and **Neck Dissection** (`neck_dissection`) synoptics. Labs copy and customise them like any other.

## Batch 465b: counts and totals in a grid

Pete (Oct 6): nodes positive can't exceed nodes examined, and the neck's totals come from the levels grid.
- `partGrid.ts`:
  - Column property `notMoreThan` (another column of the row). `partGridCountProblems(field, answers, parts?)` reports a count above its limit, on the grid's own rows only. A grid with such a row is incomplete, and `synopticFieldMissing` stops sign-out, required or not.
  - Field property `sumOf: { fieldId, columnId, override? }`, with `partGridColumnTotal`, `sumOfTotal` and `sumFieldState`. The total is calculated once the grid has counts and is open while it has none; `override` means always entered by hand.
  - `computedSumPatch` and `sumMismatches`.
- `synopticEntryChecks.ts` (new): `findSynopticEntryChecks(caseData)` collects the blocking counts and the totals that differ from their grid, over the questions shown. `shownSynopticFields` lists the questions shown. `countBlockMessage` and `totalWarningsMessage` give the wording.

## Batch 466: whole-number node counts

Pete: negative or decimal node counts are refused. Grid column property `wholeNumber` and numeric field property `wholeNumber`. `notWholeCount`, `wholeNumberFieldProblem`, and `partGridCountProblems` kind `notWhole`. Such a value makes the question incomplete and stops the draft save and sign-out. `synopticEntryChecks.ts` reports it (kinds `notWhole` and `fieldNotWhole`) and checks a synoptic whenever it has a grid answer or a negative or decimal number.

## Batch 466b

- **`fieldVisibility.ts`:** conditions accept `notAnswerIds` (shown unless the answer is one of these) and `or`.
- **`partGrid.ts`:** a numeric question's `notMoreThan` (Pete: Max_Value_Ref) blocks the draft save and sign-out when exceeded.
- **`synopticEntryChecks.ts`:** checks every answered synoptic.
- **`templateCountRules.ts` (new):** the Synoptic Editor's count settings, covering number type, "can't exceed", value source, and grid column rules.

## Batch 466c

- `conditionEdits.ts` (new): pure edits behind the Synoptic Editor's condition picker. It builds "shown when <question> is <answer>", "shown unless <question> is <answer>" (`notAnswerIds`) and "or also when …" alternatives (`or`). `conditionTooComplex` marks what the picker can't show faithfully (several answers for one question, or an alternative that is itself an "unless" or has alternatives); only those stay read-only as "Custom condition". A single `answerIds` entry is read as the answer. `fieldVisibility.isVisible` ignores a condition still being built (`isConditionSet`: no question or no answer), so a half-built condition never hides its question for good.
- `templateCountRules.ts`: a third value source, `gridSumChecked`, entered by hand and checked against a grid's total (`sumOf.override: true`). Switching between the sources keeps the chosen grid and column.
- Tests: `conditionEdits.test.ts`.

## Batch 467 — In-house molecular orders

`molecularResultBinding.ts`: a choice question's `molecularResult` (the tests that answer it, and which answer a positive and a negative call mean). `decideHydration` answers an empty question and never overwrites a different answer (that becomes a delta the synoptic shows); `molecularResultDeltas` / `molecularFieldNotice` for the synoptic; editor helpers and `molecularBindingProblem`. Lung Adeno's EGFR mutation status is bound to EGFR mutation PCR.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

`molecularFieldNotice`'s accept value is a list for a checkbox question. A test now confirms that every bound template's binding is usable.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 505 (PS-475): seed templates load on demand

The 31 seed synoptic templates (about 420 KB of JSON) are no longer imported when `templateService.ts` loads. `SEED_TEMPLATE_LOADERS` maps each id to its file; `ensureSeedTemplate(id)` fetches a seed the first time it's needed, and every function that reads the editor store awaits it first (`getTemplate`, and submit / resubmit / publish through `assertMohsHistologySources`). A saved edit still wins: hydration puts it in the store first and a seed never overwrites an id that's there. A seed deleted this session isn't fetched again. `SEED_TEMPLATE_IDS` lists the ids. Test: `templateService.seeds.test.ts`.

## Batch 511 (PS-478): full strict type-checking

`publishTemplate` checks for the actor explicitly after `decidePublish`, which already refuses a missing one with the same `NOT_APPROVER` error.

## Batch 519 (PS-493, PS-494, PS-273)

- **`conditionEdits.ts` (PS-493):** a condition can name several answers (`answerIds`) or "unless" answers (`notAnswerIds`), per alternative. Only nested alternatives, or mixed answer keys, stay read-only (`conditionTooComplex`).
- **`nodeCountText.ts` (PS-494, new):** free-text node counts: `parseNodeCount` (exact, "at least N", "cannot be determined", in all five languages), `textNodeCountProblem`, `textNodeCountExceeds` (positive ≤ examined) and `nodeCountBelowSum` (Breast: total examined ≥ A + B + C). `partGrid.fieldCountProblem` uses them; `synopticEntryChecks.ts` reports `fieldNotCount` and `fieldBelowSum`. `templateCountRules.ts` gains `withNodeCount` and `withSumPartToggled` for the editor.
- **`normalizeSynopticTemplate.ts` (PS-273, new):** fills the shared model's required properties on content in the older Cytology shape; keeps everything else.
- **`narrativeAuthoring.ts` (PS-273, new):** when the editor shows the narrative settings (`authorsNarrative`), the clinical tiers, and `withNarrativeSentence` (a lab's sentence replaces PathScribe's translated one: the key is dropped, or it would win).
- **`templateService.ts`:** imports `EditorTemplate` as a type only.
- Tests: `nodeCountText.test.ts` (19, covering the seven templates), `conditionEdits.test.ts`.

## Batch 526

Test files here no longer set their own time limit below the suite's 60 s (`vitest.config.ts`); on a busy Windows machine those shorter limits caused false timeouts.

## Batch 579

- `templateReviewWork.ts`: `addTemplateQuestionComment` and `toggleTemplateQuestionComment` (save and audit a reviewer's comment; the comment thread only renders).
