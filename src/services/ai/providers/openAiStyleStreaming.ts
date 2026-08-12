// src/services/ai/providers/openAiStyleStreaming.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared streaming request/parse logic for the three providers that
// genuinely share the identical OpenAI Chat Completions SSE shape -
// chat_completions, chat_completions_managed (same body/response shape,
// deployment-routed), and custom (self-hosted, explicitly required to be
// OpenAI-compatible). Extracted here rather than duplicated three times,
// since the actual protocol parsing is identical across all three - only
// the request URL/headers differ, which each provider still builds itself.
//
// Real format, confirmed against current OpenAI documentation: each SSE
// line is `data: {"choices":[{"delta":{"content":"..."}}]}`, terminated
// by a literal `data: [DONE]` line - no distinct event-type field the way
// Anthropic's stream has (content_block_delta, message_stop, etc.).
// ─────────────────────────────────────────────────────────────────────────────

import type { AIGenerationResult, AIStreamCallback } from '../IAIProvider';

export async function streamOpenAiStyleResponse(
  response: Response,
  providerId: string,
  modelId: string,
  startMs: number,
  onToken: AIStreamCallback,
): Promise<AIGenerationResult> {
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
        const token: string = parsed.choices?.[0]?.delta?.content ?? '';
        if (token) {
          onToken(token);
          tokensGenerated += token.length;
        }
        if (parsed.choices?.[0]?.finish_reason) break outer;
      } catch {
        // Malformed SSE line — skip silently, same handling as
        // StructuredMessagesProvider's own Anthropic stream parsing.
      }
    }
  }

  return {
    text:            '', // accumulated by caller via onToken
    tokensGenerated,
    providerId,
    modelId,
    latencyMs:       Date.now() - startMs,
  };
}

/** Real, shared error-body parsing for a failed OpenAI-shaped request -
 *  same error envelope shape across all three of these providers. */
export async function parseOpenAiStyleError(response: Response): Promise<string> {
  const errBody = await response.json().catch(() => ({}));
  return (errBody as any)?.error?.message ?? `AI API error ${response.status}`;
}
