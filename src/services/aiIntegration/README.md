# services/aiIntegration/

Higher-level AI integration: transcript refinement, macro suggestions, synoptic field suggestions, spell-checking, narrative generation. Routes through services/ai/'s provider abstraction underneath.

**Pattern:** Not a simple interface/mock pair — see notes.

## Files

- **`aiProviderService.ts`** — The REAL, live, multi-provider callAi() function everything actually calls through. Provider builders/parsers are named for their real request/response protocol shape (`structured_messages`, `chat_completions`, `chat_completions_managed`, `model_gateway`, `structured_content`) rather than the vendor, matching `AiProviderId` in `aiProviderConfig.ts` — a deliberate internal-naming decision; the admin config UI still shows real vendor/model names. **Real addition:** Gemini/Google added as a formal, selectable provider (`structured_content`, matching the real, already-configured proxy route in `vite.config.ts` — `/api/ai/gemini/generate?model=...`, deliberately avoiding constructing the colon-bearing `:generateContent` URL client-side, same reasoning as that proxy config's own comment). Previously Gemini was used elsewhere in this app but wasn't a selectable option in the shared provider config at all — now it is, alongside the other five. Tests in `aiProviderService.structuredContent.test.ts` (renamed from `.gemini.test.ts`) — request shape, multi-part response parsing, error handling.
- **`IAIIntegrationService.ts`** — Interface. IMPORTANT: its own comment documents that evaluateSynopticAssignment is NOT the live runtime path for that specific method — the real implementation is a plain function in services/cases/mockCaseService.ts. Types from this file ARE genuinely used (type-only) elsewhere.
- **`PathScribeAIService.ts`** — (class renamed from `GeminiAIIntegrationService` — the old name is gone entirely now, not just aliased, since nothing outside this file ever referenced it directly) Provider-agnostic, not Gemini-specific. Genuinely live: refineTranscript, suggestMacros, suggestSynopticFields, generateNarrative, checkSpelling (locale-aware en-GB/en-US) are all real, working methods, routed through `callAi()`. evaluateSynopticAssignment is a deliberate no-op stub on this class (see IAIIntegrationService.ts note).
- **`MockAIIntegrationService.ts`** — Thoughtfully designed mock — deliberately returns empty results for evaluateSynopticAssignment to avoid conflicting with the 'Sim Microscopic' dev button's own fake data. **Confirmed genuinely, fully unused** (not just unconfirmed) during a direct orphaned-code audit — zero real imports anywhere, only comment references. `PathScribeAIService` (the real implementation of the same interface) is what's actually instantiated for the one real consumer (`OrchestratorSectionEditor.tsx`'s spell-check) — this mock was never adopted for that feature, likely because `aiProviderService.ts`'s own `mock` provider mode already covers the "no real API calls" use case at a lower level. Left in place rather than deleted — genuine potential value for future testing without live API access, but flagging clearly that it's currently dead code, not a hidden dependency.

## Notes

- RENAMED July 2026: GeminiAIIntegrationService.ts -> PathScribeAIService.ts (class name itself was left unchanged; only the file/export alias situation was cleaned up).
- PathScribe_LLM_Engineer_Brief.docx also lives in this folder — reference document for AI integration work, not code.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*