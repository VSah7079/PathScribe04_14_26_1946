// @vitest-environment happy-dom
//
// src/services/biometric/biometricPolicy.test.ts
// Batch 433: the biometric policy needs config:session-security:manage; you enrol and remove only yourself.
import { describe, it, expect, vi, beforeEach } from 'vitest';

let allowed = false;
let sessionId = '1';
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: async () => ({ allowed }) } }));
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: sessionId }) }));

import * as bio from './mockBiometricService';

describe('biometric policy and enrolment (Batch 433)', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); allowed = false; sessionId = '1'; });

  it('saving the policy needs config:session-security:manage', async () => {
    expect(await bio.saveBiometricPolicy({ enabled: true, cadence: 'per_session', cadenceDays: 30 })).toBe(false);
    expect(bio.getBiometricPolicy().enabled).toBe(false);
    allowed = true;
    expect(await bio.saveBiometricPolicy({ enabled: true, cadence: 'per_session', cadenceDays: 30 })).toBe(true);
    expect(bio.getBiometricPolicy()).toEqual({ enabled: true, cadence: 'per_session', cadenceDays: 30 });
  });

  it('normalises what was saved', () => {
    expect(bio.normaliseBiometricPolicy({ enabled: 'yes' as never, cadence: 'hourly' as never, cadenceDays: 0 })).toEqual(bio.BIOMETRIC_POLICY_DEFAULTS);
  });

  it('you enrol and remove only yourself', async () => {
    expect((await bio.enrollBiometric('2')).ok).toBe(false);
    expect((await bio.enrollBiometric('1')).ok).toBe(true);
    expect(bio.getCredentialForUser('1')).not.toBeNull();
    sessionId = '2';
    expect((await bio.removeBiometricCredential('1')).ok).toBe(false);
    sessionId = '1';
    expect((await bio.removeBiometricCredential('1')).ok).toBe(true);
    expect(bio.getCredentialForUser('1')).toBeNull();
  }, 10000);
});
