import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpRegistryGoLiveService } from './httpRegistryGoLiveService';

// Batch 616 (PS-504): every call of IRegistryGoLiveService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpRegistryGoLiveService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'list', verb: 'GET', path: '/api/registry-go-live/registry-go-live/list?domain=domain-1&registryId=registryId-1', args: ['domain-1', 'registryId-1'] },
  { name: 'get', verb: 'GET', path: '/api/registry-go-live/registry-go-live/get?id=id-1', args: ['id-1'] },
  { name: 'create', verb: 'POST', path: '/api/registry-go-live/registry-go-live/create', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'addApproval', verb: 'POST', path: '/api/registry-go-live/registry-go-live/add-approval', body: {"id":"id-1","approval":{"sample":1}}, args: ['id-1', { sample: 1 } as never] },
  { name: 'markLive', verb: 'POST', path: '/api/registry-go-live/registry-go-live/mark-live', body: {"id":"id-1","live":{"sample":1}}, args: ['id-1', { sample: 1 } as never] },
  { name: 'close', verb: 'POST', path: '/api/registry-go-live/registry-go-live/close', body: {"id":"id-1","closed":{"sample":1}}, args: ['id-1', { sample: 1 } as never] },
  { name: 'getGovernance', verb: 'GET', path: '/api/registry-go-live/registry-go-live/get-governance', args: [] },
  { name: 'getAgreement', verb: 'GET', path: '/api/registry-go-live/registry-go-live/get-agreement?domain=domain-1&registryId=registryId-1', args: ['domain-1', 'registryId-1'] },
  { name: 'recordAgreement', verb: 'POST', path: '/api/registry-go-live/registry-go-live/record-agreement', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'listAdapterRules', verb: 'GET', path: '/api/registry-go-live/registry-go-live/list-adapter-rules?domain=domain-1&registryId=registryId-1', args: ['domain-1', 'registryId-1'] },
  { name: 'saveAdapterRule', verb: 'POST', path: '/api/registry-go-live/registry-go-live/save-adapter-rule', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'removeAdapterRule', verb: 'POST', path: '/api/registry-go-live/registry-go-live/remove-adapter-rule', body: {"id":"id-1"}, args: ['id-1'] },
  { name: 'listValidationRecords', verb: 'GET', path: '/api/registry-go-live/registry-go-live/list-validation-records?domain=domain-1&registryId=registryId-1', args: ['domain-1', 'registryId-1'] },
  { name: 'saveValidationRecord', verb: 'POST', path: '/api/registry-go-live/registry-go-live/save-validation-record', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'saveGovernance', verb: 'POST', path: '/api/registry-go-live/registry-go-live/save-governance', body: {"sample":1}, args: [{ sample: 1 } as never] },
];

describe('createHttpRegistryGoLiveService', () => {
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
