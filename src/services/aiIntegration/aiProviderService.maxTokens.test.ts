// Batch 609 (#173): a model's maxTokens override caps the output length of an AI call.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('callAi — maxTokens override from the model settings', () => {
  const originalFetch = global.fetch;
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { global.fetch = originalFetch; vi.unstubAllEnvs(); });

  const run = async (opts: { maxTokens?: number; override?: number }) => {
    vi.stubEnv('VITE_AI_PROVIDER', 'structured_content');
    vi.stubEnv('VITE_AI_MODEL', 'gemini-1.5-flash');
    vi.stubEnv('VITE_AI_PROXY_URL', '/api/ai');
    let body: { generationConfig: { maxOutputTokens: number } } | null = null;
    global.fetch = vi.fn(async (_url: unknown, init: { body: string }) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) };
    }) as unknown as typeof fetch;
    const { callAi } = await import('./aiProviderService');
    await callAi({
      system: 's', prompt: 'p',
      ...(opts.maxTokens !== undefined ? { maxTokens: opts.maxTokens } : {}),
      ...(opts.override !== undefined ? { configOverride: { maxTokens: opts.override } } : {}),
    });
    return body!.generationConfig.maxOutputTokens;
  };

  it('lowers a larger request to the override', async () => expect(await run({ maxTokens: 500, override: 200 })).toBe(200));
  it('leaves a smaller request alone', async () => expect(await run({ maxTokens: 100, override: 200 })).toBe(100));
  it('applies the override when the caller asked for no particular length', async () => expect(await run({ override: 250 })).toBe(250));
  it('without an override the request is unchanged', async () => expect(await run({ maxTokens: 50 })).toBe(50));
});
