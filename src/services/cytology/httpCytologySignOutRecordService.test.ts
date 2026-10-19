import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpCytologySignOutRecordService } from './httpCytologySignOutRecordService';

// Batch 616 (PS-499): every call of ICytologySignOutRecordService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpCytologySignOutRecordService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'getByCaseId', verb: 'GET', path: '/api/cytology/cytology-sign-out-record/get-by-case-id?caseId=caseId-1', args: ['caseId-1'] },
  { name: 'getBySpecimenId', verb: 'GET', path: '/api/cytology/cytology-sign-out-record/get-by-specimen-id?specimenId=specimenId-1', args: ['specimenId-1'] },
  { name: 'create', verb: 'POST', path: '/api/cytology/cytology-sign-out-record/create', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'markRecalled', verb: 'POST', path: '/api/cytology/cytology-sign-out-record/mark-recalled', body: {"recordId":"recordId-1","by":{"sample":1},"at":"at-1"}, args: ['recordId-1', { sample: 1 } as never, 'at-1'] },
  { name: 'getByCaseIdIncludingRecalled', verb: 'GET', path: '/api/cytology/cytology-sign-out-record/get-by-case-id-including-recalled?caseId=caseId-1', args: ['caseId-1'] },
];

describe('createHttpCytologySignOutRecordService', () => {
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
