**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/aiIntegration/

Higher-level AI integration: transcript refinement, macro suggestions, synoptic field suggestions, narrative generation. (The AI spelling check was retired in Batch 338; see below.) Routes through services/ai/'s provider abstraction underneath.

**Pattern:** Not a simple interface/mock pair — see notes.

## Files

- **`aiProviderService.ts`** — The REAL, live, multi-provider callAi() function everything actually calls through. Provider builders/parsers are named for their real request/response protocol shape (`structured_messages`, `chat_completions`, `chat_completions_managed`, `model_gateway`, `structured_content`) rather than the vendor, matching `AiProviderId` in `aiProviderConfig.ts` — a deliberate internal-naming decision; the admin config UI still shows real vendor/model names. **Real addition:** Gemini/Google added as a formal, selectable provider (`structured_content`, matching the real, already-configured proxy route in `vite.config.ts` — `/api/ai/gemini/generate?model=...`, deliberately avoiding constructing the colon-bearing `:generateContent` URL client-side, same reasoning as that proxy config's own comment). Previously Gemini was used elsewhere in this app but wasn't a selectable option in the shared provider config at all — now it is, alongside the other five. Tests in `aiProviderService.structuredContent.test.ts` (renamed from `.gemini.test.ts`) — request shape, multi-part response parsing, error handling.
- **`IAIIntegrationService.ts`** — Interface. IMPORTANT: its own comment documents that evaluateSynopticAssignment is NOT the live runtime path for that specific method — the real implementation is a plain function in services/cases/mockCaseService.ts. Types from this file ARE genuinely used (type-only) elsewhere.
- **`PathScribeAIService.ts`** — (class renamed from `GeminiAIIntegrationService` — the old name is gone entirely now, not just aliased, since nothing outside this file ever referenced it directly) Provider-agnostic, not Gemini-specific. Genuinely live: refineTranscript, suggestMacros, suggestSynopticFields, generateNarrative are all real, working methods, routed through `callAi()`. evaluateSynopticAssignment is a deliberate no-op stub on this class (see IAIIntegrationService.ts note).

## Result shape (Batch 348, PS-67)

Every method here now returns `ServiceResult` from `services/types.ts` (`{ ok: true, data }` or `{ ok: false, error }`), like the rest of the app. The older `{ success, data, error }` type (`types/serviceResult.ts`) is deleted. Callers check `result.ok === false` (explicit comparison, because `strictNullChecks` is off).

## Notes

- RENAMED July 2026: GeminiAIIntegrationService.ts -> PathScribeAIService.ts (class name itself was left unchanged; only the file/export alias situation was cleaned up).
- PathScribe_LLM_Engineer_Brief.docx also lives in this folder — reference document for AI integration work, not code.

## Batch 338 (PS-342): AI spelling check retired

`PathScribeAIService.checkSpelling` and its `SpellingFlag` / `SpellCheckResult` types are removed (Pete, Sep 26: "Retire it"). Spelling is now checked as the pathologist types, by the dictionary engine in `services/spellcheck/`, in the case's own language. `OrchestratorSectionEditor.tsx` no longer creates a `PathScribeAIService` at all.

**Still open, disclosed:** `refineTranscript` (dictation clean-up) chooses its spelling the same way the retired check did: British English only when the jurisdiction's spelling locale starts with `en-GB`, American English otherwise. Australian, Canadian and non-English jurisdictions therefore get American spelling in dictation clean-up. Not changed here.

## Batch 444

- `aiProviderService.ts`: the managed, custom and Gemini request builders always use the proxy (`{proxyUrl}/azure/chat/completions`, `/custom/chat/completions`, `/gemini/generate?model=`). The direct-to-vendor branches, which sent `api-key` / `Authorization` from the browser or put the Gemini key in the URL, are removed.
- `aiProxyStatus.ts` (new): `checkAiProxyStatus()` asks `GET /api/ai/anthropic/v1/models` and `GET /api/ai/gemini/models` whether they answer. It replaces the top bar's System Info check, which called api.anthropic.com from the browser with `VITE_AI_API_KEY`.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-105, PS-131, PS-275)

`PathScribeAIService.test.ts`: every finding-detection request carries the negation instruction; narrative generation from synoptic answers. **Open:** negation is prompt-only; a negated finding the model wrongly returns still reaches the Critical Findings modal. *(Since closed: Batch 452 added a code-side check, `services/clinical/negatedFindingCheck.ts`, that drops a flag whose term is negated in its source text — checked in the Batch 496 README audit.)*

## Batch 451 — screen-level test evidence for Priority 2 tickets

`aiReportTools.ts`: which AI tool buttons the report page shows (PS-274, PS-275).


## Batch 536 (PS-558): AI vendor policy per jurisdiction

- `aiVendorPolicy.ts` (pure): the rules (allowed services by request shape, allowed hosting regions per service; a facility rule narrows its jurisdiction's), `aiVendorDecision`, `aiVendorConflicts` (the warning before saving a service), `aiVendorScopeStatuses`, rule problems, normalising, the audit text.
- `aiVendorPolicyService.ts` / `mockAiVendorPolicyService.ts`: list, save and remove (`config:ai-vendor-policy:manage`, audited `AI_VENDOR_POLICY_CHANGED`), `rulesForCheck` (system read), `served` (the lab's and every facility's jurisdiction). Storage: `pathscribe_ai_vendor_policy` (mockStorage).
- `aiCallPolicy.ts`: the check before every call. Where the work belongs (jurisdiction given, else the case's or facility's, else the lab's own); a refusal throws `AiNotAvailableError` (`AI_VENDOR_NOT_ALLOWED`), is recorded as `refused` in the AI audit log and audited `AI_CALL_REFUSED`; `recordAiCall` logs every call with service, model, hosting region, jurisdiction and feature.
- `aiProviderService.callAi`: takes `context` (the feature, and the case or facility) and checks before `fetch`. It checks the service the request actually goes to (an unknown or `mock` setting is sent to `structured_messages`, as before), and never falls back to another service.
- `PathScribeAIService`: each call passes its feature and facility.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 609 (#173, #177)

`callAi` treats a model's `maxTokens` override as a ceiling on output length. `refineTranscript` builds its instructions with `services/voice/dictationRefinementPrompt.ts` (Australian and Canadian spelling were American before). Tests: `aiProviderService.maxTokens.test.ts`.

## Batch 616 (part E) — server version

API-server version of `AiVendorPolicy` (`httpAiVendorPolicyService.ts`, contract `AI_VENDOR_POLICY_API.md`), picked by `aiVendorPolicyServiceInstance.ts` (and the others beside it) when an API address is configured; the mock stays the default in the demo. See `docs/architecture/HTTP_SERVICES_PATTERN.md`.
