import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpSpecimenDeficiencyService } from './httpSpecimenDeficiencyService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const make = (f: ReturnType<typeof vi.fn>) =>
  createHttpSpecimenDeficiencyService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));

// verb, path and body for every method of the interface (the table in the contract doc).
const CALLS: Array<[string, unknown[], string, string, unknown]> = [
  ["getAll", [], "GET", "https://api.test/api/deficiencies/specimen-deficiency/get-all", null],
  ["getByCaseId", ["a b"], "GET", "https://api.test/api/deficiencies/specimen-deficiency/get-by-case-id?caseId=a%20b", null],
  ["getBySpecimenId", ["a b"], "GET", "https://api.test/api/deficiencies/specimen-deficiency/get-by-specimen-id?specimenId=a%20b", null],
  ["raise", [{"k": 1}], "POST", "https://api.test/api/deficiencies/specimen-deficiency/raise", {"k": 1}],
  ["resolve", ["a b", {"k": 1}], "POST", "https://api.test/api/deficiencies/specimen-deficiency/resolve", {"id": "a b", "resolution": {"k": 1}}],
  ["containImmediately", ["a b", {"k": 1}], "POST", "https://api.test/api/deficiencies/specimen-deficiency/contain-immediately", {"id": "a b", "resolution": {"k": 1}}],
  ["verifyEffectiveness", ["a b", {"k": 1}], "POST", "https://api.test/api/deficiencies/specimen-deficiency/verify-effectiveness", {"id": "a b", "verification": {"k": 1}}],
  ["raiseAndResolve", [{"k": 1}, {"k": 1}], "POST", "https://api.test/api/deficiencies/specimen-deficiency/raise-and-resolve", {"deficiency": {"k": 1}, "resolution": {"k": 1}}],
  ["markReviewed", [["x", "y"], "a b"], "POST", "https://api.test/api/deficiencies/specimen-deficiency/mark-reviewed", {"deficiencyIds": ["x", "y"], "managementReviewId": "a b"}],
];

describe('createHttpSpecimenDeficiencyService' + ' (server version)', () => {
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
