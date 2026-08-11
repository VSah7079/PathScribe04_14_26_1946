# src/orchestrator/

The AI narrative-generation engine — "Layer 2" (context) and "Layer 3"
(generation) of what both files' own headers call "the Orchestrator
stack." Not a `services/`-style data-access folder; this is where a
case's raw data gets turned into a validated, AI-safe prompt context and
then actually streamed through an AI provider into the report editor.

**Pattern:** Two layered files, not the usual interface/mock/firestore
split — `contextBuilder.ts` (build a validated `StructuredContext` from
raw case data) feeds `orchestratorEngine.ts` (stream AI generation
per-section using that context). Neither is a CRUD service.

## Files

- **`contextBuilder.ts`** (670+ lines) — `buildContext(caseData,
  signingUser?, templateIdOverride?)` is the main export. Normalizes
  every raw `Case` field to an explicit `'(not recorded)'` sentinel
  rather than passing `null`/`undefined` into an AI prompt. Resolves
  synoptic answer IDs to human-readable labels per specimen (a case can
  have several synoptic report instances, one per specimen per assigned
  template — genuinely per-specimen, not a single case-level object).
  Routing/template resolution failures degrade to gold-standard plus a
  warning rather than hard-failing report generation — a real, deliberate
  design principle stated in this file's own header rules, not just this
  one function's behavior. No issues found; genuinely careful, exemplary
  error handling throughout (legacy-data fallback for pre-`synopticReports[]`
  cases, parallel per-instance resolution via `Promise.all` with
  per-instance failure isolation, a triple-layer routing/resolution
  degradation chain that only gives up and returns an empty narrative
  after both the routed template *and* gold-standard itself fail to
  resolve).

  **`getMarkersFromAnswers(rawAnswers, synopticTemplate)`** (added for the
  biomarker display work) — a separate, `resolveAnswers`-adjacent export,
  *not* part of `buildContext`'s AI-prompt path. Filters a template's
  resolved answers down to whichever fields belong to that template's own
  `biomarkers` section (if it has one), tagging each with a `markerGroup`
  (from the field's own `markerGroup` metadata, falling back to the
  field's label if untagged). Purely for the `MarkersPanel` display
  component in `SynopticReportPage`'s `LeftReportPanel` — template-driven
  and specimen-type-agnostic by construction, unlike the still-hardcoded,
  breast-only issue below. Does not feed `buildContext`/the AI prompt at
  all; that path is untouched and the deferred issue below still stands.
- **`orchestratorEngine.ts`** (476 lines) — `OrchestratorEngine` class:
  `run()` (full multi-section generation), `regenerateSection(id)`
  (single-section refresh), `cancel()`. Section-level isolation — one
  section erroring doesn't stop the rest of the run. Respects
  user-in-progress edits (a section the user has already started editing
  is skipped, not overwritten, when `writer.beginSection()` reports it
  can't safely start). Full `AIAuditLog` recording on every
  completion/error, for CAP/CLIA compliance. Supports headless mode (no
  Tiptap `Editor` instance — tokens delivered via `onToken` callback
  instead) as well as live-editor streaming. No issues found.

## Notes

- **Both files are unusually well self-documented** — each carries real,
  specific history in its own comments: `orchestratorEngine.ts` explains
  exactly why it now imports `StructuredContext` from `contextBuilder.ts`
  rather than a local, hand-duplicated copy (the old copy had already
  drifted — missing `narrativeTemplate` entirely, predating the
  `synoptic` β†’ `synoptics` per-specimen-array rename).
  `contextBuilder.ts` documents the retirement of
  `narrativeTemplateRegistry.ts` in favor of resolving every template
  (including gold-standard) through the same real Parts/Assembly path,
  with an explicit instruction not to reintroduce the old registry even
  as a fallback.
- **Related finding, not a new bug — confirms wider scope of an
  already-deferred item. Still open; not resolved by the newer,
  parallel `getMarkersFromAnswers` work above.**
  `DiagnosticContext.synoptic.biomarkers` (this file, `contextBuilder.ts`)
  has the same hardcoded, breast-cancer-specific four-field shape
  (`er`/`pr`/`her2`/`ki67`) discussed and deliberately deferred while
  reviewing `FullReportPage.tsx` earlier this session — meaning the
  AI-generated narrative for a lung, prostate, or any non-breast case is
  *also* missing whatever biomarkers are actually relevant to that
  specimen type (PD-L1, PSA, KRAS/EGFR, etc.), not just the report
  summary view. This is now confirmed to exist independently in at least
  three places: `mock/mockReports.ts`'s `FullReport`, `types/case/Case.ts`'s
  `DiagnosticMetadata`, and this file's own `DiagnosticContext`. Doesn't
  change the earlier decision to defer a proper fix — just documents the
  real, full scope for whenever that redesign happens, so it isn't
  rediscovered piecemeal a third time. Note: `getMarkersFromAnswers`
  (added same session, see above) solves the analogous *display-side*
  problem properly (template-driven, any specimen type) but is a fully
  separate code path from this hardcoded, AI-prompt-facing shape — the
  two should eventually converge on one real solution, but don't
  currently share any logic.

---
*See [src/README.md](../README.md) for how this folder fits the whole src/ layer, if that master index exists — check before assuming.*
*When this folder's contents change meaningfully, update THIS file.*
