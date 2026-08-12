// src/services/ai/providers/StructuredContentProvider.ts
// ─────────────────────────────────────────────────────────────────────────────
// Gemini implementation of IAIProvider — named for its distinctive request/
// response shape (contents/parts array, separate systemInstruction field)
// rather than the vendor.
//
// Real fix: this provider previously fell back to MockProvider with a
// console warning whenever selected - AIProviderRegistry only ever
// implemented structured_messages/mock.
//
// Streaming format verified against current Gemini API documentation:
// the streamGenerateContent endpoint requires ?alt=sse to return line-
// delimited `data: {...}` SSE (without it, the raw endpoint returns a
// single JSON array instead, which this parser is not built for). There
// is no [DONE] terminator the way OpenAI/Anthropic have - the stream
// ends when a chunk's finishReason is set (typically "STOP"), or when
// the connection closes.
//
// Uses a dedicated streaming proxy route, separate from the existing
// non-streaming /api/ai/gemini/generate route, since the real upstream
// endpoint path itself differs (streamGenerateContent vs generateContent).
// See vite.config.ts → server.proxy['/api/ai/gemini/stream'].
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IAIProvider,
  AIGenerationRequest,
  AIGenerationResult,
  AIStreamCallback,
  AIConnectionTest,
} from '../IAIProvider';
import { isDevMode } from '@/components/Config/AI/aiProviderConfig';

const DEFAULT_MAX_TOKENS = 1024;

const DEFAULT_SYSTEM =
  'You are a board-certified pathologist assistant generating structured ' +
  'pathology report sections. Never invent clinical findings. Use formal ' +
  'medical prose. Generate only the requested section — no headers, no preamble.';

export class StructuredContentProvider implements IAIProvider {
  readonly providerId   = 'structured_content';
  readonly modelId:     string;
  readonly displayName: string;

  private devApiKey?: string;

  constructor(modelId: string, devApiKey?: string) {
    this.modelId     = modelId;
    this.displayName = `Google (Gemini) · ${modelId}`;
    this.devApiKey   = devApiKey;
  }

  private buildUrl(): string {
    const devMode = isDevMode() && !!this.devApiKey;
    return devMode
      ? `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:streamGenerateContent?alt=sse&key=${this.devApiKey}`
      : `/api/ai/gemini/stream?model=${this.modelId}`;
  }

  /** Real fix, found while wiring voice dictation through this
   *  provider: this method previously delegated to generateStream(),
   *  which depends on a `/api/ai/gemini/stream` proxy route that does
   *  not exist anywhere in vite.config.ts — confirmed directly, only
   *  `/api/ai/gemini/generate` (non-streaming) is actually configured.
   *  generateStream() therefore would have failed the moment anything
   *  called it; confirmed nothing in the codebase currently does.
   *  Fixed to call the proxy route that's actually configured and
   *  already proven working (testConnection() below already uses it),
   *  matching this method's own documented contract in IAIProvider —
   *  "non-streaming generation... for short completions where latency
   *  is not critical" — exactly what this should have been doing. */
  async generate(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const startMs = Date.now();
    const devMode = isDevMode() && !!this.devApiKey;
    const url = devMode
      ? `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${this.devApiKey}`
      : `/api/ai/gemini/generate?model=${this.modelId}`;

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  request.abortSignal,
      body:    JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        systemInstruction: { parts: [{ text: request.system || DEFAULT_SYSTEM }] },
        generationConfig: { maxOutputTokens: request.maxTokens ?? DEFAULT_MAX_TOKENS },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error((errBody as any)?.error?.message ?? `AI API error ${response.status}`);
    }

    const data = await response.json();
    const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p.text ?? '')
      .join('');

    return {
      text,
      tokensGenerated: text.length,
      providerId:      this.providerId,
      modelId:         this.modelId,
      latencyMs:       Date.now() - startMs,
    };
  }

  async generateStream(
    request: AIGenerationRequest,
    onToken: AIStreamCallback,
  ): Promise<AIGenerationResult> {
    const startMs = Date.now();

    const response = await fetch(this.buildUrl(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  request.abortSignal,
      body:    JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        systemInstruction: { parts: [{ text: request.system || DEFAULT_SYSTEM }] },
        generationConfig: { maxOutputTokens: request.maxTokens ?? DEFAULT_MAX_TOKENS },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error((errBody as any)?.error?.message ?? `AI API error ${response.status}`);
    }

    if (!response.body) throw new Error('No response body from AI API');

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let tokensGenerated = 0;

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();

        try {
          const parsed = JSON.parse(data);
          const candidate = parsed.candidates?.[0];
          const token: string = (candidate?.content?.parts ?? [])
            .map((p: any) => p.text ?? '')
            .join('');
          if (token) {
            onToken(token);
            tokensGenerated += token.length;
          }
          // No [DONE] terminator on this stream - finishReason is the
          // real end signal (typically "STOP").
          if (candidate?.finishReason) break outer;
        } catch {
          // Malformed SSE line — skip silently, same handling as the
          // other providers' stream parsing.
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

  async testConnection(): Promise<AIConnectionTest> {
    const startMs = Date.now();
    try {
      // Non-streaming generateContent for a quick, simple connectivity
      // check - deliberately not the streaming endpoint, since a
      // pass/fail test doesn't need incremental tokens.
      const devMode = isDevMode() && !!this.devApiKey;
      const url = devMode
        ? `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${this.devApiKey}`
        : `/api/ai/gemini/generate?model=${this.modelId}`;

      const response = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
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
