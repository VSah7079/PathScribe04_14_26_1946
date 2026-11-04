# services/tumorBoardRules/

## Batch 491 — Hybrid Inheritance Model for Tumor Board auto-flagging rules (PS-359 follow-up)

Pete's confirmed design: a two-tier (enterprise → facility) auto-flagging rule config, mirroring the existing `resolveEffectiveCorrelationRule` pattern in `services/cytology/cytologyHistologyCorrelationWindow.ts` — but deliberately only two tiers (no jurisdiction tier), since Pete's own recommendation only asked for an org-wide baseline plus a per-facility override.

**Deliberate scope narrowing (disclosed, not a silent gap):** the only concretely automatable auto-flagging criterion in this codebase today is a margin-distance threshold, fed by `services/marginExtraction/`'s shadow attributes (Batch 490). Diagnosis/biomarker-combination criteria (Pete's own worked example) and "operational routing"/"scheduling parameters" facility overrides have no structured data to attach to yet — out of scope for this batch, not dropped.

- `ITumorBoardRuleService.ts` — the interface and types. `TumorBoardAutoFlagRule { id, board, label, marginThresholdMm, active }`; `DEFAULT_TUMOR_BOARD_RULES` — 4 fixed rules, one per `TumorBoardName` (`margin-breast-mdt`, `margin-gi-mdt`, `margin-thoracic-mdm`, `margin-gyn-onc`), each `marginThresholdMm: 1, active: true`. `FacilityTumorBoardRuleOverride { id, facilityId, ruleId, marginThresholdMm?, active?, updatedAt }` — either field, or both, or neither overridden per facility+rule.
- `mockTumorBoardRuleService.ts` — the mock implementation. Storage keys `tumor_board_auto_flag_rules` / `facility_tumor_board_rule_overrides`. `loadRules()` always reconciles stored rules against `DEFAULT_TUMOR_BOARD_RULES` (a fixed set — an admin edits a rule's threshold/active flag, never adds or removes a rule, same reasoning as `TUMOR_BOARD_NAMES` itself being fixed). Both exports wrapped in `guardConfigWrites` with `config:tumor-board-rules:manage`.
- `tumorBoardRuleEvaluation.ts` — pure. `resolveEffectiveTumorBoardRules(enterpriseRules, facilityOverrides)` merges the two tiers into `EffectiveTumorBoardRule[]`; `buildMarginTriggerReason(attribute, rule)` builds the audit-trail string shown on a Tumor Board row (e.g. "Margin: Distance to closest margin 0.6mm (threshold < 1mm)"); `evaluateMarginRules(attributes, rules)` returns every rule a case's margin attributes trip (strict `<` comparison; inactive rules skipped).
- `runMarginRuleEvaluation.ts` — the impure orchestrator, called from `useSignOutWorkflow.ts` at sign-out. Runs `marginExtractionService.extractAndStore()` over every synoptic instance on the case, resolves the effective rules for the case's facility, evaluates matches, and — if any match and no listing is already active for the case — calls `tumorBoardService.create()` with `source: 'Rule'` and `triggerReason` from the first match. Dependency-injected (`getTemplateFields`), same testability convention as `saveParticipationTypeWithAudit`.

**Capability:** `config:tumor-board-rules:manage` (new) gates both the enterprise-baseline and facility-override writes. See `docs/architecture/AUTHORIZATION_API.md`.

**UI:** `components/Config/System/TumorBoardRulesSection.tsx` (Config → System → Tumor Board Auto-Flag Rules) — enterprise-baseline card (per-rule editable threshold/active) and facility-overrides card (add/list/remove per facility+rule override).

**No bypass needed for the rule evaluator's `create()` call:** see `services/tumorBoard/README.md`'s own Batch 491 entry — GROSSERS (the only roles with `case:tumor-board:flag`) are exactly who signs out a surgical case, so the existing gate naturally passes for the signing pathologist.

## Batch 494 — the batching cut-off setting (PS-359 follow-up — MDT Self-Service Assignment & Batching redesign)

New `TumorBoardBatchSettings { cutoffHours }` (`DEFAULT_TUMOR_BOARD_BATCH_SETTINGS = { cutoffHours: 48 }`) and `ITumorBoardBatchSettingsService { get(), update() }` in `ITumorBoardRuleService.ts`; implemented as `mockTumorBoardBatchSettingsService` in `mockTumorBoardRuleService.ts` (storage key `tumor_board_batch_settings`, wrapped in the same `guardConfigWrites`/`config:tumor-board-rules:manage` as the rules above). `services/tumorBoard/tumorBoardBatchLock.ts`'s own `isTumorBoardBatchLocked()` is the pure function that actually uses this value to decide whether a board+date session is locked.

**Scope decision, disclosed:** this is ONE enterprise-wide number, unlike the margin-threshold rules above, which are genuinely two-tier (enterprise baseline + per-facility override). A board's own meeting doesn't vary by which external facility referred a given case in — there's no real sense in which "when is Thursday's Breast MDT locked" should depend on the referring hospital — so a per-facility override was deliberately not built here.

**UI:** a new "Batching cut-off" card on `components/Config/System/TumorBoardRulesSection.tsx`, between the enterprise-baseline and facility-overrides cards — a single hours input + Save, same dirty-draft pattern as the per-rule threshold inputs above.

**Disclosed-and-fixed while validating this batch (CLAUDE.md rule 6):** the new `tumorBoardBatchSettings.test.ts` was first written with no `@vitest-environment` pragma. This service's persistence goes through real `localStorage` (`services/mockStorage.ts`), which silently no-ops under plain Node — `update()` still returned the right value (computed in-memory before the write), masking a `persistBatchSettings()` that never actually landed, so only a same-test `get()` afterwards exposed it. Fixed by adding `// @vitest-environment happy-dom`.

- `ITumorBoardRuleService.ts` — `TumorBoardBatchSettings`, `DEFAULT_TUMOR_BOARD_BATCH_SETTINGS`, `ITumorBoardBatchSettingsService`.
- `mockTumorBoardRuleService.ts` — `mockTumorBoardBatchSettingsService` and its load/persist/validate helpers.
- `tumorBoardBatchSettings.test.ts` — new.

## Batch 610 (#71)

Diagnosis and biomarker criteria rules (`criteriaRuleValidation.ts`, `criteriaRuleEvaluation.ts`, `mockTumorBoardCriteriaRuleService`): a rule of up to 6 criteria lists a signed case for its board when every criterion matches. Facility overrides can now change the board. `runMarginRuleEvaluation` runs both rule kinds.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part C): server versions (PS-514)

The tumor board rule, facility override, batch settings and criteria rule services here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/TUMOR_BOARD_API.md`. The mocks are unchanged.
