# services/aiIntegration/

Higher-level AI integration: transcript refinement, macro suggestions, synoptic field suggestions, spell-checking, narrative generation. Routes through services/ai/'s provider abstraction underneath.

**Pattern:** Not a simple interface/mock pair — see notes.

## Files

- **`aiProviderService.ts`** — The REAL, live, multi-provider callAi() function everything actually calls through.
- **`IAIIntegrationService.ts`** — Interface. IMPORTANT: its own comment documents that evaluateSynopticAssignment is NOT the live runtime path for that specific method — the real implementation is a plain function in services/cases/mockCaseService.ts. Types from this file ARE genuinely used (type-only) elsewhere.
- **`PathScribeAIService.ts`** — (renamed from GeminiAIIntegrationService.ts) — despite the old name, this is provider-agnostic now, not Gemini-specific. Genuinely live: refineTranscript, suggestMacros, suggestSynopticFields, generateNarrative, checkSpelling (locale-aware en-GB/en-US) are all real, working methods. evaluateSynopticAssignment is a deliberate no-op stub on this class (see IAIIntegrationService.ts note).
- **`MockAIIntegrationService.ts`** — Thoughtfully designed mock — deliberately returns empty results for evaluateSynopticAssignment to avoid conflicting with the 'Sim Microscopic' dev button's own fake data. UNCONFIRMED whether still instantiated anywhere as of this writing — aiProviderService.ts has its own dev-mode handling now, possible this predates that.

## Notes

- RENAMED July 2026: GeminiAIIntegrationService.ts -> PathScribeAIService.ts (class name itself was left unchanged; only the file/export alias situation was cleaned up).
- PathScribe_LLM_Engineer_Brief.docx also lives in this folder — reference document for AI integration work, not code.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*