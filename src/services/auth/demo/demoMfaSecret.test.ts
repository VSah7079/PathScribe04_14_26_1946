// src/services/auth/demo/demoMfaSecret.test.ts — Batch 611 (#157): the documented demo secret
import { describe, it, expect } from 'vitest';
import { DEMO_MFA_SEED, demoMfaSecretFor } from './demoAccounts';
import { base32Decode } from '../mfa/totp';

describe('demoMfaSecretFor', () => {
  it('is a 20-byte base32 secret, stable for an id and different between ids', async () => {
    const a = (await demoMfaSecretFor('PATH-001'))!;
    expect(base32Decode(a)).toHaveLength(20);
    expect(await demoMfaSecretFor('PATH-001')).toBe(a);
    expect(await demoMfaSecretFor('QA-001')).not.toBe(a);
  });
  it('comes from the documented seed, so it is known (Simulated)', async () => {
    expect(DEMO_MFA_SEED).toBe('pathscribe-demo-mfa-v1');
    expect(await demoMfaSecretFor('')).toBeNull();
  });
});
