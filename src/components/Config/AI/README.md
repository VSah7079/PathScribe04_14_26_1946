# components/Config/AI/

Admin-facing AI configuration: which provider/model PathScribe calls, and
the higher-level "AI Behavior" tab it lives inside (confidence thresholds,
orchestrator generation steps).

**Pattern:** `aiProviderConfig.ts` is the config/resolution layer (no React);
everything else is UI over it.

## Files

- **`aiProviderConfig.ts`** — Defines supported providers and per-provider
  model lists. 3-tier resolution: personal override (per person, through
  `services/userSettings/personalSettings.ts` since Batch 430; no screen sets
  it today) → org setting (lab settings store) → env default. API keys never live in the browser, in any
  build: every call goes through the `/api/ai/…` proxy routes (Batch 444
  removed the old `VITE_AI_DEV_MODE` direct-call path and the dev key field). **Real rename, this pass:** `AiProviderId`
  values (an internal type, never shown to users) are now named for their
  real request/response protocol shape rather than the vendor —
  `structured_messages` (Anthropic-shaped), `chat_completions` (OpenAI-
  shaped), `chat_completions_managed` (same shape, deployment-routed),
  `model_gateway` (multi-model hosting platform), `structured_content`
  (Gemini-shaped) — plus `mock`/`custom`, unchanged since they were already
  vendor-neutral. Deliberate decision: internal code (this type, function/
  class names, file names) is protocol-shape-named; the admin config UI
  (`AiProviderSettings.tsx`) and `PROVIDER_MODELS`' labels still show real
  vendor/model names, since an admin picking a provider needs to know
  which real account/contract they're configuring. `structured_content`
  (Gemini) was added as a formal, selectable provider in the same pass
  that introduced this renaming — previously used elsewhere in the app
  (`services/aiIntegration/PathScribeAIService.ts`'s real, working
  `callAi()`-based implementation) but never actually selectable here.
  Matches the real, already-configured proxy route in `vite.config.ts`.
- **`AiProviderSettings.tsx`** — Admin config UI (`isAdmin=true`) and dev
  override UI (`isAdmin=false`), same component. Has a defensive fallback
  to `'structured_messages'` if a stored `providerId` is no longer a
  recognised key (e.g. after a host migration corrupts localStorage) —
  displays as "Anthropic (Claude)" per `PROVIDER_LABELS`, real vendor name
  shown even though the underlying type value is protocol-shape-named.
- **`orchestratorModeConfig.ts`** (+ `orchestratorModeConfig.test.ts`) —
  **NEW (July 2026).** Real source of
  truth for "is AI Orchestrator narrative auto-draft on." Two layers,
  same null-means-inherit convention as `Facility.tatFirstTouchHours`/
  `jurisdiction`: an org-wide default (persisted, admin-editable here) and
  a per-facility override (`Facility.internalAiOrchestratorEnabled`,
  resolved via `resolvePerformingLabFacilityId()`,
  `services/facilities/IFacilityService.ts`). Replaces two previously
  disconnected, non-functional mechanisms — see its own header and Notes
  below.
- **`OrchestratorConfigSection.tsx`** — AI-generation step config, reframed
  from the old "Narrative Templates" tab (confirmed dead, deleted — see
  Notes). **FIXED this pass:** the ON/OFF badge used to read a static
  `orchestratorEnabled: true` literal directly off `narrativeTemplateConfig`
  — now a real, clickable admin toggle backed by `orchestratorModeConfig.ts`,
  with an explanatory note that internal facilities (labs) can override it
  individually in Facility Configuration.
- **`index.tsx`** — `AITab`, the top-level AI Behavior tab. Mounts
  `AiProviderSettings`, `OrchestratorConfigSection`, and (via prop)
  `ModelsPanel`. Uses the shared `useIsAdmin()` from `AuthContext` (its
  old local copy that read `localStorage` directly is gone).
- **`resolveClientAiModel.ts`** — which AI model a performing lab's work
  is drafted with (org default, or the lab's `internalAiModelId` override)
  and the hard block on setting an override without a passing validation
  study. Used by `FacilityDictionary/FacilityEditorModal.tsx` and
  `services/cases/mockCaseService.ts`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): `index.tsx` no longer reads `localStorage` for the admin check; the personal override is per person, not localStorage; `resolveClientAiModel.ts` added to this list.*
