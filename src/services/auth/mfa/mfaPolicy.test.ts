// src/services/auth/mfa/mfaPolicy.test.ts — Batch 611 (#157)
import { describe, it, expect } from 'vitest';
import { MFA_POLICY_DEFAULTS, mfaOrganisationOf, mfaRequiredFor, normaliseMfaPolicy, stampBelongsTo, stampFresh, type MfaStamp } from './mfaPolicy';

const NOW = new Date('2026-10-18T12:00:00Z');
const stamp = (over: Partial<MfaStamp> = {}): MfaStamp => ({ organisationId: 'ORG-A', userId: 'u1', verifiedAt: NOW.toISOString(), method: 'simulated-totp', ...over });

describe('normaliseMfaPolicy', () => {
  it('defaults to off, 30 minutes, 12 hours', () => {
    expect(normaliseMfaPolicy(null)).toEqual(MFA_POLICY_DEFAULTS);
    expect(MFA_POLICY_DEFAULTS).toEqual({ mode: 'off', stepUpMinutes: 30, sessionMaxHours: 12 });
  });
  it('keeps good values and replaces out-of-range or unknown ones', () => {
    expect(normaliseMfaPolicy({ mode: 'all', stepUpMinutes: 5, sessionMaxHours: 8 })).toEqual({ mode: 'all', stepUpMinutes: 5, sessionMaxHours: 8 });
    expect(normaliseMfaPolicy({ mode: 'x' as never, stepUpMinutes: 0, sessionMaxHours: 500 })).toEqual(MFA_POLICY_DEFAULTS);
    expect(normaliseMfaPolicy({ stepUpMinutes: 720.4, sessionMaxHours: 72 })).toMatchObject({ stepUpMinutes: 720, sessionMaxHours: 72 });
  });
});

describe('mfaRequiredFor', () => {
  it('off asks no one; signing_roles asks the roles that sign; all asks everyone', () => {
    const roles = ['pathologist', 'pathologist-admin', 'admin', 'superadmin'] as const;
    expect(roles.map(role => mfaRequiredFor({ ...MFA_POLICY_DEFAULTS, mode: 'off' }, { role }))).toEqual([false, false, false, false]);
    expect(roles.map(role => mfaRequiredFor({ ...MFA_POLICY_DEFAULTS, mode: 'signing_roles' }, { role }))).toEqual([true, true, false, false]);
    expect(roles.map(role => mfaRequiredFor({ ...MFA_POLICY_DEFAULTS, mode: 'all' }, { role }))).toEqual([true, true, true, true]);
  });
});

describe('stamps', () => {
  it('belong to one person in one organisation', () => {
    expect(stampBelongsTo(stamp(), { id: 'u1', organisationId: 'ORG-A' })).toBe(true);
    expect(stampBelongsTo(stamp(), { id: 'u1', organisationId: 'ORG-B' })).toBe(false);
    expect(stampBelongsTo(stamp(), { id: 'u2', organisationId: 'ORG-A' })).toBe(false);
    expect(stampBelongsTo(undefined, { id: 'u1', organisationId: 'ORG-A' })).toBe(false);
    expect(stampBelongsTo(stamp({ verifiedAt: 'garbage' }), { id: 'u1', organisationId: 'ORG-A' })).toBe(false);
  });
  it('a person with no organisation is in "default"', () => {
    expect(mfaOrganisationOf({})).toBe('default');
    expect(mfaOrganisationOf({ organisationId: ' ORG-A ' })).toBe('ORG-A');
    expect(stampBelongsTo(stamp({ organisationId: 'default' }), { id: 'u1' })).toBe(true);
  });
  it('are fresh within the window, not after it, and not when dated in the future', () => {
    const at = (min: number) => new Date(NOW.getTime() + min * 60_000);
    expect(stampFresh(stamp(), at(29), 30)).toBe(true);
    expect(stampFresh(stamp(), at(31), 30)).toBe(false);
    expect(stampFresh(stamp({ verifiedAt: at(60).toISOString() }), NOW, 30)).toBe(false);
  });
});
