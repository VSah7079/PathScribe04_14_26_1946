# src/orchestrator

The report orchestrator: builds the AI context for a report (contextBuilder) and generates, regenerates and assembles report sections (orchestratorEngine).

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-317, PS-318)

New tests: `contextBuilder.prelimOverride.test.ts` (a template without a Preliminary section on a not-yet-final case gives a warning) and `orchestratorEngine.perSpecimenRegen.test.ts` (regenerating a per-specimen Gross Description gives a clear message instead of failing silently).

## Batch 461

`contextBuilder.ts` `resolveAnswers(answers, template, gridRows?)`: a results grid question (`partGrid`) is resolved as one entry whose text is a line per answered part (`partGridDisplay`). Without the parts, rows are named by their stored ids. Callers with the case pass `partGridRowsOf(caseData.specimens)`.

## Batch 463

`contextBuilder.ts` (`resolveAnswers`): a Mohs stage question's answer is its report text, a line per stage (`mohsStagesDisplay`), in the report's language (`resolveAllSpecimenSynoptics` passes the facility's report translation).

## Batch 466b

`contextBuilder.ts` `resolveAnswers`: a question hidden by its visibility condition (or its section's) is left out of the report even if an answer is stored. Pete: a partial nephrectomy's report has no renal vein or ureter margin lines.

## Batch 536 (PS-558)

`orchestratorEngine.ts`: the default provider is `AIProviderRegistry.getActive({ feature: 'narrative', caseId })`, so each section's generation is checked against the case's jurisdiction's AI vendor policy first.
