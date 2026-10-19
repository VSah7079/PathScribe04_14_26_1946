import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpCytologyRegistryOutboundQueueService } from './httpCytologyRegistryOutboundQueueService';

// Batch 616 (PS-499): every call of ICytologyRegistryOutboundQueueService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpCytologyRegistryOutboundQueueService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'getAll', verb: 'GET', path: '/api/cytology/cytology-registry-outbound-queue/get-all', args: [] },
  { name: 'getByCaseId', verb: 'GET', path: '/api/cytology/cytology-registry-outbound-queue/get-by-case-id?caseId=caseId-1', args: ['caseId-1'] },
  { name: 'enqueue', verb: 'POST', path: '/api/cytology/cytology-registry-outbound-queue/enqueue', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getFailed', verb: 'GET', path: '/api/cytology/cytology-registry-outbound-queue/get-failed', args: [] },
  { name: 'markFailed', verb: 'POST', path: '/api/cytology/cytology-registry-outbound-queue/mark-failed', body: {"id":"id-1","failure":{"sample":1}}, args: ['id-1', { sample: 1 } as never] },
  { name: 'retryDispatch', verb: 'POST', path: '/api/cytology/cytology-registry-outbound-queue/retry-dispatch', body: {"id":"id-1"}, args: ['id-1'] },
  { name: 'markSent', verb: 'POST', path: '/api/cytology/cytology-registry-outbound-queue/mark-sent', body: {"id":"id-1"}, args: ['id-1'] },
  { name: 'setRegistryStatus', verb: 'POST', path: '/api/cytology/cytology-registry-outbound-queue/set-registry-status', body: {"id":"id-1","registryStatus":"registryStatus-1","acknowledgement":{"sample":1}}, args: ['id-1', 'registryStatus-1', { sample: 1 } as never] },
  { name: 'setRegistryRevisions', verb: 'POST', path: '/api/cytology/cytology-registry-outbound-queue/set-registry-revisions', body: {"id":"id-1","revisions":["a1","b2"]}, args: ['id-1', ['a1', 'b2']] },
];

describe('createHttpCytologyRegistryOutboundQueueService', () => {
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
