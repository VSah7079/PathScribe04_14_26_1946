// src/services/auth/mfa/mfaAssurance.test.ts — Batch 611 (#157): the provider's amr / acr claims
import { describe, it, expect } from 'vitest';
import { mfaAssertedByClaims } from './mfaAssurance';

describe('mfaAssertedByClaims', () => {
  it('amr containing mfa (Microsoft Entra ID)', () => {
    expect(mfaAssertedByClaims({ amr: ['pwd', 'mfa'] })).toEqual({ asserted: true, basis: 'amr-mfa' });
    expect(mfaAssertedByClaims({ amr: ['MFA'] })).toEqual({ asserted: true, basis: 'amr-mfa' });
  });
  it('amr naming two different kinds of factor (Okta)', () => {
    expect(mfaAssertedByClaims({ amr: ['pwd', 'otp'] })).toEqual({ asserted: true, basis: 'amr-factors' });
    expect(mfaAssertedByClaims({ amr: ['pwd', 'fpt'] })).toEqual({ asserted: true, basis: 'amr-factors' });
    expect(mfaAssertedByClaims({ amr: ['hwk', 'pin'] })).toEqual({ asserted: true, basis: 'amr-factors' });
  });
  it('a password alone, or two passwords, or methods that prove no factor, is not MFA', () => {
    expect(mfaAssertedByClaims({ amr: ['pwd'] })).toEqual({ asserted: false });
    expect(mfaAssertedByClaims({ amr: ['pwd', 'pin', 'kba'] })).toEqual({ asserted: false });
    expect(mfaAssertedByClaims({ amr: ['pwd', 'geo', 'rba', 'user'] })).toEqual({ asserted: false });
  });
  it('acr naming a multi-factor class', () => {
    expect(mfaAssertedByClaims({ acr: 'urn:okta:loa:2fa:any' })).toEqual({ asserted: true, basis: 'acr' });
    expect(mfaAssertedByClaims({ acr: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor' })).toEqual({ asserted: true, basis: 'acr' });
    expect(mfaAssertedByClaims({ acr: 'phr' })).toEqual({ asserted: true, basis: 'acr' });
    expect(mfaAssertedByClaims({ acr: ['urn:other', 'MFA-level'] })).toEqual({ asserted: true, basis: 'acr' });
  });
  it('an acr that names no multi-factor class, or none at all, is not MFA', () => {
    expect(mfaAssertedByClaims({ acr: '1' })).toEqual({ asserted: false });
    expect(mfaAssertedByClaims({ acr: 'urn:okta:loa:1fa:pwd' })).toEqual({ asserted: false });
    expect(mfaAssertedByClaims({})).toEqual({ asserted: false });
  });
  it('ignores claims of the wrong type', () => {
    expect(mfaAssertedByClaims({ amr: 5, acr: { x: 'mfa' } })).toEqual({ asserted: false });
    expect(mfaAssertedByClaims({ amr: ['mfa', 7] })).toEqual({ asserted: true, basis: 'amr-mfa' });
  });
});
