// Batch 616 (PS-512): the server versions of access requests, session timeout
// and biometric, against a fake fetch (ACCESS_SESSION_API.md).
import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from './apiHttpClient';
import { createHttpAccessRequestService } from '../access/httpAccessRequestService';
import { createHttpSessionTimeoutService } from '../session/httpSessionTimeoutService';
import { createHttpBiometricService } from '../biometric/httpBiometricService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
type F = ReturnType<typeof vi.fn>;
// a fresh Response per call (a body can be read once)
const always = (status: number, body?: unknown) => vi.fn().mockImplementation(async () => reply(status, body));
const client = (f: F) => createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' });
const call = (f: F, i = 0) => ({ url: (f.mock.calls[i][0] as string).replace('https://api.test', ''), method: (f.mock.calls[i][1] as RequestInit).method, body: (f.mock.calls[i][1] as RequestInit).body as string | undefined });

describe('http access request service', () => {
  it('covers every call and never sends who is resolving', async () => {
    const f = always(200, { items: [{ id: 'a' }] });
    const s = createHttpAccessRequestService(client(f));
    expect(await s.getPending()).toEqual({ ok: true, data: [{ id: 'a' }] });
    await s.getAllForUser('u 1'); await s.getAll(); await s.create({ caseId: 'c' } as never);
    await s.grant('r1', 'u9', 'Dr Nine'); await s.deny('r1', 'u9', 'Dr Nine', 'not needed'); await s.revoke('r1', 'u9', 'Dr Nine', 'done');
    expect([0, 1, 2, 3, 4, 5, 6].map(i => `${call(f, i).method} ${call(f, i).url}`)).toEqual([
      'GET /api/access/access-request/get-pending', 'GET /api/access/access-request/get-all-for-user?userId=u%201', 'GET /api/access/access-request/get-all', 'POST /api/access/access-request/create',
      'POST /api/access/access-request/grant', 'POST /api/access/access-request/deny', 'POST /api/access/access-request/revoke',
    ]);
    expect(JSON.parse(call(f, 4).body ?? '{}')).toEqual({ id: 'r1' });
    expect(call(f, 5).body).toBe(JSON.stringify({ id: 'r1', reason: 'not needed' }));
    expect(call(f, 6).body).toBe(JSON.stringify({ id: 'r1', reason: 'done' }));
    expect(JSON.stringify(f.mock.calls)).not.toContain('Dr Nine');
  });
  it('a refused grant is NOT_PERMITTED', async () => {
    const f = always(403, {});
    expect(await createHttpAccessRequestService(client(f)).grant('r1', 'u', 'n')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
});

describe('http session timeout service', () => {
  it('reads and sets the default, and resolves the effective minutes for a facility', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { minutes: 15 })).mockResolvedValueOnce(reply(204)).mockResolvedValueOnce(reply(200, { minutes: 10 })).mockResolvedValueOnce(reply(200, { minutes: 15 }));
    const s = createHttpSessionTimeoutService(client(f));
    expect(await s.getOrgDefault()).toEqual({ ok: true, data: 15 });
    expect((await s.setOrgDefault(20)).ok).toBe(true);
    expect(call(f, 1)).toMatchObject({ method: 'POST', url: '/api/session/session-timeout/set-org-default', body: JSON.stringify({ minutes: 20 }) });
    expect(await s.resolveEffectiveMinutes('f 1')).toEqual({ ok: true, data: 10 });
    expect(call(f, 2).url).toBe('/api/session/session-timeout/resolve-effective-minutes?orderingFacilityId=f%201');
    await s.resolveEffectiveMinutes();
    expect(call(f, 3).url).toBe('/api/session/session-timeout/resolve-effective-minutes');
  });
});

describe('http biometric service', () => {
  it('covers every call, relaying the device answers and nothing else', async () => {
    const f = always(200, { current: true, show: false });
    const s = createHttpBiometricService(client(f));
    await s.getPolicy(); await s.savePolicy({ enabled: true } as never);
    await s.getCredential('u1'); await s.getEnrolmentChallenge('u1', 'Dr A');
    await s.completeEnrolment('u1', { id: 'x' } as never, 'Laptop'); await s.revokeCredential('u1');
    await s.getVerificationChallenge('u1'); await s.completeVerification('u1', { id: 'y' } as never);
    expect(await s.isBiometricCurrentForUser('u1')).toEqual({ ok: true, data: true });
    expect(await s.shouldShowWizard('u1')).toEqual({ ok: true, data: false });
    await s.dismissWizard('u1');
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `${call(f, i).method} ${call(f, i).url}`)).toEqual([
      'GET /api/biometric/biometric/get-policy', 'POST /api/biometric/biometric/save-policy', 'GET /api/biometric/biometric/get-credential?userId=u1', 'POST /api/biometric/biometric/get-enrolment-challenge',
      'POST /api/biometric/biometric/complete-enrolment', 'POST /api/biometric/biometric/revoke-credential', 'POST /api/biometric/biometric/get-verification-challenge',
      'POST /api/biometric/biometric/complete-verification', 'GET /api/biometric/biometric/is-biometric-current-for-user?userId=u1', 'GET /api/biometric/biometric/should-show-wizard?userId=u1', 'POST /api/biometric/biometric/dismiss-wizard',
    ]);
    expect(call(f, 3).body).toBe(JSON.stringify({ userId: 'u1', userName: 'Dr A' }));
    expect(call(f, 4).body).toBe(JSON.stringify({ userId: 'u1', attestation: { id: 'x' }, deviceName: 'Laptop' }));
  });
  it('no enrolled device is a successful none', async () => {
    const f = always(404, {});
    expect(await createHttpBiometricService(client(f)).getCredential('u1')).toEqual({ ok: true, data: null });
  });
});
