# components/Config/AI/

Admin-facing AI configuration: which provider/model PathScribe calls, and
the higher-level "AI Behavior" tab it lives inside (confidence thresholds,
orchestrator generation steps).

**Pattern:** `aiProviderConfig.ts` is the config/resolution layer (no React);
everything else is UI over it.

## Files

- **`aiProviderConfig.ts`** — Defines supported providers (anthropic/openai/
  azure_openai/aws_bedrock/mock/custom) and per-provider model lists.
  3-tier resolution: user override (localStorage, dev-only) → org setting →
  env default. API keys never live in the browser in production — routed
  through `/api/ai-proxy`; only populated locally when
  `VITE_AI_DEV_MODE=true`.
- **`AiProviderSettings.tsx`** — Admin config UI (`isAdmin=true`) and dev
  override UI (`isAdmin=false`), same component. Has a defensive fallback
  to `'anthropic'` if a stored `providerId` is no longer a recognised key
  (e.g. after a host migration corrupts localStorage).
- **`orchestratorModeConfig.ts`** — **NEW (July 2026).** Real source of
  truth for "is AI Orchestrator narrative auto-draft on." Two layers,
  same null-means-inherit convention as `Client.tatFirstTouchHours`/
  `jurisdiction`: an org-wide default (persisted, admin-editable here) and
  a per-internal-client override (`Client.internalAiOrchestratorEnabled`,
  resolved via `resolvePerformingLabClientId()`). Replaces two previously
  disconnected, non-functional mechanisms — see its own header and Notes
  below.
- **`OrchestratorConfigSection.tsx`** — AI-generation step config, reframed
  from the old "Narrative Templates" tab (confirmed dead, deleted — see
  Notes). **FIXED this pass:** the ON/OFF badge used to read a static
  `orchestratorEnabled: true` literal directly off `narrativeTemplateConfig`
  — now a real, clickable admin toggle backed by `orchestratorModeConfig.ts`,
  with an explanatory note that internal clients (labs) can override it
  individually in the Client Dictionary.
- **`index.tsx`** — `AITab`, the top-level AI Behavior tab. Mounts
  `AiProviderSettings`, `OrchestratorConfigSection`, and (via prop)
  `ModelsPanel`. Own `useIsAdmin()` reads role directly from
  `localStorage['pathscribe_current_user']` rather than `useAuth()`/
  `AuthContext` (used elsewhere, e.g. `TemplateRenderer.tsx`) — not
  necessarily wrong, but an inconsistency worth knowing about if this file
  is touched again.

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
- Model IDs in `PROVIDER_MODELS.anthropic` match the `.env`/
  `AIProviderRegistry.ts` fix already made (`claude-sonnet-4-6` present).

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
