// src/services/ai/providers/streamingProviders.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StructuredContentProvider } from './StructuredContentProvider';
import { ModelGatewayProvider } from './ModelGatewayProvider';
import { streamOpenAiStyleResponse } from './openAiStyleStreaming';

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

/** Builds a real, working Response whose body is a genuine ReadableStream
 *  emitting the given SSE lines - actually exercises the reader.read()
 *  streaming code path, not just a single json() call. */
function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + '\n'));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe('streamOpenAiStyleResponse — real fix: shared logic for chat_completions/chat_completions_managed/custom', () => {
  it('emits each token via onToken and stops cleanly at the [DONE] terminator', async () => {
    const response = sseResponse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: [DONE]',
    ]);
    const tokens: string[] = [];
    const result = await streamOpenAiStyleResponse(response, 'chat_completions', 'gpt-4o', Date.now(), t => tokens.push(t));
    expect(tokens.join('')).toBe('Hello world');
    expect(result.providerId).toBe('chat_completions');
    expect(result.tokensGenerated).toBeGreaterThan(0);
  });

  it('also stops cleanly when finish_reason is set, even without an explicit [DONE] line', async () => {
    const response = sseResponse([
      'data: {"choices":[{"delta":{"content":"Done"},"finish_reason":"stop"}]}',
    ]);
    const tokens: string[] = [];
    await streamOpenAiStyleResponse(response, 'chat_completions', 'gpt-4o', Date.now(), t => tokens.push(t));
    expect(tokens.join('')).toBe('Done');
  });

  it('skips malformed SSE lines silently rather than throwing', async () => {
    const response = sseResponse([
      'data: not valid json',
      'data: {"choices":[{"delta":{"content":"OK"}}]}',
      'data: [DONE]',
    ]);
    const tokens: string[] = [];
    await expect(
      streamOpenAiStyleResponse(response, 'chat_completions', 'gpt-4o', Date.now(), t => tokens.push(t))
    ).resolves.not.toThrow();
    expect(tokens.join('')).toBe('OK');
  });
});

describe('StructuredContentProvider — real fix: genuinely different termination behavior from the other providers', () => {
  it('ends on finishReason, not a [DONE] line, since Gemini streams have no such terminator', async () => {
    global.fetch = vi.fn(async () => sseResponse([
      'data: {"candidates":[{"content":{"parts":[{"text":"Hi"}]},"finishReason":""}]}',
      'data: {"candidates":[{"content":{"parts":[{"text":" there"}]},"finishReason":"STOP"}]}',
    ])) as any;

    const provider = new StructuredContentProvider('gemini-1.5-flash');
    const tokens: string[] = [];
    const result = await provider.generateStream(
      { system: 'sys', prompt: 'hello' },
      t => tokens.push(t),
    );
    expect(tokens.join('')).toBe('Hi there');
    expect(result.providerId).toBe('structured_content');
  });

  it('calls the dedicated streaming proxy route, not the non-streaming generate route', async () => {
    let capturedUrl = '';
    global.fetch = vi.fn(async (url: any) => {
      capturedUrl = url;
      return sseResponse(['data: {"candidates":[{"content":{"parts":[{"text":"x"}]},"finishReason":"STOP"}]}']);
    }) as any;

    const provider = new StructuredContentProvider('gemini-1.5-flash');
    await provider.generateStream({ system: 'sys', prompt: 'hello' }, () => {});
    expect(capturedUrl).toBe('/api/ai/gemini/stream?model=gemini-1.5-flash');
  });
});

describe('ModelGatewayProvider — real fix: consumes the normalized SSE contract the proxy is documented to emit', () => {
  it('emits tokens from the simple {"text":"..."} contract and stops at [DONE]', async () => {
    global.fetch = vi.fn(async () => sseResponse([
      'data: {"text":"Gate"}',
      'data: {"text":"way"}',
      'data: [DONE]',
    ])) as any;

    const provider = new ModelGatewayProvider('anthropic.claude-sonnet-4-6-v1:0', 'us-east-1');
    const tokens: string[] = [];
    const result = await provider.generateStream({ system: 'sys', prompt: 'hello' }, t => tokens.push(t));
    expect(tokens.join('')).toBe('Gateway');
    expect(result.providerId).toBe('model_gateway');
  });

  it('calls the dedicated streaming invoke route with the real modelId and region', async () => {
    let capturedBody: any = null;
    global.fetch = vi.fn(async (_url: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return sseResponse(['data: [DONE]']);
    }) as any;

    const provider = new ModelGatewayProvider('amazon.nova-pro-v1:0', 'eu-west-1');
    await provider.generateStream({ system: 'sys', prompt: 'hello' }, () => {});
    expect(capturedBody.modelId).toBe('amazon.nova-pro-v1:0');
    expect(capturedBody.region).toBe('eu-west-1');
  });
});
