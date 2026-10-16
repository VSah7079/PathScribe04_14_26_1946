// src/services/aiIntegration/aiProviderService.ts
// ─────────────────────────────────────────────────────────────
// Unified AI completion layer for PathScribe.
//
// All providers route through the Vite dev proxy in development,
// and through your backend proxy in production. This avoids CORS
// issues — Anthropic blocks direct browser-to-API calls entirely.
//
// Proxy config lives in vite.config.ts → server.proxy.
//
// Batch 536 (PS-558): every call is checked against the AI vendor policy of
// the jurisdiction the work belongs to before it is sent (aiCallPolicy.ts),
// and recorded in the AI audit log with its service, model and hosting
// region. A refused call throws AiNotAvailableError.
//
// Provider builders/parsers below are named for their real request/
// response protocol shape (structured_messages, chat_completions,
// model_gateway, structured_content) rather than the vendor, matching
// this codebase's naming convention for internal AI-provider code. The
// admin configuration UI (AiProviderSettings.tsx) still shows real
// vendor/model names, since that's what an admin actually needs to see
// to configure a real integration.
// ─────────────────────────────────────────────────────────────

import {
  resolveAiConfig,
  aiHostingRegion,
  type AiProviderConfig,
  type AiProviderId,
} from '@/components/Config/AI/aiProviderConfig';
import { checkAiCall, defaultAiCallPolicyDeps, recordAiCall, type AiCallContext, type AiCallPolicyDeps } from './aiCallPolicy';

export interface AiCallOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  configOverride?: Partial<AiProviderConfig>;
  /** Batch 536 (PS-558): what the call is for and where the work belongs
   *  (the case or facility, for its jurisdiction's AI vendor policy). Without
   *  it, the laboratory's own jurisdiction applies. Never sent to the AI. */
  context?: AiCallContext;
  /** Tests only: the policy dependencies. */
  policyDeps?: AiCallPolicyDeps;
}

export interface AiCallResult {
  text: string;
  provider: AiProviderId;
  model: string;
}

// ─── Provider-specific request builders ──────────────────────

function buildStructuredMessagesRequest(cfg: AiProviderConfig, opts: AiCallOptions): { url: string; headers: Record<string, string>; body: object } {
  // Anthropic blocks direct browser→API calls with CORS.
  // Always route through the Vite proxy → vite.config.ts injects x-api-key server-side.
  return {
    url: '/api/ai/anthropic/v1/messages',
    headers: { 'Content-Type': 'application/json' },
    body: {
      model:      cfg.modelId,
      max_tokens: opts.maxTokens ?? cfg.maxTokens ?? 1000,
      system:     opts.system,
      messages:   [{ role: 'user', content: opts.prompt }],
    },
  };
}

function buildChatCompletionsRequest(cfg: AiProviderConfig, opts: AiCallOptions): { url: string; headers: Record<string, string>; body: object } {
  return {
    url: '/api/ai/openai/v1/chat/completions',
    headers: { 'Content-Type': 'application/json' },
    body: {
      model:      cfg.modelId,
      max_tokens: opts.maxTokens ?? cfg.maxTokens ?? 1000,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user',   content: opts.prompt },
      ],
    },
  };
}

function buildChatCompletionsManagedRequest(cfg: AiProviderConfig, opts: AiCallOptions): { url: string; headers: Record<string, string>; body: object } {
  // Batch 444: always through the proxy, which holds the endpoint,
  // deployment and key. The browser never calls the resource directly.
  return {
    url: `${cfg.proxyUrl ?? '/api/ai'}/azure/chat/completions`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      max_tokens: opts.maxTokens ?? cfg.maxTokens ?? 1000,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user',   content: opts.prompt },
      ],
    },
  };
}

function buildModelGatewayRequest(cfg: AiProviderConfig, opts: AiCallOptions): { url: string; headers: Record<string, string>; body: object } {
  return {
    url: `${cfg.proxyUrl}/bedrock/invoke`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      modelId:   cfg.modelId,
      region:    cfg.gatewayRegion ?? 'us-east-1',
      maxTokens: opts.maxTokens ?? cfg.maxTokens ?? 1000,
      system:    opts.system,
      prompt:    opts.prompt,
    },
  };
}

function buildCustomRequest(cfg: AiProviderConfig, opts: AiCallOptions): { url: string; headers: Record<string, string>; body: object } {
  // Batch 444: always through the proxy, which holds the endpoint and key.
  return {
    url: `${cfg.proxyUrl ?? '/api/ai'}/custom/chat/completions`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      model:      cfg.modelId,
      max_tokens: opts.maxTokens ?? cfg.maxTokens ?? 1000,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user',   content: opts.prompt },
      ],
    },
  };
}

