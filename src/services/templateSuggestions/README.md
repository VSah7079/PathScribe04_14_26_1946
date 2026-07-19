# services/templateSuggestions/

AI-driven synoptic template suggestion — 'which diagnostic template fits this specimen' — split OUT of services/templates/ in July 2026 for consistency with how services/grossing/ is organized.

**Pattern:** Standard interface/mock pattern.

## Files

- **`ISynopticTemplateSuggestionService.ts / synopticTemplateSuggestionService.ts`** — The suggestion engine itself, real AI-backed logic via aiIntegration/aiProviderService.
- **`ITemplateSuggestionSignalService.ts / mockTemplateSuggestionSignalService.ts`** — Captures suggestion-accuracy signals for future tuning.

## Notes

- Its own code explicitly self-describes as 'the diagnostic-template analog of IGrossingEvaluationService' — which is why it now lives in its own folder, matching that precedent, instead of being bundled inside templates/ (library management) as it originally was.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*