- **`resolveVoiceAiModel.ts`** — **NEW.** Voice-specific mirror of
  `resolveClientAiModel.ts`'s hard-block philosophy: `hasPassingValidationForVoiceModel()`
  is the real gate, `resolveVoiceAiConfig()` turns the resolved model into
  the literal `{providerId, modelId}` `callAi()` needs. Deliberately
  simpler than the report-model version — org-wide default only, no
  per-client override layer, since voice is a genuinely deployment-wide
  setting (`Config/System/VoiceSection.tsx`'s own words), not resolved
  per ordering-client the way a case's report-generation model is.
  **`canBecomeDefault(model)` (Batch 320, PS-58):** the Models tab's Set
  Default gate, moved out of the component. A voice model needs a passing
  study, since becoming the default is when it goes live. A report model
  is always allowed, because its gate is the per-facility override.

## Notes

- **RESOLVED (was "needs verification"):** confirmed via full-repo grep —
  `NarrativeTemplatesTab` (the old tab component) had zero importers
  anywhere in `src/`. Deleted it, along with its two sole consumers
  `SectionList.tsx`/`SectionEditor.tsx`. `narrativeTemplateConfig.ts` (the
  data) stays — still real, still consumed by `orchestratorEngine.ts` and
  this folder's `OrchestratorConfigSection.tsx`.
- **Real bug found and fixed in the same pass:** the only code that ever
  *wrote* the orchestrator-mode localStorage key lived inside that dead
  tab — meaning there was previously no live way for anyone to actually
  toggle Orchestrator Mode, despite two separate mechanisms appearing to
  read one. See `orchestratorModeConfig.ts`'s header for the full history.
- Model IDs in `PROVIDER_MODELS.structured_messages` match the `.env`/
  `AIProviderRegistry.ts` fix already made (`claude-sonnet-4-6` present).
- **Vendor names removed from internal code, this pass:** per a direct
  request, `AiProviderId` values, function/class names, and two file names
  (`ClaudeProvider.ts` → `services/ai/providers/StructuredMessagesProvider.ts`,
  and a test file) across this folder and `services/aiIntegration/`,
  `services/ai/` were renamed from vendor names to protocol-shape names.
  Deliberately NOT applied to: the admin UI's displayed labels/model names
  (functionally necessary for an admin to know which real account they're
  configuring), the NavBar "System Info" diagnostic panel's displayed
  labels (same reasoning — real vendor identity matters for support/
  troubleshooting), the config search index's synonyms (admins search for
  the real vendor name), or comments explaining real, documented vendor
  API behavior.

## Batch 428: Configuration permissions

- `AiProviderSettings.tsx`: the lab-wide save goes through `services/aiConfig/saveAiSettings.ts` (`config:ai-provider:manage`); a person's own override is unchanged.
- `OrchestratorConfigSection.tsx`: the default mode toggle changes only when the save is allowed.
- AI feature switches and the default model are checked in their services (`config:ai-behavior:manage`, `config:ai-model:manage`).

## Batch 429: view-only sections, equipment log for the bench

The AI tab is view only without any of the three AI capabilities. The Orchestration panel's expand buttons are marked `data-config-nav`.

## Batch 430: personal settings per person; view-only fields

`aiProviderConfig.ts`: the personal provider override is kept per person (`services/userSettings/personalSettings.ts`). Correction: no screen sets it today (the AI tab shows provider settings to administrators only, and they save the lab-wide setting), so Batch 429's note that view-only blocked it was wrong.

## Batch 431

The lab's AI provider settings (`aiProviderConfig.ts`) and the orchestrator default (`orchestratorModeConfig.ts`) are kept in the lab settings store.

## Batch 437

AI Provider Settings reports unsaved changes (PS-128). Fixed: on opening, the form replaced the saved model with the provider's first model before anyone touched it.

## Batch 444

- `aiProviderConfig.ts`: `apiKey`, `VITE_AI_API_KEY`, `VITE_AI_DEV_MODE` and `isDevMode()` are removed. A personal override saved before this batch that still holds a key has it dropped from storage when it's next read.
- `AiProviderSettings.tsx`: the "Dev API Key" field and the "Dev mode — direct API calls" flag are removed, along with their locale keys and CSS.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way.
- **Model labels:** `aiProviderConfig.ts` keeps each model's name literal and translates its qualifier through one template key, for example "{{model}} (recommended)". Test: `aiProviderConfig.modelLabels.test.ts`.
- **Provider help notes:** translated.
- **Provider names:** "Mock" and "Custom endpoint" are translated; vendor names stay as they are.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

`OrchestratorConfigSection`: the on/off switch now sits beside the collapse button instead of inside it (a control inside a button can't be reached), and is a real `<button role="switch">`. The collapse button says whether it is open (`aria-expanded`).

## Batch 536 (PS-558)

- `AiVendorPolicySection.tsx` (new, in the AI Behavior tab): the AI vendor policy per served jurisdiction and per facility; whether the service in use is allowed there; edit, add a facility rule, remove. Changes go through `aiVendorPolicyService` (`config:ai-vendor-policy:manage`).
- `AiProviderSettings.tsx`: a **Hosting region** field for every service but Bedrock (whose region field stays) and the demonstration mode; an inline warning before saving a service a served jurisdiction doesn't allow. The connection test passes its feature.
- `aiProviderConfig.ts`: `hostingRegion` on the config (and `VITE_AI_HOSTING_REGION`), `aiHostingRegion()`, and the vendor labels (`AI_PROVIDER_LABELS`, `aiProviderLabel`) moved here from `AiProviderSettings.tsx`.

## Batch 547

Deployment settings here are read through `appEnv()` (`services/runtimeConfig/`): the deployment's `config.json` at start-up, else the build's `VITE_*` value (`docs/architecture/RUNTIME_CONFIG.md`).

## Batch 548

Loading text here now uses `components/Common/LoadingState.tsx`: nothing for 300 ms, a placeholder, then "still working" from 3 s.

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- `HostingRegionsCard.tsx` (Batch 557, new): "Where PathScribe keeps data", the database and file storage regions (from the server's `/api/config`) beside the AI region, shown in `AiProviderSettings.tsx`. Read only.

## Batch 609 (#173)

`resolveClientAiModel.ts`: `resolveAiConfigOverrideForClient` passes the model's `maxTokens` override to the call; `resolveConfidenceThresholdForClient` gives the model's own confidence threshold, else the organisation's. Tests: `resolveClientAiModel.overrides.test.ts`.
