// src/components/Config/AI/aiProviderConfig.ts
// ─────────────────────────────────────────────────────────────
// Defines which AI providers PathScribe supports and how to
// resolve the active config at runtime.
//
// Priority order (highest wins):
//   1. User-level override (the signed-in person's, dev/testing only; Batch 430)
//   2. Org-level setting   (fetched from your admin API / Firestore)
//   3. Environment variable defaults (set at deploy time)
//
// Keys NEVER live in the browser, in any build (Batch 444). The
// browser calls the proxy routes under /api/ai, which add the key
// server-side: vite.config.ts in development, the PathScribe API
// server in production (docs/architecture/AI_PROXY.md).
// ─────────────────────────────────────────────────────────────

import { clearPersonalSetting, getPersonalSetting, setPersonalSetting } from '../../../services/userSettings/personalSettings';
import { readLabSetting, saveLabSetting } from '../../../services/labSettings/labSettingsStore';
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';

export type AiProviderId =
  | 'structured_messages'     // Anthropic-shaped: system as a separate field, SSE content_block_delta streaming
  | 'chat_completions'        // OpenAI-shaped: messages array with system role, /chat/completions
  | 'chat_completions_managed'// Same body shape as chat_completions, deployment-name + resource-endpoint routing
  | 'model_gateway'           // Multi-model hosting platform: region + modelId routing, wraps multiple underlying formats
  | 'structured_content'      // Gemini-shaped: contents/parts array, separate systemInstruction field
  | 'mock'        // Demo / offline testing — no API calls
  | 'custom';

// ─── Per-provider model options ───────────────────────────────
// Shown in the admin configuration dropdown (AiProviderSettings.tsx).
// `model` is the real vendor/model name and stays literal in every
// language: an admin picking a model needs to know which real model their
// account/contract covers. Batch 513 (PS-269): a qualifier such as
// "(recommended)" is UI text, so it comes from `labelKey`, an i18n template
// that wraps the literal name as {{model}} (see modelOptionLabel below).
// Only the AiProviderId keys above (an internal type, never shown to users)
// are protocol-shape-named.

export interface AiModelOption {
  id: string;
  /** Literal vendor/model name. */
  model: string;
  /** i18n template key with a {{model}} placeholder; omitted = the name alone. */
  labelKey?: string;
}

const RECOMMENDED = 'aiProviderSettings.modelOption.recommended';
const HIGHEST_ACCURACY = 'aiProviderSettings.modelOption.highestAccuracy';
const FASTEST = 'aiProviderSettings.modelOption.fastest';
const VIA_BEDROCK = 'aiProviderSettings.modelOption.viaBedrock';

export const PROVIDER_MODELS: Record<AiProviderId, AiModelOption[]> = {
  structured_messages: [
    { id: 'claude-sonnet-4-6', model: 'Claude Sonnet 4', labelKey: RECOMMENDED },
    { id: 'claude-opus-4-8',   model: 'Claude Opus 4', labelKey: HIGHEST_ACCURACY },
    { id: 'claude-haiku-4-5',  model: 'Claude Haiku 4.5', labelKey: FASTEST },
  ],
  chat_completions: [
    { id: 'gpt-4o',        model: 'GPT-4o', labelKey: RECOMMENDED },
    { id: 'gpt-4-turbo',   model: 'GPT-4 Turbo' },
    { id: 'gpt-4',         model: 'GPT-4' },
  ],
  chat_completions_managed: [
    { id: 'gpt-4o',      model: 'GPT-4o (Azure)' },
    { id: 'gpt-4-turbo', model: 'GPT-4 Turbo (Azure)' },
  ],
  model_gateway: [
    { id: 'anthropic.claude-sonnet-4-6-v1:0', model: 'Claude Sonnet 4', labelKey: VIA_BEDROCK },
    { id: 'anthropic.claude-opus-4-8-v1:0',   model: 'Claude Opus 4', labelKey: VIA_BEDROCK },
    { id: 'amazon.nova-pro-v1:0',             model: 'Amazon Nova Pro' },
  ],
  structured_content: [
    { id: 'gemini-1.5-flash', model: 'Gemini 1.5 Flash', labelKey: RECOMMENDED },
    { id: 'gemini-1.5-pro',   model: 'Gemini 1.5 Pro', labelKey: HIGHEST_ACCURACY },
  ],
  mock: [
    { id: 'mock-v1', model: 'Mock', labelKey: 'aiProviderSettings.modelOption.mockDemo' },
  ],
  custom: [
    { id: 'custom', model: 'Custom', labelKey: 'aiProviderSettings.modelOption.custom' },
  ],
};

/** The dropdown text for a model option: the literal name, wrapped in its
 *  translated qualifier template when it has one. */
export function modelOptionLabel(option: AiModelOption, t: (key: string, values: { model: string }) => string): string {
  return option.labelKey ? t(option.labelKey, { model: option.model }) : option.model;
}

