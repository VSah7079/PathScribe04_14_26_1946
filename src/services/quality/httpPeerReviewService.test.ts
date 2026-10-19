import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpPeerReviewService } from './httpPeerReviewService';

// Batch 617 (PS-514): every call of IPeerReviewService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpPeerReviewService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<unknown>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; kind: string; verb: string; path: string; body?: unknown; args: unknown[]; missing: unknown; fallback: unknown }[] = [
  { name: 'getForCase', kind: 'result', verb: 'GET', path: '/api/quality/peer-review/get-for-case?caseId=caseId-1', args: ['caseId-1'], missing: null, fallback: null },
  { name: 'getOpenForUser', kind: 'result', verb: 'GET', path: '/api/quality/peer-review/get-open-for-user?userId=userId-1', args: ['userId-1'], missing: null, fallback: null },
  { name: 'request', kind: 'result', verb: 'POST', path: '/api/quality/peer-review/request', body: {"sample":1}, args: [{ sample: 1 } as never], missing: null, fallback: null },
  { name: 'recordRead', kind: 'result', verb: 'POST', path: '/api/quality/peer-review/record-read', body: {"id":"id-1","read":{"sample":1}}, args: ['id-1', { sample: 1 } as never], missing: null, fallback: null },
  { name: 'resolve', kind: 'result', verb: 'POST', path: '/api/quality/peer-review/resolve', body: {"id":"id-1","resolution":{"sample":1}}, args: ['id-1', { sample: 1 } as never], missing: null, fallback: null },
  { name: 'withdraw', kind: 'result', verb: 'POST', path: '/api/quality/peer-review/withdraw', body: {"id":"id-1","reason":"reason-1"}, args: ['id-1', 'reason-1'], missing: null, fallback: null },
  { name: 'override', kind: 'result', verb: 'POST', path: '/api/quality/peer-review/override', body: {"caseId":"caseId-1","input":{"sample":1}}, args: ['caseId-1', { sample: 1 } as never], missing: null, fallback: null },
];

describe('createHttpPeerReviewService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(["getForCase","getOpenForUser","override","recordRead","request","resolve","withdraw"]);
  });
  it.each(CALLS)('$name sends $verb $path and returns the data', async (c) => {
    const payload = c.kind === 'list' ? { items: [{ id: 'r1' }] } : { id: 'r1' };
    const f = vi.fn().mockResolvedValue(reply(200, payload));
    const r = await call(f, c.name, c.args);
    if (c.kind === 'result') expect(r).toMatchObject({ ok: true });
    else if (c.kind === 'done') expect(r).toBeUndefined();
    else if (c.kind === 'required') expect(r).toEqual(payload);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(c.verb);
    if (c.body === undefined) expect(init.body === undefined || init.body === '{}').toBe(true);
    else expect(JSON.parse(init.body as string)).toEqual(c.body);
  });
  it.each(CALLS)('$name turns a 403 and a 404 into fixed outcomes', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    if (c.kind === 'result') {
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND' });
    } else if (c.kind === 'done' || c.kind === 'required') {
      await expect(call(f, c.name, c.args)).rejects.toMatchObject({ code: 'NOT_PERMITTED' });
      await expect(call(f, c.name, c.args)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    } else if (c.kind === 'list') {
      expect(await call(f, c.name, c.args)).toEqual([]);
      expect(await call(f, c.name, c.args)).toEqual([]);
    } else {
      expect(await call(f, c.name, c.args)).toEqual(c.fallback);
      expect(await call(f, c.name, c.args)).toEqual(c.missing);
    }
  });
});
