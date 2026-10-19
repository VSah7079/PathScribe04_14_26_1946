**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/templateSuggestions/

AI-driven synoptic template suggestion — 'which diagnostic template fits this specimen' — split OUT of services/templates/ in July 2026 for consistency with how services/grossing/ is organized.

**Pattern:** Standard interface/mock pattern.

## Files

- **`ISynopticTemplateSuggestionService.ts / synopticTemplateSuggestionService.ts`** — The suggestion engine itself, real AI-backed logic via aiIntegration/aiProviderService.
- **`ITemplateSuggestionSignalService.ts / mockTemplateSuggestionSignalService.ts`** — Captures suggestion-accuracy signals for future tuning.

## Notes

- Its own code explicitly self-describes as 'the diagnostic-template analog of IGrossingEvaluationService' — which is why it now lives in its own folder, matching that precedent, instead of being bundled inside templates/ (library management) as it originally was.


## Batch 536 (PS-558)

`synopticTemplateSuggestionService.ts` passes its feature and facility to `callAi`, for the jurisdiction's AI vendor policy.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 616 (part E) — server version

API-server version of `TemplateSuggestionSignal` (`httpTemplateSuggestionSignalService.ts`, contract `TEMPLATE_SIGNALS_API.md`), picked by `templateSuggestionSignalServiceInstance.ts` (and the others beside it) when an API address is configured; the mock stays the default in the demo. See `docs/architecture/HTTP_SERVICES_PATTERN.md`.
