import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpLabelPrintRouteService } from './httpLabelPrintRouteService';

// Batch 730: every call of ILabelPrintRouteService against a fake fetch.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpLabelPrintRouteService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<unknown>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS = [
  { name: 'recordPrinted', path: '/api/label-print-routes/label-print-route/record-printed', body: { routes: [{ stainOrderId: 's1' }] }, args: [[{ stainOrderId: 's1' }]] },
  { name: 'getForStainOrders', path: '/api/label-print-routes/label-print-route/get-for-stain-orders', body: { stainOrderIds: ['s1'] }, args: [['s1']] },
];

describe('createHttpLabelPrintRouteService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it.each(CALLS)('$name sends POST $path with the body', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, []));
    const r = await call(f, c.name, c.args);
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(c.body);
    expect(r).toMatchObject({ ok: true });
  });
  it.each(CALLS)('$name turns a 403 into NOT_PERMITTED', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'x' }));
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
});
