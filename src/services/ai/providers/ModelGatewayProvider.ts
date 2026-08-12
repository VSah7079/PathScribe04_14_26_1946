// src/services/ai/providers/ModelGatewayProvider.ts
// ─────────────────────────────────────────────────────────────────────────────
// AWS Bedrock implementation of IAIProvider — named for its distinctive
// shape as a multi-model hosting platform (model ID + region routing,
// wraps several underlying model families) rather than the vendor.
//
// Real fix: this provider previously fell back to MockProvider with a
// console warning whenever selected.
//
// IMPORTANT, honest limitation: Bedrock's real InvokeModelWithResponseStream
// API returns AWS's raw binary event-stream framing
// (application/vnd.amazon.eventstream) - a length-prefixed, checksummed
// binary protocol, not text-based SSE. Every official AWS example
// (Python/Go/Ruby SDKs) parses this via a real AWS SDK, never via a raw
// browser fetch(). Reliably re-implementing that binary framing from
// scratch here isn't something to do with confidence, and a subtly wrong
// binary parser would be worse than an honest gap.
//
// This provider therefore assumes the backend proxy (which already needs
// real AWS credentials server-side, same as it needs Anthropic/OpenAI/
// Gemini keys) uses a real AWS SDK to invoke Bedrock, then re-emits the
// result as simple, normalized SSE: `data: {"text":"..."}` lines per
// token, terminated by a literal `data: [DONE]` line - a deliberately
// simple contract regardless of which underlying Bedrock model family
// (Anthropic, Amazon Nova, etc.) is actually being invoked, since the
// proxy already has to normalize between those different native shapes
// anyway. THE PROXY MUST BE BUILT TO EMIT THIS SHAPE for this provider
// to work - it is not automatic.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IAIProvider,
  AIGenerationRequest,
  AIGenerationResult,
  AIStreamCallback,
  AIConnectionTest,
} from '../IAIProvider';

const DEFAULT_MAX_TOKENS = 1024;

const DEFAULT_SYSTEM =
  'You are a board-certified pathologist assistant generating structured ' +
  'pathology report sections. Never invent clinical findings. Use formal ' +
  'medical prose. Generate only the requested section — no headers, no preamble.';

export class ModelGatewayProvider implements IAIProvider {
  readonly providerId   = 'model_gateway';
  readonly modelId:     string;
  readonly displayName: string;

  private gatewayRegion: string;

  constructor(modelId: string, gatewayRegion?: string) {
    this.modelId       = modelId;
    this.displayName   = `AWS Bedrock · ${modelId}`;
    this.gatewayRegion = gatewayRegion ?? 'us-east-1';
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

    // See file header - depends on the proxy normalizing Bedrock's real
    // binary event-stream response into simple, per-token SSE.
    const response = await fetch('/api/ai/bedrock/invoke-stream', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  request.abortSignal,
      body:    JSON.stringify({
        modelId:   this.modelId,
        region:    this.gatewayRegion,
        maxTokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system:    request.system || DEFAULT_SYSTEM,
        prompt:    request.prompt,
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
        if (data === '[DONE]') break outer;

        try {
          const parsed = JSON.parse(data);
          const token: string = parsed.text ?? '';
          if (token) {
            onToken(token);
            tokensGenerated += token.length;
          }
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
      // Non-streaming invoke for a quick, simple connectivity check -
      // matches the shape aiProviderService.ts's buildModelGatewayRequest
      // already uses for the non-streaming callAi() path.
      const response = await fetch('/api/ai/bedrock/invoke', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          modelId:   this.modelId,
          region:    this.gatewayRegion,
          maxTokens: 10,
          prompt:    'Reply with: OK',
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
