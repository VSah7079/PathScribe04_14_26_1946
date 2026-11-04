// src/services/biometric/serverBiometricFlow.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-512): biometric signing against the API server
// (ACCESS_SESSION_API.md section 3). The server makes the challenge and checks
// the answer; this file only asks the device (WebAuthn) and relays its
// response. No simulated fallback: a browser without WebAuthn cannot enrol or
// verify, and the sign-out falls back to the password (UNAVAILABLE).
// Nothing is kept in browser storage.
// ─────────────────────────────────────────────────────────────────────────────
import { getSessionUser } from '../auth/caseAccessControl';
import {
  defaultClient, fromBase64Url, toBase64Url, type PlatformAuthenticatorClient,
} from './platformAuthenticator';
import { getDeviceName, isBiometricAvailable, normaliseBiometricPolicy } from './mockBiometricService';
import type { AssertionResponse, AttestationResponse, IBiometricService } from './IBiometricService';
import type { BiometricRunResult, IBiometricFlow } from './IBiometricFlow';

const failure = (error: string): BiometricRunResult => ({ ok: false, error });

export function createServerBiometricFlow(service: IBiometricService, defaultDeviceClient: () => PlatformAuthenticatorClient | null = defaultClient): IBiometricFlow {
  const clientFor = (given: PlatformAuthenticatorClient | null | undefined) => (given === undefined ? defaultDeviceClient() : given);

  return {
    async getPolicy() {
      const r = await service.getPolicy();
      return normaliseBiometricPolicy(r.ok ? r.data : null);
    },
    async savePolicy(policy) { return (await service.savePolicy(policy)).ok; },
    async getCredential(userId) {
      const r = await service.getCredential(userId);
      return r.ok ? r.data : null;
    },
    // A device prompt is the only prompt a server deployment accepts.
    isAvailable: async () => clientFor(undefined) !== null && (await isBiometricAvailable()),
    deviceName: () => getDeviceName(),

    async enroll(userId, options = {}) {
      const session = getSessionUser();
      if (session?.id !== userId) return failure('NOT_PERMITTED');
      const client = clientFor(options.client);
      if (!client) return failure('UNAVAILABLE');
      const userName = [session?.firstName, session?.lastName].filter(Boolean).join(' ') || userId;
      const ask = await service.getEnrolmentChallenge(userId, userName);
      if (!ask.ok) return failure(ask.error);
      const c = ask.data;
      let attestation: AttestationResponse;
      try {
        const cred = await client.create({
          publicKey: {
            challenge: fromBase64Url(c.challenge) as BufferSource,
            rp: { id: c.rpId, name: c.rpName },
            user: { id: new TextEncoder().encode(c.userId), name: c.userName, displayName: c.userDisplayName },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
            timeout: c.timeout,
            attestation: 'none',
          },
        }) as PublicKeyCredential | null;
        if (!cred) return failure('DECLINED');
        const r = cred.response as AuthenticatorAttestationResponse;
        attestation = {
          id: cred.id, rawId: toBase64Url(cred.rawId), type: 'public-key',
          response: { clientDataJSON: toBase64Url(r.clientDataJSON), attestationObject: toBase64Url(r.attestationObject) },
        };
      } catch { return failure('DECLINED'); }
      const done = await service.completeEnrolment(userId, attestation, getDeviceName());
      return done.ok ? { ok: true, prompt: 'device' } : failure(done.error);
    },

    async verify(userId, options = {}) {
      const client = clientFor(options.client);
      if (!client) return failure('UNAVAILABLE');
      const ask = await service.getVerificationChallenge(userId);
      if (!ask.ok) return failure(ask.error);
      const c = ask.data;
      let assertion: AssertionResponse;
      try {
        const got = await client.get({
          publicKey: {
            challenge: fromBase64Url(c.challenge) as BufferSource,
            rpId: c.rpId,
            allowCredentials: [{ type: 'public-key', id: fromBase64Url(c.credentialId) as BufferSource, transports: ['internal'] }],
            userVerification: 'required',
            timeout: c.timeout,
          },
        }) as PublicKeyCredential | null;
        if (!got) return failure('DECLINED');
        const r = got.response as AuthenticatorAssertionResponse;
        assertion = {
          id: got.id, rawId: toBase64Url(got.rawId), type: 'public-key',
          response: {
            clientDataJSON: toBase64Url(r.clientDataJSON), authenticatorData: toBase64Url(r.authenticatorData), signature: toBase64Url(r.signature),
            ...(r.userHandle ? { userHandle: toBase64Url(r.userHandle) } : {}),
          },
        };
      } catch { return failure('DECLINED'); }
      const done = await service.completeVerification(userId, assertion);
      if (!done.ok) return failure(done.error);
      return done.data.verified ? { ok: true, prompt: 'device' } : failure('DECLINED');
    },

    async remove(userId) {
      const r = await service.revokeCredential(userId);
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    },
    async isCurrent(userId) { const r = await service.isBiometricCurrentForUser(userId); return r.ok ? r.data : false; },
    async shouldShowWizard(userId) { const r = await service.shouldShowWizard(userId); return r.ok ? r.data : false; },
    async dismissWizard(userId) { await service.dismissWizard(userId); },
  };
}
