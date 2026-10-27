# services/historyExtraction

Batch 621. AI extraction of historical reports: when a historical case is opened in the patient history, the AI reads its Final Diagnosis and Microscopic text and fills in the synoptic fields it can. The result is **metadata beside the case, for the pathologist to look at. Advisory only**: labelled "AI-extracted, not verified", never read by reports, printing, registries, billing, rules or exports. Contract: `docs/architecture/HISTORY_AI_EXTRACTION_API.md`.

| File | What it does |
|---|---|
| `historyExtraction.ts` | Types, the settings rules (OFF by default, enterprise with facility override), the source text hash, the cache test. Pure |
| `extractHistoricalSynoptic.ts` | The runner: choose a template, fill its fields (shared prompt `aiIntegration/synopticFieldsPrompt.ts`), through `callAi` so the PS-558 vendor policy applies. Cached by hash. Never throws; a failure is a recorded `failed` extraction with a fixed code. Dependencies are injected |
| `runHistoryExtraction.ts` | The open/refresh flow: setting on, `ai:history-extraction:run` held, stored extraction reused, otherwise run, save, audit (no patient text) |
| `historyExtractionRuntime.ts` | The real dependencies, and `flagHistoryExtractionWrong` |
| `IHistoryExtractionService.ts`, `mockHistoryExtractionService.ts`, `httpHistoryExtractionService.ts` | Stored extractions, "flag as wrong", accuracy counts |
| `IHistoryExtractionSettingsService.ts`, mock, http | The on/off setting (`config:history-extraction:manage`) |
| `historyExtractionServiceInstance.ts` | `historyExtractionService` and `historyExtractionSettingsService` (exported from `@/services`) |
| `advisoryOnly.guard.test.ts` | Fails if any module outside the extraction and display code imports this folder, uses its storage keys, or if a case/report type carries an extraction |

Not built: extraction when an Assist-mode LIS summary arrives (`patientHistory/ensureHistoryFetchStarted.ts`): it is a system action with no user to authorise it.

## Batch 651
`cleanFields` now calls `aiIntegration/aiSuggestionRules.checkSuggestedAnswer` (the minimum confidence 30 and the listed-options rule, unchanged in effect; a 0 to 1 confidence is now read as a percent).
