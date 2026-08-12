// src/services/ai/providers/ChatCompletionsProvider.ts
// ─────────────────────────────────────────────────────────────────────────────
// OpenAI implementation of IAIProvider — named for its distinctive request
// shape (system role inside the messages array, /chat/completions endpoint,
// standard OpenAI-style SSE streaming) rather than the vendor.
//
// Real fix: this provider previously fell back to MockProvider with a
// console warning whenever selected - AIProviderRegistry only ever
// implemented structured_messages/mock, despite aiProviderService.ts's
// non-streaming callAi() genuinely supporting this provider already.
//
// Routes through the Vite dev proxy (/api/ai/openai → api.openai.com)
// to avoid CORS and keep the real API key server-side.
// See vite.config.ts → server.proxy['/api/ai/openai']
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
const CHAT_COMPLETIONS_PROXY_URL = '/api/ai/openai/v1/chat/completions';

const DEFAULT_SYSTEM =
  'You are a board-certified pathologist assistant generating structured ' +
  'pathology report sections. Never invent clinical findings. Use formal ' +
  'medical prose. Generate only the requested section — no headers, no preamble.';

export class ChatCompletionsProvider implements IAIProvider {
  readonly providerId   = 'chat_completions';
  readonly modelId:     string;
  readonly displayName: string;

  constructor(modelId: string) {
    this.modelId     = modelId;
    this.displayName = `OpenAI (GPT-4) · ${modelId}`;
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

    const response = await fetch(CHAT_COMPLETIONS_PROXY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  request.abortSignal,
      body:    JSON.stringify({
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
      const response = await fetch(CHAT_COMPLETIONS_PROXY_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
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
