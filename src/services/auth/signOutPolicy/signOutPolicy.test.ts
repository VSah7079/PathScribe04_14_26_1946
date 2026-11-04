// src/services/auth/signOutPolicy/signOutPolicy.test.ts — Batch 642: the sign-out authentication policy rules
import { describe, it, expect } from 'vitest';
import {
  SIGN_OUT_POLICY_DEFAULT, deviceFingerprintOf, evaluateSignOutSession, normaliseSignOutConfig, normaliseSignOutPolicy, resolveSignOutPolicy,
  signOutAuditDetail, signOutButtonState, signOutPolicyCsv, signOutPolicyExportRows, type SignOutPolicyConfig, type SignOutSession,
} from './signOutPolicy';

const session15: SignOutPolicyConfig = {
  enterprise: { mode: 'session', mfa: false, timeoutMinutes: 15 },
  overrides: { F1: { mode: 'strict', mfa: true, timeoutMinutes: 30 } },
  overridesLocked: false,
};
const NOW = new Date('2026-10-20T10:00:00Z');
const sess = (over: Partial<SignOutSession> = {}): SignOutSession => ({
  sessionId: 's1', userId: 'u1', userName: 'Sarah Chen', role: 'pathologist', facilityId: null, authenticatedAt: '2026-10-20T09:50:00Z', method: 'password', mfa: false, ...over,
});
const who = { userId: 'u1', role: 'pathologist' };

describe('normalising', () => {
  it('falls back to strict, 30 minutes, no second factor', () => {
    expect(normaliseSignOutPolicy(null)).toEqual(SIGN_OUT_POLICY_DEFAULT);
    expect(normaliseSignOutPolicy({ mode: 'weird' as never, timeoutMinutes: 7 as never })).toEqual(SIGN_OUT_POLICY_DEFAULT);
  });
  it('keeps only the allowed session lengths', () => {
    for (const m of [15, 30, 60, 240] as const) expect(normaliseSignOutPolicy({ timeoutMinutes: m }).timeoutMinutes).toBe(m);
  });
  it('cleans overrides saved with bad values', () => {
    const c = normaliseSignOutConfig({ overrides: { F1: { mode: 'session' } as never }, overridesLocked: true });
    expect(c.overrides.F1).toEqual({ mode: 'session', mfa: false, timeoutMinutes: 30 });
    expect(c.overridesLocked).toBe(true);
  });
});

describe('resolving the policy for a case’s facility', () => {
  it('uses the enterprise default with no override', () => {
    expect(resolveSignOutPolicy(session15, 'F2')).toMatchObject({ source: 'enterprise', overrideIgnored: false, facilityId: 'F2' });
    expect(resolveSignOutPolicy(session15, null).source).toBe('enterprise');
  });
  it('a facility override wins over the default', () => {
    const r = resolveSignOutPolicy(session15, 'F1');
    expect(r.source).toBe('facility');
    expect(r.policy.mode).toBe('strict');
  });
  it('a locked override is kept but not used', () => {
    const r = resolveSignOutPolicy({ ...session15, overridesLocked: true }, 'F1');
    expect(r).toMatchObject({ source: 'enterprise', overrideIgnored: true });
    expect(r.policy.mode).toBe('session');
  });
});

describe('the sign-out session', () => {
  const active = resolveSignOutPolicy(session15, 'F2');
  const s = (over?: Partial<SignOutSession>) => sess({ facilityId: 'F2', ...over });
  it('strict mode asks every time, even with a session on record', () => {
    expect(evaluateSignOutSession(resolveSignOutPolicy(session15, 'F1'), s({ facilityId: 'F1' }), who, NOW)).toEqual({ kind: 'prompt', why: 'strict' });
  });
  it('asks for the first sign-out', () => {
    expect(evaluateSignOutSession(active, null, who, NOW)).toEqual({ kind: 'prompt', why: 'none' });
  });
  it('asks for nothing inside the session', () => {
    expect(evaluateSignOutSession(active, s(), who, NOW).kind).toBe('valid');
  });
  it('expires on timeout', () => {
    expect(evaluateSignOutSession(active, s({ authenticatedAt: '2026-10-20T09:44:00Z' }), who, NOW)).toEqual({ kind: 'prompt', why: 'expired', reason: 'timeout' });
  });
  it('expires when the role changes (privilege elevation)', () => {
    expect(evaluateSignOutSession(active, s(), { userId: 'u1', role: 'pathologist-admin' }, NOW)).toEqual({ kind: 'prompt', why: 'expired', reason: 'privilege_elevation' });
  });
  it('is never another person’s, and never carries to another facility', () => {
    expect(evaluateSignOutSession(active, s(), { userId: 'u2', role: 'pathologist' }, NOW).kind).toBe('prompt');
    expect(evaluateSignOutSession(active, s({ facilityId: 'F9' }), who, NOW)).toEqual({ kind: 'prompt', why: 'none' });
  });
  it('a future-dated session is not trusted', () => {
    expect(evaluateSignOutSession(active, s({ authenticatedAt: '2026-10-20T11:00:00Z' }), who, NOW).kind).toBe('prompt');
  });
});

describe('the button', () => {
  it('says what is asked and why', () => {
    expect(signOutButtonState({ kind: 'valid', session: sess() })).toEqual({ passwordRequired: false, tooltip: 'authenticated' });
    expect(signOutButtonState({ kind: 'prompt', why: 'strict' })).toEqual({ passwordRequired: true, tooltip: 'strict' });
    expect(signOutButtonState({ kind: 'prompt', why: 'expired', reason: 'timeout' })).toEqual({ passwordRequired: true, tooltip: 'expired' });
    expect(signOutButtonState({ kind: 'prompt', why: 'none' })).toEqual({ passwordRequired: true, tooltip: 'none' });
  });
});

describe('export and audit text', () => {
  it('lists the default and each override, marking what governs cases', () => {
    const rows = signOutPolicyExportRows({ ...session15, overridesLocked: true }, [{ id: 'F1', name: 'North, Lab' }, { id: 'F2', name: 'South' }]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ scope: 'Facility override', facilityId: 'F1', active: false });
    const csv = signOutPolicyCsv(rows);
    expect(csv.split('\n')[0]).toBe('Scope,Facility ID,Facility,Mode,Second factor,Session minutes,Governs cases');
    expect(csv).toContain('"North, Lab"');
  });
  it('carries every fact the audit trail asks for', () => {
    const d = signOutAuditDetail({
      user: 'Sarah Chen', facilityId: 'F1', facilityName: 'North Lab', enterprise: session15.enterprise, facilityOverride: session15.overrides.F1, overrideIgnored: false,
      sessionId: 's1', methods: ['password', 'second factor'], at: '2026-10-20T10:00:00.000Z', caseId: 'S26-1', deviceFingerprint: 'dev-abc', network: 'not classified (browser build)',
    });
    for (const part of ['Sarah Chen', 'North Lab', 'enterprise policy', 'facility override', 'session s1', 'password + second factor', '2026-10-20T10:00:00.000Z', 'case S26-1', 'dev-abc', 'network not classified']) expect(d).toContain(part);
  });
  it('the device hint is stable and differs by device', () => {
    const a = deviceFingerprintOf({ userAgent: 'x', platform: 'p' });
    expect(a).toBe(deviceFingerprintOf({ userAgent: 'x', platform: 'p' }));
    expect(a).not.toBe(deviceFingerprintOf({ userAgent: 'y', platform: 'p' }));
  });
});
