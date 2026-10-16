# services/marginExtraction/

## Batch 490 — Margin-distance extraction layer (Pete's rule-condition spec for margin-distance thresholds)

The first of three pieces of the margin-distance rule-condition spec: "Regex / Token Extraction Layer... Normalized Shadow Attributes... Explicit Fallback/Review Flags." Scans a workup's free-text margin-distance fields (any `type: 'text'` template field whose id ends in `_mm`/`_cm` — the project's own existing naming convention, e.g. `distance_to_crm_mm`, `distance_to_closest_margin_cm`), extracts a normalized numeric distance in millimetres when the text confidently supports one, and otherwise opens a review-queue exception instead of guessing.

**Pattern:** pure parser + standard interface/mock pattern, same shape as `services/tumorBoard/` — `IMarginExtractionService` / `mockMarginExtractionService`, `storageGet`/`storageSet` via `services/mockStorage.ts` (`margin_shadow_attributes`, `margin_extraction_exceptions`).

- `marginDistanceExtraction.ts` — the pure extraction logic (`extractMarginDistanceMm`, `isMarginDistanceTextField`, `unitForMarginDistanceField`). No I/O; fully unit-tested directly (`marginDistanceExtraction.test.ts`), per CLAUDE.md rule 2.
- `IMarginExtractionService.ts` — the interface and types (`MarginShadowAttribute`, `MarginExtractionException`).
- `mockMarginExtractionService.ts` / `mockMarginExtractionService.test.ts` — the mock implementation.

**What counts as confident** (see `marginDistanceExtraction.ts`'s own file header for the full rules): an explicit unit in the text ("2mm", "0.5 cm", "<1 mm") read exactly, converted to mm — unless substantive text surrounds the number (flagged rather than guessed at); or a bare number with no unit, read using the field's own `_mm`/`_cm` suffix. Anything else — no numeric token at all, or a number embedded in prose this parser doesn't trust — is not confident.

**Shadow attributes, not visible report data:** a confident parse becomes a `MarginShadowAttribute` — a normalized, hidden numeric value alongside the pathologist's own free-text answer, never shown or editable in the report itself. This is what the later rule evaluator (Batch 491) reads instead of parsing free text on its own.

**Exception/review queue:** an unconfident parse opens a `MarginExtractionException` (`status: 'Pending'`). `resolveException()` lets a human manually tag the real distance (becomes the shadow attribute); `dismissException()` closes it with no numeric tag (e.g. the field genuinely has no distance to give) and a `dismissReason`. Both are protected — `case:margin-exception:resolve`, seeded only to the grossing roles (Pathologist, Fellow, Resident, PA), same reasoning as `case:tumor-board:flag`: tagging what a pathologist's free text means clinically is a judgment call, not every case-access role's to make.

**Upsert, not accumulation:** re-running `extractAndStore()` for the same `(caseId, instanceId, fieldId)` — e.g. the pathologist edits the answer before signing — replaces any prior shadow attribute and clears any prior *pending* exception for that exact field, rather than piling up duplicates.

**Deliberately out of scope for this batch (disclosed, not a gap in the extraction layer itself):**
- **No call site wires this in yet.** Nothing in the save/sign-out flow calls `extractAndStore()` — that integration, plus the rule evaluator that actually reads the shadow attributes, is Batch 491's explicit scope ("the rule evaluator wired at sign-out"), per Pete's own sequencing.
- **No review-queue screen.** There's no UI yet to see or act on a case's `Pending` exceptions beyond calling the service directly — building that screen (plus its i18n, capability-gated actions, and a tile if it needs one) is deferred to when Batch 491 wires the rule evaluator and the pathologist-facing workflow around it.

## Batch 491 — both gaps above closed

- **Wired at sign-out:** `services/tumorBoardRules/runMarginRuleEvaluation.ts` calls `extractAndStore()` over every synoptic instance on the case from `useSignOutWorkflow.ts`'s `finalizeSignOut`, fire-and-forget alongside the existing `applySurgicalPostSignOutQa` call, then evaluates the Tumor Board auto-flagging rules against the stored shadow attributes. See `services/tumorBoardRules/README.md`.
- **Review-queue screen built:** `pages/MarginExceptionReviewPage.tsx` (`/margin-exception-review`, in the Pathology Workspace hub) lists every `Pending` exception with its case, field, and raw text, and lets a pathologist/fellow/resident/PA tag the real distance (Resolve) or close it with a reason (Dismiss) — both the existing `case:margin-exception:resolve` capability. New screen capability `screen:margin-exception-review:open`, same seeding.
- **Also fixed:** `mockMarginExtractionService` was never exported from the services barrel (`services/index.ts`) since this folder's first batch — meaning no UI code could reach it without violating CLAUDE.md rule 4. Fixed now that it has real callers.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
