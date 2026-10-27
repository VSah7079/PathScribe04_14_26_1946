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

## Batch 617 (part B): server version (PS-514)

The margin extraction service now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/EQUIPMENT_MIGRATION_API.md`.

## Batch 669 — Resolve / Dismiss audited, rules re-run, history listed (findings ws-16, ws-17)

- `reviewMarginException.ts` (+ test): `resolveMarginExceptionWithFollowUp` / `dismissMarginExceptionWithFollowUp`. After the service's own `case:margin-exception:resolve` check passes, each writes one audit entry (`Margin exception resolved` / `Margin exception dismissed`: literal English; who, when, case, item id, field, the original reason in plain English, and the value or the dismiss reason; the typed text is never written), then runs `runMarginRuleEvaluation` again for the case so a recorded margin flags it at once. Neither a rule-check failure nor an audit failure undoes the decision; both are returned (`ruleCheck.status = 'failed'`, `auditWritten = false`) and the screen says so. Also here: `partitionMarginExceptions` (pending vs decided, newest decision first) and `marginOutcomeNotices` (the inline messages).
- `defaultReviewMarginExceptionDeps.ts`: the real services behind it (same case facility and template-field lookups as the sign-out run).
- `mockMarginExtractionService.extractAndStore` now leaves a field alone when a person already decided that exact text (Resolved or Dismissed). Without this, re-running the rules would have replaced the human-recorded number with nothing and reopened the item. Edited text is read afresh.
- The API-server version (`httpMarginExtractionService`) is unchanged; the audit entry written here goes to the app's audit service in either case.
- Still open (ruled out of scope): Resolve records an exact number only (no "less than" / "greater than"); the reason `empty` ("No answer given yet") is unreachable because an empty answer is skipped, not flagged. No undo (not required).