// ─── Config shape ─────────────────────────────────────────────

export interface AiProviderConfig {
  /** Which provider to use */
  providerId: AiProviderId;

  /** Model ID — must be valid for the chosen provider */
  modelId: string;

  /**
   * Only for chat_completions_managed: your deployment name.
   * e.g. 'my-gpt4-deployment'
   */
  managedDeploymentName?: string;

  /**
   * Only for chat_completions_managed: your resource endpoint.
   * e.g. 'https://my-org.openai.azure.com'
   */
  managedEndpoint?: string;

  /**
   * Only for model_gateway: hosting region.
   * e.g. 'us-east-1'
   */
  gatewayRegion?: string;

  /**
   * Batch 536 (PS-558): where the service runs, as the vendor names it
   * (e.g. 'eu-west-1', 'uksouth', 'europe-west4'), for every service except
   * model_gateway, whose region is gatewayRegion. Checked against the
   * jurisdiction's AI vendor policy and recorded with every call.
   */
  hostingRegion?: string;

  /**
   * Only for custom: full base URL of the OpenAI-compatible endpoint.
   * e.g. 'https://my-llm.hospital.internal/v1'
   */
  customEndpoint?: string;

  /**
   * In production, all AI calls are routed through your backend proxy
   * so the real API key never reaches the browser.
   * Set VITE_AI_PROXY_URL to your proxy base, e.g. '/api/ai'
   */
  proxyUrl?: string;

  /** Max tokens for completions (default 1000) */
  maxTokens?: number;
}

// ─── Environment-variable defaults ───────────────────────────
// Set these in your .env / deployment config.
// VITE_ prefix makes them available to the Vite build.
//
//   VITE_AI_PROVIDER=structured_messages   # structured_messages | chat_completions | chat_completions_managed | model_gateway | structured_content | mock | custom
//   VITE_AI_MODEL=claude-sonnet-4-6
//   VITE_AI_PROXY_URL=/api/ai
//   (keys: AI_API_KEY, GEMINI_API_KEY, … with NO VITE_ prefix; read
//    only by the proxy. See docs/architecture/AI_PROXY.md.)
//   VITE_AI_MANAGED_ENDPOINT=https://...
//   VITE_AI_MANAGED_DEPLOYMENT=...
//   VITE_AI_GATEWAY_REGION=us-east-1
//   VITE_AI_HOSTING_REGION=eu-west-1        # Batch 536: the region of the other services
//   VITE_AI_CUSTOM_ENDPOINT=https://...

function envDefaults(): AiProviderConfig {
  const providerId = (appEnv().VITE_AI_PROVIDER ?? 'structured_messages') as AiProviderId;

  return {
    providerId,
    modelId:              appEnv().VITE_AI_MODEL ?? PROVIDER_MODELS[providerId]?.[0]?.id ?? 'claude-sonnet-4-6',
    proxyUrl:             appEnv().VITE_AI_PROXY_URL ?? '/api/ai',
    managedDeploymentName:appEnv().VITE_AI_MANAGED_DEPLOYMENT,
    managedEndpoint:      appEnv().VITE_AI_MANAGED_ENDPOINT,
    gatewayRegion:        appEnv().VITE_AI_GATEWAY_REGION ?? 'us-east-1',
    ...(appEnv().VITE_AI_HOSTING_REGION ? { hostingRegion: appEnv().VITE_AI_HOSTING_REGION } : {}),
    customEndpoint:       appEnv().VITE_AI_CUSTOM_ENDPOINT,
    maxTokens:            Number(appEnv().VITE_AI_MAX_TOKENS ?? 1000),
  };
}

// ─── Org-level config (loaded from your admin API / Firestore) ─
// Shape of the document stored in your org settings collection.
export interface OrgAiConfig {
  providerId: AiProviderId;
  modelId: string;
  managedDeploymentName?: string;
  managedEndpoint?: string;
  gatewayRegion?: string;
  hostingRegion?: string;
  customEndpoint?: string;
  maxTokens?: number;
  // Note: API keys are NEVER stored here — they live in your backend secrets manager
}

// ─── Storage keys ─────────────────────────────────────────────
const USER_OVERRIDE_KEY = 'pathscribe_ai_user_config';
const ORG_CONFIG_KEY    = 'pathscribe_ai_org_config';   // populated by your auth/org bootstrap

// ─── Config resolution ────────────────────────────────────────

/**
 * The full, real set of request-shape identifiers callAi() knows how
 * to build a request for — kept as one, single source of truth so
 * this list and AiProviderSettings.tsx's own PROVIDER_MODELS keys
 * can't quietly drift apart.
 */
const VALID_PROVIDER_IDS: readonly AiProviderId[] = [
  'structured_messages', 'chat_completions', 'chat_completions_managed',
  'model_gateway', 'structured_content', 'mock', 'custom',
];

