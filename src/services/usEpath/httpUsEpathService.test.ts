import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpUsEpathService } from './httpUsEpathService';

// Batch 620 (part E, PS-800): every call of IUsEpathService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpUsEpathService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<unknown>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);
const profile = { state: 'AZ', name: 'Profile', requiredFields: ['PID-3'], optionalFields: [], transport: 'sftp', validationRules: [], extensions: [], facilityBasis: 'reading' };
const assignment = { facilityId: null, profileId: 'p1' };
const B = '/api/us-epath/us-epath';

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'getProfiles', verb: 'GET', path: `${B}/get-profiles`, args: [] },
  { name: 'saveProfile', verb: 'POST', path: `${B}/save-profile`, body: profile, args: [profile] },
  { name: 'removeProfile', verb: 'POST', path: `${B}/remove-profile`, body: { id: 'p1' }, args: ['p1'] },
  { name: 'getAssignments', verb: 'GET', path: `${B}/get-assignments`, args: [] },
  { name: 'setAssignment', verb: 'POST', path: `${B}/set-assignment`, body: assignment, args: [assignment] },
  { name: 'removeAssignment', verb: 'POST', path: `${B}/remove-assignment`, body: { facilityId: 'fac-a' }, args: ['fac-a'] },
];

describe('createHttpUsEpathService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it.each(CALLS)('$name sends $verb $path and returns the data', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, { id: 'p1' }));
    expect(await call(f, c.name, c.args)).toMatchObject({ ok: true, data: { id: 'p1' } });
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
