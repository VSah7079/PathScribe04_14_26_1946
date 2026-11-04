// @vitest-environment happy-dom
// src/services/biometric/platformAuthenticator.test.ts
// Batch 611 (#158): the device prompt with a locally made challenge, the fallback to the labelled simulated prompt, and the SIMULATED audit entries.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const audit = vi.hoisted(() => ({ entries: [] as Array<{ event: string; detail: string }> }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: async (e: { event: string; detail: string }) => { audit.entries.push(e); } } }));
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: '1', firstName: 'Ada', lastName: 'Lovelace' }) }));

import * as bio from './mockBiometricService';
import { createPlatformCredential, assertPlatformCredential, toBase64Url, fromBase64Url, type PlatformAuthenticatorClient } from './platformAuthenticator';

const fakeCred = (id: number[]) => ({ rawId: new Uint8Array(id).buffer, response: { getPublicKey: () => new Uint8Array([9, 9]).buffer } }) as unknown as Credential;

describe('platform authenticator (Batch 611, #158)', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); audit.entries.length = 0; });

  it('base64url round-trips', () => {
    const b = new Uint8Array([251, 255, 0, 1, 2]);
    expect(Array.from(fromBase64Url(toBase64Url(b)))).toEqual(Array.from(b));
  });

  it('asks the device with a fresh local challenge each time and keeps only the id and public key', async () => {
    const challenges: string[] = [];
    const client: PlatformAuthenticatorClient = {
      create: async o => { challenges.push(toBase64Url(o.publicKey!.challenge as Uint8Array)); return fakeCred([1, 2, 3]); },
      get: async () => null,
    };
    const a = await createPlatformCredential({ id: '1', name: 'Ada' }, client);
    await createPlatformCredential({ id: '1', name: 'Ada' }, client);
    expect(a).toEqual({ kind: 'used', credentialId: toBase64Url(new Uint8Array([1, 2, 3])), publicKey: toBase64Url(new Uint8Array([9, 9])) });
    expect(challenges[0]).not.toBe(challenges[1]);
    expect(challenges[0].length).toBeGreaterThan(30);
  });

  it('reports unavailable without WebAuthn and declined when the device refuses', async () => {
    expect(await createPlatformCredential({ id: '1', name: 'A' }, null)).toEqual({ kind: 'unavailable' });
    const refusing: PlatformAuthenticatorClient = { create: async () => { throw new Error('NotAllowedError'); }, get: async () => { throw new Error('x'); } };
    expect(await createPlatformCredential({ id: '1', name: 'A' }, refusing)).toEqual({ kind: 'declined' });
    expect(await assertPlatformCredential('AQID', refusing)).toEqual({ kind: 'declined' });
  });

  it('enrols with the device prompt, labels the audit Simulated, then verifies with the device', async () => {
    const client: PlatformAuthenticatorClient = { create: async () => fakeCred([1, 2, 3]), get: async () => fakeCred([1, 2, 3]) };
    const enrol = await bio.enrollBiometric('1', { client });
    expect(enrol).toMatchObject({ ok: true, prompt: 'device' });
    expect(bio.getCredentialForUser('1')).toMatchObject({ prompt: 'device', credentialId: 'AQID' });
    const verify = await bio.verifyBiometric('1', { client });
    expect(verify).toMatchObject({ ok: true, prompt: 'device' });
    expect(audit.entries.map(e => e.event)).toEqual(['Biometric Enrolment (Simulated)', 'Biometric Check (Simulated)']);
    expect(audit.entries.every(e => /Simulated/.test(e.detail) && !/Ada|Lovelace|AQID/.test(e.detail))).toBe(true);
  });

  it('falls back to the labelled demonstration prompt when the browser has no WebAuthn', async () => {
    const enrol = await bio.enrollBiometric('1', { client: null, simulatedDelayMs: 0 });
    expect(enrol).toMatchObject({ ok: true, prompt: 'simulated' });
    expect(bio.getCredentialForUser('1')?.prompt).toBe('simulated');
    expect((await bio.verifyBiometric('1', { client: null, simulatedDelayMs: 0 })).prompt).toBe('simulated');
  });

  it('enrols nothing when the person cancels, and a refused check fails so the password is used', async () => {
    const cancel: PlatformAuthenticatorClient = { create: async () => null, get: async () => null };
    expect(await bio.enrollBiometric('1', { client: cancel })).toMatchObject({ ok: false, error: 'DECLINED' });
    expect(bio.getCredentialForUser('1')).toBeNull();
    await bio.enrollBiometric('1', { client: { create: async () => fakeCred([7]), get: async () => null } });
    expect(await bio.verifyBiometric('1', { client: cancel })).toMatchObject({ ok: false, error: 'DECLINED' });
    expect(audit.entries.some(e => e.event === 'Biometric Check Not Recognised (Simulated)')).toBe(true);
  });
});
