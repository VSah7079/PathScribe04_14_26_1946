// src/services/ai/providers/ChatCompletionsManagedProvider.ts
// ─────────────────────────────────────────────────────────────────────────────
// Azure OpenAI implementation of IAIProvider — same request/response shape
// as ChatCompletionsProvider (OpenAI-style SSE), but routed via a named
// deployment on a resource endpoint rather than a direct model ID, and
// authenticated with an api-key header instead of a bearer token.
//
// Real fix: this provider previously fell back to MockProvider with a
// console warning whenever selected.
//
// In production, routes through the backend proxy (deployment name and
// endpoint resolved server-side). In local dev mode, calls the resource
// endpoint directly using the dev-only API key.
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

export class ChatCompletionsManagedProvider implements IAIProvider {
  readonly providerId   = 'chat_completions_managed';
  readonly modelId:     string;
  readonly displayName: string;

  // Batch 444: always through the proxy, which holds the endpoint's key
  // (vite.config.ts in development, the API server in production). The
  // endpoint and deployment are kept for display; the proxy is configured
  // with them server-side.
  constructor(modelId: string, _managedEndpoint?: string, _managedDeploymentName?: string) {
    this.modelId     = modelId;
    this.displayName = `Azure OpenAI · ${modelId}`;
  }

  private buildRequest(): { url: string; headers: Record<string, string> } {
    return { url: '/api/ai/azure/chat/completions', headers: { 'Content-Type': 'application/json' } };
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
