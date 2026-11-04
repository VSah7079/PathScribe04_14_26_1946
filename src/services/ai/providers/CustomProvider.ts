// src/services/ai/providers/CustomProvider.ts
// ─────────────────────────────────────────────────────────────────────────────
// Self-hosted / custom OpenAI-compatible implementation of IAIProvider —
// same request/response shape as ChatCompletionsProvider, since a "custom"
// endpoint is explicitly required to be OpenAI-compatible by this app's
// own design (see AiProviderSettings.tsx's endpoint-config help text).
//
// Real fix: this provider previously fell back to MockProvider with a
// console warning whenever selected.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IAIProvider,
  AIGenerationRequest,
  AIGenerationResult,
  AIStreamCallback,
  AIConnectionTest,
} from '../IAIProvider';
import { streamOpenAiStyleResponse, parseOpenAiStyleError } from './openAiStyleStreaming';

const DEFAULT_MAX_TOKENS = 1024;

const DEFAULT_SYSTEM =
  'You are a board-certified pathologist assistant generating structured ' +
  'pathology report sections. Never invent clinical findings. Use formal ' +
  'medical prose. Generate only the requested section — no headers, no preamble.';

export class CustomProvider implements IAIProvider {
  readonly providerId   = 'custom';
  readonly modelId:     string;
  readonly displayName: string;

  // Batch 444: always through the proxy, which holds the endpoint and its
  // key (vite.config.ts in development, the API server in production).
  constructor(modelId: string, _customEndpoint?: string) {
    this.modelId     = modelId;
    this.displayName = `Custom endpoint · ${modelId}`;
  }

  private buildRequest(): { url: string; headers: Record<string, string> } {
    return { url: '/api/ai/custom/chat/completions', headers: { 'Content-Type': 'application/json' } };
  }

  async generate(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const startMs  = Date.now();
    const tokens:string[] = [];

    const streamResult = await this.generateStream(
      request,
      token => tokens.push(token),
    );

    return {
      ...streamResult,
      text:      tokens.join(''),
      latencyMs: Date.now() - startMs,
    };
  }

  async generateStream(
    request: AIGenerationRequest,
    onToken: AIStreamCallback,
  ): Promise<AIGenerationResult> {
    const startMs = Date.now();
    const { url, headers } = this.buildRequest();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal: request.abortSignal,
      body:   JSON.stringify({
        model:      this.modelId,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        stream:     true,
        messages: [
          { role: 'system', content: request.system || DEFAULT_SYSTEM },
          { role: 'user',   content: request.prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(await parseOpenAiStyleError(response));
    }

    return streamOpenAiStyleResponse(response, this.providerId, this.modelId, startMs, onToken);
  }

  async testConnection(): Promise<AIConnectionTest> {
    const startMs = Date.now();
    try {
      const { url, headers } = this.buildRequest();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body:   JSON.stringify({
          model:      this.modelId,
          max_tokens: 10,
          messages:   [{ role: 'user', content: 'Reply with: OK' }],
        }),
      });

      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}`, latencyMs: Date.now() - startMs };
      }

      return { ok: true, message: `Connected to ${this.modelId}`, latencyMs: Date.now() - startMs };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Unknown error', latencyMs: Date.now() - startMs };
    }
  }
}
