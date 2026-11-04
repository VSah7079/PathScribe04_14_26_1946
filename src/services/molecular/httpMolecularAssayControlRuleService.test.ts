import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpMolecularAssayControlRuleService } from './httpMolecularAssayControlRuleService';

// Batch 616 (PS-500): every call of IMolecularAssayControlRuleService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpMolecularAssayControlRuleService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'getAll', verb: 'GET', path: '/api/molecular/molecular-assay-control-rule/get-all', args: [] },
  { name: 'listForReview', verb: 'GET', path: '/api/molecular/molecular-assay-control-rule/list-for-review', args: [] },
  { name: 'getByAssayCode', verb: 'GET', path: '/api/molecular/molecular-assay-control-rule/get-by-assay-code?assayCode=assayCode-1', args: ['assayCode-1'] },
  { name: 'create', verb: 'POST', path: '/api/molecular/molecular-assay-control-rule/create', body: {"sample":1,"reason":"r"}, args: [{ sample: 1 } as never, 'r'] },
  { name: 'update', verb: 'POST', path: '/api/molecular/molecular-assay-control-rule/update', body: {"id":"id-1","patch":{"sample":1},"reason":"r"}, args: ['id-1', { sample: 1 } as never, 'r'] },
  { name: 'delete', verb: 'POST', path: '/api/molecular/molecular-assay-control-rule/delete', body: {"id":"id-1","reason":"r"}, args: ['id-1', 'r'] },
];

describe('createHttpMolecularAssayControlRuleService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it.each(CALLS)('$name sends $verb $path and returns the data', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, { id: 'r1' }));
    const r = await call(f, c.name, c.args);
    expect(r).toMatchObject({ ok: true, data: { id: 'r1' } });
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(c.verb);
    if (c.body === undefined) expect(init.body === undefined || init.body === '{}').toBe(true);
    else expect(JSON.parse(init.body as string)).toEqual(c.body);
  });
  it.each(CALLS)('$name turns a 403 and a 404 into fixed codes', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
