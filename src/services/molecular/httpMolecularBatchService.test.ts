import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpMolecularBatchService } from './httpMolecularBatchService';

// Batch 616 (PS-500): every call of IMolecularBatchService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpMolecularBatchService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'getAll', verb: 'GET', path: '/api/molecular/molecular-batch/get-all', args: [] },
  { name: 'getById', verb: 'GET', path: '/api/molecular/molecular-batch/get-by-id?id=id-1', args: ['id-1'] },
  { name: 'create', verb: 'POST', path: '/api/molecular/molecular-batch/create', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'updateByUuid', verb: 'POST', path: '/api/molecular/molecular-batch/update-by-uuid', body: {"batchUuid":"batchUuid-1","changes":{"sample":1}}, args: ['batchUuid-1', { sample: 1 } as never] },
  { name: 'cloneAndSupersede', verb: 'POST', path: '/api/molecular/molecular-batch/clone-and-supersede', body: {"originalBatchId":"originalBatchId-1","reason":"reason-1","byUserId":"byUserId-1","byUserName":"byUserName-1"}, args: ['originalBatchId-1', 'reason-1', 'byUserId-1', 'byUserName-1'] },
];

describe('createHttpMolecularBatchService', () => {
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
