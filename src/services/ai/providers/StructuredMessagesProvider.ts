// src/services/ai/providers/StructuredMessagesProvider.ts
// ─────────────────────────────────────────────────────────────────────────────
// Anthropic Claude implementation of IAIProvider — named for its distinctive
// request shape (system as a separate top-level field, not inside the
// messages array; SSE streaming via content_block_delta events) rather than
// the vendor, matching this codebase's naming convention for AI providers.
// Wraps the Anthropic Messages API with:
//   • Full SSE streaming support
//   • Proper abort/cancellation handling
//   • Latency measurement
//   • Clean error typing
//
// Routes through the Vite dev proxy (/api/ai/anthropic → api.anthropic.com)
// to avoid CORS — Anthropic blocks direct browser-to-API calls entirely.
// The proxy injects x-api-key and anthropic-version headers server-side.
// See vite.config.ts → server.proxy['/api/ai/anthropic']
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IAIProvider,
  AIGenerationRequest,
  AIGenerationResult,
  AIStreamCallback,
  AIConnectionTest,
} from '../IAIProvider';

const DEFAULT_MAX_TOKENS = 1024;

// ── Route through Vite proxy — never call api.anthropic.com directly ─────────
// Direct browser → Anthropic calls are blocked by CORS.
// Proxy config: vite.config.ts → server.proxy['/api/ai/anthropic']
//   Rewrites /api/ai/anthropic/v1/messages → /v1/messages on api.anthropic.com
//   Injects x-api-key and anthropic-version headers server-side.
const STRUCTURED_MESSAGES_PROXY_URL = '/api/ai/anthropic/v1/messages';

const DEFAULT_SYSTEM =
  'You are a board-certified pathologist assistant generating structured ' +
  'pathology report sections. Never invent clinical findings. Use formal ' +
  'medical prose. Generate only the requested section — no headers, no preamble.';

export class StructuredMessagesProvider implements IAIProvider {
  readonly providerId   = 'structured_messages';
  readonly modelId:     string;
  readonly displayName: string;

  constructor(modelId: string) {
    this.modelId     = modelId;
    this.displayName = `Anthropic (Claude) · ${modelId}`;
  }

  // ── generate (non-streaming) ──────────────────────────────────────────────

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

  // ── generateStream ────────────────────────────────────────────────────────

  async generateStream(
    request: AIGenerationRequest,
    onToken: AIStreamCallback,
  ): Promise<AIGenerationResult> {
    const startMs = Date.now();

    const response = await fetch(STRUCTURED_MESSAGES_PROXY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  request.abortSignal,
      body:    JSON.stringify({
        model:      this.modelId,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        stream:     true,
        system:     request.system || DEFAULT_SYSTEM,
        messages:   [{ role: 'user', content: request.prompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(
        (errBody as any)?.error?.message ?? `AI API error ${response.status}`,
      );
    }

    if (!response.body) throw new Error('No response body from AI API');

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let tokensGenerated = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'content_block_delta') {
            const token: string = parsed.delta?.text ?? '';
            if (token) {
              onToken(token);
              tokensGenerated += token.length;
            }
          }

          if (parsed.type === 'message_stop') break;
        } catch {
          // Malformed SSE line — skip silently
        }
      }
    }

    return {
      text:            '', // accumulated by caller via onToken
      tokensGenerated,
      providerId:      this.providerId,
      modelId:         this.modelId,
      latencyMs:       Date.now() - startMs,
    };
  }

  // ── testConnection ────────────────────────────────────────────────────────

  async testConnection(): Promise<AIConnectionTest> {
    const startMs = Date.now();
    try {
      const response = await fetch(STRUCTURED_MESSAGES_PROXY_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          model:      this.modelId,
          max_tokens: 10,
          messages:   [{ role: 'user', content: 'Reply with: OK' }],
        }),
      });

      if (!response.ok) {
        return {
          ok:        false,
          message:   `HTTP ${response.status}`,
          latencyMs: Date.now() - startMs,
        };
      }

      return {
        ok:        true,
        message:   `Connected to ${this.modelId}`,
        latencyMs: Date.now() - startMs,
      };
    } catch (e: any) {
      return {
        ok:        false,
        message:   e?.message ?? 'Unknown error',
        latencyMs: Date.now() - startMs,
      };
    }
  }
}
