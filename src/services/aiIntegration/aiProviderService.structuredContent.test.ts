// src/services/aiIntegration/aiProviderService.structuredContent.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('callAi — structured_content provider, real fix: added as a formal, selectable provider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('builds the real Gemini request shape (contents/parts + systemInstruction) and calls the configured proxy route', async () => {
    vi.stubEnv('VITE_AI_PROVIDER', 'structured_content');
    vi.stubEnv('VITE_AI_MODEL', 'gemini-1.5-flash');
    vi.stubEnv('VITE_AI_PROXY_URL', '/api/ai');

    let capturedUrl = '';
    let capturedBody: any = null;
    global.fetch = vi.fn(async (url: any, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'Gemini response text' }] } }] }),
      } as any;
    }) as any;

    const { callAi } = await import('./aiProviderService');
    const result = await callAi({ system: 'You are a test assistant.', prompt: 'Say hello', maxTokens: 50 });

    // Real, deliberate proxy shape from vite.config.ts - no colon in the
    // client-constructed URL, model passed as a query param instead.
    expect(capturedUrl).toBe('/api/ai/gemini/generate?model=gemini-1.5-flash');
    expect(capturedBody.contents[0].parts[0].text).toBe('Say hello');
    expect(capturedBody.systemInstruction.parts[0].text).toBe('You are a test assistant.');
    expect(capturedBody.generationConfig.maxOutputTokens).toBe(50);
    expect(result.text).toBe('Gemini response text');
    expect(result.provider).toBe('structured_content');
  });

  it('correctly parses a real, multi-part Gemini response by joining all text parts', async () => {
    vi.stubEnv('VITE_AI_PROVIDER', 'structured_content');
    vi.stubEnv('VITE_AI_MODEL', 'gemini-1.5-flash');
    vi.stubEnv('VITE_AI_PROXY_URL', '/api/ai');

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Part one. ' }, { text: 'Part two.' }] } }] }),
    })) as any;

    const { callAi } = await import('./aiProviderService');
    const result = await callAi({ system: 'sys', prompt: 'prompt' });
    expect(result.text).toBe('Part one. Part two.');
  });

  it('throws a real, informative error on a failed Gemini response rather than silently returning empty text', async () => {
    vi.stubEnv('VITE_AI_PROVIDER', 'structured_content');
    vi.stubEnv('VITE_AI_MODEL', 'gemini-1.5-flash');
    vi.stubEnv('VITE_AI_PROXY_URL', '/api/ai');

    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    })) as any;

    const { callAi } = await import('./aiProviderService');
    await expect(callAi({ system: 'sys', prompt: 'prompt' })).rejects.toThrow(/structured_content returned 429/);
  });
});