function buildStructuredContentRequest(cfg: AiProviderConfig, opts: AiCallOptions): { url: string; headers: Record<string, string>; body: object } {
  // Matches the real, already-configured proxy route in vite.config.ts:
  // client calls /api/ai/gemini/generate?model=..., which the proxy
  // rewrites server-side to Google's real
  // /v1beta/models/{model}:generateContent endpoint with the API key
  // injected - deliberately NOT constructing the colon-bearing URL here,
  // same reasoning as that proxy config's own comment (it confuses
  // Vite's proxy router if built client-side).
  // Batch 444: always through the proxy; the key is added server-side.
  return {
    url: `${cfg.proxyUrl ?? '/api/ai'}/gemini/generate?model=${encodeURIComponent(cfg.modelId)}`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
      systemInstruction: { parts: [{ text: opts.system }] },
      generationConfig: { maxOutputTokens: opts.maxTokens ?? cfg.maxTokens ?? 1000 },
    },
  };
}

// ─── Response parsers ─────────────────────────────────────────

function parseStructuredMessagesResponse(data: any): string {
  return (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
}

function parseChatCompletionsResponse(data: any): string {
  return data.choices?.[0]?.message?.content ?? '';
}

const parseChatCompletionsManagedResponse = parseChatCompletionsResponse;
const parseCustomResponse                 = parseChatCompletionsResponse;

function parseModelGatewayResponse(data: any): string {
  if (data.content) return parseStructuredMessagesResponse(data);
  if (data.output?.message?.content?.[0]?.text) return data.output.message.content[0].text;
  return data.generation ?? data.results?.[0]?.outputText ?? '';
}

function parseStructuredContentResponse(data: any): string {
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p.text ?? '')
    .join('');
}

// ─── Main entry point ─────────────────────────────────────────

export async function callAi(opts: AiCallOptions): Promise<AiCallResult> {
  const cfg: AiProviderConfig = {
    ...resolveAiConfig(),
    ...opts.configOverride,
  };

  let request: { url: string; headers: Record<string, string>; body: object };
  let parseResponse: (data: any) => string;
  // Batch 536: the service the request actually goes to (the fallback below
  // sends an unknown or 'mock' setting to structured_messages), which is what
  // the vendor policy checks and the audit log records.
  let sentTo: AiProviderId = cfg.providerId;

  switch (cfg.providerId) {
    case 'structured_messages':
      request       = buildStructuredMessagesRequest(cfg, opts);
      parseResponse = parseStructuredMessagesResponse;
      break;
    case 'chat_completions':
      request       = buildChatCompletionsRequest(cfg, opts);
      parseResponse = parseChatCompletionsResponse;
      break;
    case 'chat_completions_managed':
      request       = buildChatCompletionsManagedRequest(cfg, opts);
      parseResponse = parseChatCompletionsManagedResponse;
      break;
    case 'model_gateway':
      request       = buildModelGatewayRequest(cfg, opts);
      parseResponse = parseModelGatewayResponse;
      break;
    case 'structured_content':
      request       = buildStructuredContentRequest(cfg, opts);
      parseResponse = parseStructuredContentResponse;
      break;
    case 'custom':
      request       = buildCustomRequest(cfg, opts);
      parseResponse = parseCustomResponse;
      break;
    default:
      // Real, deliberate defense-in-depth alongside resolveAiConfig()'s
      // own validation (aiProviderConfig.ts) — that fix catches an
      // invalid providerId from the two localStorage config layers,
      // but a configOverride (e.g. resolveAiConfigOverrideForClient,
      // built from a saved AI model record's own requestFormat) is
      // merged in AFTER that validation runs, so an invalid value from
      // THAT source would still reach here untouched. This is the one
      // place every possible source funnels through before a request
      // actually gets built, so it's the right final backstop: warn
      // and fail safe to a known-good default, rather than a hard
      // throw that breaks the entire feature the moment any layer,
      // present or future, holds a bad value.
      console.warn(`[PathScribe AI] Unknown provider '${(cfg as any).providerId}' — falling back to structured_messages.`);
      request       = buildStructuredMessagesRequest({ ...cfg, providerId: 'structured_messages' }, opts);
      parseResponse = parseStructuredMessagesResponse;
      sentTo        = 'structured_messages';
  }

  // Batch 536 (PS-558): the jurisdiction's AI vendor policy, before anything
  // is sent. A refusal throws AiNotAvailableError; there is no fallback to
  // another service.
  const policyDeps = opts.policyDeps ?? defaultAiCallPolicyDeps;
  const target = { providerId: sentTo, modelId: cfg.modelId, region: aiHostingRegion({ ...cfg, providerId: sentTo }) };
  const where = await checkAiCall(target, opts.context, policyDeps);
  const started = Date.now();

  try {
    const response = await fetch(request.url, {
      method:  'POST',
      headers: request.headers,
      body:    JSON.stringify(request.body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `[PathScribe AI] ${cfg.providerId} returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
    }

    const data = await response.json();
    const text = parseResponse(data);
    recordAiCall(target, opts.context, where, { status: 'completed', latencyMs: Date.now() - started, text }, policyDeps);
    return { text, provider: sentTo, model: cfg.modelId };
  } catch (e) {
    recordAiCall(target, opts.context, where, { status: 'error', latencyMs: Date.now() - started, error: e instanceof Error ? e.message : String(e) }, policyDeps);
    throw e;
  }
}
