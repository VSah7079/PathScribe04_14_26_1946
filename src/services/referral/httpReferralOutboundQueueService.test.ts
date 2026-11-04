import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpReferralOutboundQueueService } from './httpReferralOutboundQueueService';

// Batch 672: every call of IReferralOutboundQueueService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpReferralOutboundQueueService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'getAll', verb: 'GET', path: '/api/referral/referral-outbound-queue/get-all', args: [] },
  { name: 'getByBatchId', verb: 'GET', path: '/api/referral/referral-outbound-queue/get-by-batch-id?batchId=batchId-1', args: ['batchId-1'] },
  { name: 'enqueue', verb: 'POST', path: '/api/referral/referral-outbound-queue/enqueue', body: { sample: 1 }, args: [{ sample: 1 }] },
  { name: 'getFailed', verb: 'GET', path: '/api/referral/referral-outbound-queue/get-failed', args: [] },
  { name: 'markFailed', verb: 'POST', path: '/api/referral/referral-outbound-queue/mark-failed', body: {"id": "id-1", "failure": {"sample": 1}}, args: ['id-1', { sample: 1 }] },
  { name: 'retryDispatch', verb: 'POST', path: '/api/referral/referral-outbound-queue/retry-dispatch', body: {"id": "id-1"}, args: ['id-1'] },
  { name: 'markSent', verb: 'POST', path: '/api/referral/referral-outbound-queue/mark-sent', body: {"id": "id-1"}, args: ['id-1'] },
];

describe('createHttpReferralOutboundQueueService', () => {
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
  it.each(CALLS)('$name turns a 403 and a 404 into fixed codes', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
