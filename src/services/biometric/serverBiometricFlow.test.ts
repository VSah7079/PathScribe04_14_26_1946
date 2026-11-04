// Batch 616 (PS-512): the server biometric flow relays the device's answers; the server makes the challenge and checks the reply.
import { describe, expect, it, vi } from 'vitest';
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: 'u1', firstName: 'Pat', lastName: 'Path' }) }));
import { createServerBiometricFlow } from './serverBiometricFlow';
import { toBase64Url } from './platformAuthenticator';
import type { IBiometricService } from './IBiometricService';

const ok = <T,>(data: T) => ({ ok: true as const, data });
const bytes = (n: number[]) => new Uint8Array(n);

function fakeService(over: Partial<IBiometricService> = {}): IBiometricService {
  return {
    getPolicy: async () => ok({ enabled: true, cadence: 'per_sign_off', cadenceDays: 30 }),
    savePolicy: async p => ok(p),
    getCredential: async () => ok({ userId: 'u1', credentialId: toBase64Url(bytes([9])), enrolledAt: 'x', lastVerifiedAt: null, deviceName: 'Touch ID' }),
    getEnrolmentChallenge: async (userId, userName) => ok({ challenge: toBase64Url(bytes([1, 2, 3])), rpId: 'pathscribe.test', rpName: 'PathScribe', userId, userName, userDisplayName: userName, timeout: 60000 }),
    completeEnrolment: vi.fn(async (_u, _a, _d) => ok({ userId: 'u1', credentialId: 'c', enrolledAt: 'x', lastVerifiedAt: null, deviceName: 'Touch ID' })),
    revokeCredential: async () => ok(undefined as void),
    getVerificationChallenge: async () => ok({ challenge: toBase64Url(bytes([4, 5])), rpId: 'pathscribe.test', credentialId: toBase64Url(bytes([9])), timeout: 60000 }),
    completeVerification: vi.fn(async (_u, _a) => ok({ verified: true })),
    isBiometricCurrentForUser: async () => ok(true),
    shouldShowWizard: async () => ok(true),
    dismissWizard: async () => ok(undefined as void),
    ...over,
  };
}

const device = (o: { create?: unknown; get?: unknown } = {}) => ({
  create: vi.fn(async () => o.create ?? { id: 'cid', rawId: bytes([7]).buffer, response: { clientDataJSON: bytes([1]).buffer, attestationObject: bytes([2]).buffer } }),
  get: vi.fn(async () => o.get ?? { id: 'cid', rawId: bytes([9]).buffer, response: { clientDataJSON: bytes([1]).buffer, authenticatorData: bytes([2]).buffer, signature: bytes([3]).buffer } }),
}) as never;

describe('serverBiometricFlow', () => {
  it('enrols: the server challenge goes to the device, the attestation goes back to the server', async () => {
    const svc = fakeService();
    const dev = device();
    const r = await createServerBiometricFlow(svc).enroll('u1', { client: dev });
    expect(r).toEqual({ ok: true, prompt: 'device' });
    const opts = (dev as { create: ReturnType<typeof vi.fn> }).create.mock.calls[0][0] as CredentialCreationOptions;
    expect(Array.from(new Uint8Array(opts.publicKey!.challenge as ArrayBuffer))).toEqual([1, 2, 3]);
    expect(opts.publicKey!.rp.id).toBe('pathscribe.test');
    const sent = (svc.completeEnrolment as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(sent[0]).toBe('u1');
    expect(sent[1]).toMatchObject({ id: 'cid', type: 'public-key', response: { clientDataJSON: expect.any(String), attestationObject: expect.any(String) } });
  });

  it('only the signed-in person enrols themselves', async () => {
    expect(await createServerBiometricFlow(fakeService()).enroll('someone-else', { client: device() })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });

  it('a browser without WebAuthn cannot enrol or verify (no simulated fallback)', async () => {
    const flow = createServerBiometricFlow(fakeService());
    expect(await flow.enroll('u1', { client: null })).toEqual({ ok: false, error: 'UNAVAILABLE' });
    expect(await flow.verify('u1', { client: null })).toEqual({ ok: false, error: 'UNAVAILABLE' });
  });

  it('a cancelled device prompt is DECLINED and nothing is sent to the server', async () => {
    const svc = fakeService();
    const dev = { create: vi.fn(async () => { throw new Error('cancelled'); }), get: vi.fn(async () => null) } as never;
    expect(await createServerBiometricFlow(svc).enroll('u1', { client: dev })).toEqual({ ok: false, error: 'DECLINED' });
    expect(svc.completeEnrolment).not.toHaveBeenCalled();
    expect(await createServerBiometricFlow(svc).verify('u1', { client: dev })).toEqual({ ok: false, error: 'DECLINED' });
    expect(svc.completeVerification).not.toHaveBeenCalled();
  });

  it('verifies: the assertion goes to the server, and the server decides', async () => {
    const svc = fakeService();
    expect(await createServerBiometricFlow(svc).verify('u1', { client: device() })).toEqual({ ok: true, prompt: 'device' });
    expect((svc.completeVerification as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({ type: 'public-key', response: { signature: expect.any(String) } });
    const refused = fakeService({ completeVerification: async () => ok({ verified: false }) });
    expect(await createServerBiometricFlow(refused).verify('u1', { client: device() })).toEqual({ ok: false, error: 'DECLINED' });
    const down = fakeService({ getVerificationChallenge: async () => ({ ok: false, error: 'UNAVAILABLE' }) as never });
    expect(await createServerBiometricFlow(down).verify('u1', { client: device() })).toEqual({ ok: false, error: 'UNAVAILABLE' });
  });

  it('policy, credential, cadence and wizard answers are the server\'s; a failure reads as "no"', async () => {
    const flow = createServerBiometricFlow(fakeService());
    expect((await flow.getPolicy()).enabled).toBe(true);
    expect(await flow.isCurrent('u1')).toBe(true);
    expect(await flow.shouldShowWizard('u1')).toBe(true);
    expect((await flow.getCredential('u1'))?.deviceName).toBe('Touch ID');
    const bad = createServerBiometricFlow(fakeService({
      getPolicy: async () => ({ ok: false, error: 'UNAVAILABLE' }) as never,
      isBiometricCurrentForUser: async () => ({ ok: false, error: 'UNAVAILABLE' }) as never,
      shouldShowWizard: async () => ({ ok: false, error: 'UNAVAILABLE' }) as never,
      getCredential: async () => ({ ok: false, error: 'UNAVAILABLE' }) as never,
    }));
    expect((await bad.getPolicy()).enabled).toBe(false);
    expect(await bad.isCurrent('u1')).toBe(false);
    expect(await bad.shouldShowWizard('u1')).toBe(false);
    expect(await bad.getCredential('u1')).toBeNull();
  });
});
