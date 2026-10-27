import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../../apiServer/apiHttpClient';
import { createHttpMfaPolicyService } from './httpMfaPolicyService';

// Batch 675 (access-14): the MFA policy calls against a fake fetch.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpMfaPolicyService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const policy = { mode: 'all', stepUpMinutes: 60, sessionMaxHours: 8 };

describe('createHttpMfaPolicyService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(['get', 'save']);
  });
  it('get and save send the documented calls, with no organisation in the request', async () => {
    const f = vi.fn().mockImplementation(async () => reply(200, policy));
    const s = svc(f);
    expect(await s.get()).toEqual({ ok: true, data: policy });
    expect(await s.save({ mode: 'all', stepUpMinutes: 60 })).toMatchObject({ ok: true });
    expect(f.mock.calls.map(c => `${(c[1] as RequestInit).method} ${c[0]}`)).toEqual([
      'GET https://api.test/api/session-security/mfa-policy/get',
      'POST https://api.test/api/session-security/mfa-policy/save',
    ]);
    expect(JSON.parse((f.mock.calls[1][1] as RequestInit).body as string)).toEqual({ mode: 'all', stepUpMinutes: 60 });
  });
  it('a refusal or failure comes back as ok:false, never as a policy', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, {})).mockResolvedValueOnce(reply(500, {}));
    const s = svc(f);
    expect((await s.save({ mode: 'off' })).ok).toBe(false);
    expect((await s.get()).ok).toBe(false);
  });
});
