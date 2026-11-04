import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpBillingReleaseService } from './httpBillingReleaseService';

// Batch 619 (PS-800): every call of IBillingReleaseService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpBillingReleaseService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<unknown>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);
const input = { id: 'r1', facilityId: null, criteria: { billingType: '26' }, action: { releaseMode: 'DYNAMIC_WITH_HOLD' } };

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'getAll', verb: 'GET', path: '/api/billing-release/billing-release/get-all', args: [] },
  { name: 'getForFacility', verb: 'GET', path: '/api/billing-release/billing-release/get-for-facility?facilityId=fac-a', args: ['fac-a'] },
  { name: 'set', verb: 'POST', path: '/api/billing-release/billing-release/set', body: input, args: [input] },
  { name: 'remove', verb: 'POST', path: '/api/billing-release/billing-release/remove', body: { id: 'r1' }, args: ['r1'] },
];

describe('createHttpBillingReleaseService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it.each(CALLS)('$name sends $verb $path and returns the data', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, { id: 'r1' }));
    expect(await call(f, c.name, c.args)).toMatchObject({ ok: true, data: { id: 'r1' } });
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(c.verb);
    if (c.body === undefined) expect(init.body === undefined || init.body === '{}').toBe(true);
    else expect(JSON.parse(init.body as string)).toEqual(c.body);
  });
  it.each(CALLS)('$name turns a 403 and a 404 into the fixed answer', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
