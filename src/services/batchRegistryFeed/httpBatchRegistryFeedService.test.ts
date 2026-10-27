import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpBatchRegistryFeedService } from './httpBatchRegistryFeedService';

// Batch 620 part S (PS-800): every call of IBatchRegistryFeedService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpBatchRegistryFeedService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<unknown>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);
const B = '/api/registry/batch-registry-feed';
const input = { name: 'P', registryKey: 'screening:x', format: 'csv' };
const ack = { status: 'PARTIAL', fileSha256: 'ab', rejections: [{ ref: 'e2', errorCodes: ['E1'] }] };

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'getProfiles', verb: 'GET', path: `${B}/get-profiles`, args: [] },
  { name: 'saveProfile', verb: 'POST', path: `${B}/save-profile`, body: input, args: [input] },
  { name: 'removeProfile', verb: 'POST', path: `${B}/remove-profile`, body: { id: 'p1' }, args: ['p1'] },
  { name: 'isBatchProgram', verb: 'GET', path: `${B}/is-batch-program?screeningRegistryId=germany_okfe`, args: ['germany_okfe'] },
  { name: 'getRuns', verb: 'GET', path: `${B}/get-runs?profileId=p1`, args: ['p1'] },
  { name: 'preview', verb: 'POST', path: `${B}/preview`, body: { profileId: 'p1' }, args: ['p1'] },
  { name: 'buildRun', verb: 'POST', path: `${B}/build-run`, body: { profileId: 'p1', manual: true }, args: ['p1', { manual: true }] },
  { name: 'recordFileAcknowledgement', verb: 'POST', path: `${B}/record-file-acknowledgement`, body: { runId: 'r1', ...ack }, args: ['r1', ack] },
];

describe('createHttpBatchRegistryFeedService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it('getRuns without a profile asks for all runs', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, []));
    await call(f, 'getRuns', []);
    expect(f.mock.calls[0][0]).toBe(`https://api.test${B}/get-runs`);
  });
  it.each(CALLS)('$name sends $verb $path and returns the data', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, { id: 'x' }));
    expect(await call(f, c.name, c.args)).toMatchObject({ ok: true, data: { id: 'x' } });
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