/**
 * Returns the active AI provider config, respecting the priority chain:
 *   user override > org config > env defaults
 *
 * Call this wherever you need to make an AI request.
 */
export function resolveAiConfig(): AiProviderConfig {
  const base = envDefaults();

  // Layer 2: the lab's AI settings (Configuration → AI Behavior, saved by
  // services/aiConfig/saveAiSettings.ts). Batch 431: kept in the lab settings
  // store, so every workstation uses the same provider (PS-345: the server).
  const org = readLabSetting<OrgAiConfig | null>(ORG_CONFIG_KEY, null);
  if (org && typeof org === 'object') Object.assign(base, org);

  // Layer 1: user override (dev/testing only)
  try {
    // Batch 430: the override is the signed-in person's, not the browser's.
    const user = getPersonalSetting<Partial<AiProviderConfig> | null>(USER_OVERRIDE_KEY, null);
    if (user) {
      // Batch 444: an override saved before keys left the browser may still
      // hold one. It's never used; drop it from storage too.
      const { apiKey, ...rest } = user as Partial<AiProviderConfig> & { apiKey?: string };
      if (apiKey !== undefined) setPersonalSetting(USER_OVERRIDE_KEY, rest);
      Object.assign(base, rest);
    }
  } catch { /* corrupt storage — fall through */ }

  // Real fix, per direct report: "⚠ [PathScribe AI] Unknown provider:
  // anthropic." Confirmed directly: AiProviderSettings.tsx (the admin
  // settings SCREEN) already had a guard for exactly this — an
  // unrecognized stored providerId, falling back to
  // 'structured_messages' — but that guard only ever applied to the
  // settings screen's own DISPLAY. This function is the one callAi()
  // actually calls, and it had no equivalent validation at all — a
  // stale or invalid providerId sitting in either saved layer
  // (org or user override) would sail through here untouched, so the
  // settings screen could look completely fine (self-healing on
  // display) while every real AI call still hit the hard error the
  // moment it tried to build a request. Same fallback, same reasoning,
  // now applied to the actual call path, not just the screen that
  // shows it.
  if (!VALID_PROVIDER_IDS.includes(base.providerId)) {
    console.warn(`[PathScribe AI] Stored providerId '${base.providerId}' isn't a real request-shape identifier — falling back to structured_messages. Check Configuration → AI Behavior.`);
    base.providerId = 'structured_messages';
  }

  return base;
}

/**
 * Saves a user-level override config.
 * Intended for dev/QA use — admins should configure at org level.
 */
export function setUserAiConfig(config: Partial<AiProviderConfig>): void {
  setPersonalSetting(USER_OVERRIDE_KEY, config);
}

/**
 * Saves the org-level config fetched from your backend after login.
 * Call this from your auth bootstrap / org context provider.
 */
export function setOrgAiConfig(config: OrgAiConfig): void {
  saveLabSetting(ORG_CONFIG_KEY, config);
}

/**
 * Clears the user-level override, reverting to org/env defaults.
 */
export function clearUserAiConfig(): void {
  clearPersonalSetting(USER_OVERRIDE_KEY);
}

/**
 * Batch 536 (PS-558): the hosting region a call goes to, or undefined when
 * it isn't recorded. model_gateway routes by its own region field; the
 * others use hostingRegion. Pure.
 */
export function aiHostingRegion(cfg: Pick<AiProviderConfig, 'providerId' | 'gatewayRegion' | 'hostingRegion'>): string | undefined {
  const region = cfg.providerId === 'model_gateway' ? cfg.gatewayRegion : cfg.hostingRegion;
  return region?.trim() ? region.trim() : undefined;
}

// Batch 513 (PS-269): vendor names stay literal in every language (an admin
// needs them verbatim to identify the real account/contract, the same way
// CAP/RCPath/SNOMED CT stay literal); the two non-vendor choices are UI text
// and come from the locale files. Batch 536: moved here from
// AiProviderSettings.tsx so the AI vendor policy screen names them the same way.
export type AiProviderLabel = { name: string } | { labelKey: string };
export const AI_PROVIDER_LABELS: Record<AiProviderId, AiProviderLabel> = {
  structured_messages:      { name: 'Anthropic (Claude)' },
  chat_completions:         { name: 'OpenAI (GPT-4)' },
  chat_completions_managed: { name: 'Azure OpenAI' },
  model_gateway:            { name: 'AWS Bedrock' },
  structured_content:       { name: 'Google (Gemini)' },
  mock:                     { labelKey: 'aiProviderSettings.providerName.mock' },
  custom:                   { labelKey: 'aiProviderSettings.providerName.custom' },
};

/** The name to show for a service. */
export function aiProviderLabel(id: AiProviderId, t: (key: string) => string): string {
  const label = AI_PROVIDER_LABELS[id];
  if (!label) return id;
  return 'name' in label ? label.name : t(label.labelKey);
}
