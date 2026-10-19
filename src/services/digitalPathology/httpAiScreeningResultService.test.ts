import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpAiScreeningResultService } from './httpAiScreeningResultService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const make = (f: ReturnType<typeof vi.fn>) =>
  createHttpAiScreeningResultService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));

// verb, path and body for every method of the interface (the table in the contract doc).
const CALLS: Array<[string, unknown[], string, string, unknown]> = [
  ["getAll", [], "GET", "https://api.test/api/digital-pathology/ai-screening-result/get-all", null],
  ["getByCaseId", ["a b"], "GET", "https://api.test/api/digital-pathology/ai-screening-result/get-by-case-id?caseId=a%20b", null],
  ["getById", ["a b"], "GET", "https://api.test/api/digital-pathology/ai-screening-result/get-by-id?id=a%20b", null],
  ["order", [{"k": 1}], "POST", "https://api.test/api/digital-pathology/ai-screening-result/order", {"k": 1}],
  ["markCompleted", ["a b", ["x", "y"], {"k": 1}], "POST", "https://api.test/api/digital-pathology/ai-screening-result/mark-completed", {"id": "a b", "findings": ["x", "y"], "slideTriage": {"k": 1}}],
  ["markFailed", ["a b"], "POST", "https://api.test/api/digital-pathology/ai-screening-result/mark-failed", {"id": "a b"}],
  ["markTimedOut", ["a b"], "POST", "https://api.test/api/digital-pathology/ai-screening-result/mark-timed-out", {"id": "a b"}],
  ["recordHumanConcordance", ["a b", true], "POST", "https://api.test/api/digital-pathology/ai-screening-result/record-human-concordance", {"id": "a b", "concordant": true}],
];

describe('createHttpAiScreeningResultService' + ' (server version)', () => {
  it.each(CALLS)('%s: %s', async (name, args, verb, url, body) => {
    const f = vi.fn().mockResolvedValue(reply(200, { ok: 1 }));
    const r = await (make(f) as unknown as Record<string, (...a: unknown[]) => Promise<{ ok: boolean }>>)[name](...args);
    expect(r.ok).toBe(true);
    expect(f.mock.calls[0][0]).toBe(url);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(verb);
    if (body === null) expect([null, '{}']).toContain(init.body ?? null);
    else expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it('turns a refusal into a fixed code, never the server text', async () => {
    const f = vi.fn().mockResolvedValue(reply(403, { message: 'Smith, John 12345' }));
    const r = await (make(f) as unknown as Record<string, (...a: unknown[]) => Promise<{ ok: boolean; error?: string }>>)["getAll"](...[]);
    expect(r).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(JSON.stringify(r)).not.toContain('Smith');
  });
});
