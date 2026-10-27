// src/services/auth/signerConfirmation.mfa.test.ts — Batch 611 (#157): the fresh second factor at a signature
import { describe, it, expect } from 'vitest';
import type { NewAuditLog } from '../auditlog/IAuditService';
import { resolveAuthConfig } from './authConfig';
import type { SessionProfile } from './sessionProfile';
import type { ISsoClient, SsoReauthResult } from './sso/ssoClient';
import type { DemoAccount } from './demo/demoAccounts';
import { createSignerConfirmation, type SigningLockState } from './signerConfirmation';
import { createMfaService } from './mfa/mfaService';
import { memoryMfaStores } from './mfa/mfaStores';
import { base32Encode, totpForStep, totpStepAt } from './mfa/totp';

const SECRET = base32Encode(new TextEncoder().encode('12345678901234567890'));
const ISS = 'https://login.microsoftonline.com/tenant-1/v2.0';
const ENTRA = { VITE_AUTH_MICROSOFT_AUTHORITY: ISS, VITE_AUTH_MICROSOFT_CLIENT_ID: 'spa' };
const NOW = new Date('2026-10-18T09:00:00Z');
const NOW_S = Math.floor(NOW.getTime() / 1000);

const pwUser: SessionProfile = { id: 'u1', name: 'Sarah Chen', email: 'schen@hospital.org', role: 'pathologist', initials: 'SC', voiceProfile: 'EN-US', organisationId: 'ORG-A', authMethod: 'password' };
const ssoUser: SessionProfile = { ...pwUser, authMethod: 'sso', ssoProviderId: 'microsoft', ssoIssuer: ISS, ssoSubject: 'oid-1' };

function setup(profile: SessionProfile, opts: { mode?: 'off' | 'all'; reauth?: SsoReauthResult; env?: Record<string, string> } = {}) {
  const audit: NewAuditLog[] = [];
  let now = NOW;
  const logEvent = async (e: NewAuditLog) => { audit.push(e); return { ok: true as const, data: { ...e, id: 'a', timestamp: '' } }; };
  const mfa = createMfaService({ stores: memoryMfaStores(), secretFor: async () => SECRET, audit: { logEvent }, enforce: async () => true, now: () => now });
  const locks = new Map<string, SigningLockState>();
  let current: SessionProfile = profile;
  const client = { reauthenticate: () => Promise.resolve(opts.reauth ?? { ok: false, reason: 'cancelled' }), completeReauthPopup: async () => {} } as unknown as ISsoClient;
  const svc = createSignerConfirmation({
    config: resolveAuthConfig(opts.env ?? ENTRA, true),
    readProfile: () => current,
    verifyDemoCredentials: async (e, p) => (e === profile.email && p === 'right' ? ({ id: profile.id, email: profile.email } as DemoAccount) : null),
    ssoClient: () => client,
    auditService: { logEvent },
    lockStore: { read: id => locks.get(id) ?? null, write: (id, s) => { locks.set(id, s); } },
    signingSession: { current: () => 'tab-1', lastConfirmed: () => 'tab-1', markConfirmed: () => {} },
    biometric: { verify: async () => ({ ok: true }) },
    mfa: {
      stepUpNeeded: p => mfa.stepUpNeeded(p),
      challenge: (p, c) => mfa.challenge(p, c, 'step-up'),
      stepUpWithClaims: (p, c) => mfa.stepUpWithClaims(p, c),
    },
    now: () => now,
  });
  return {
    svc, mfa, audit, setProfile: (p: SessionProfile) => { current = p; },
    require: async () => { await mfa.savePolicy(profile, { mode: opts.mode ?? 'all', stepUpMinutes: 30 }); },
    code: async () => (await totpForStep(SECRET, totpStepAt(now.getTime())))!,
    advance: (ms: number) => { now = new Date(now.getTime() + ms); },
  };
}

describe('password signature with the second factor required', () => {
  it('asks for the code before anything is checked, without spending a failure', async () => {
    const t = setup(pwUser);
    await t.require();
    expect(t.svc.mfaCodeNeeded()).toBe(true);
    expect(await t.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out' })).toEqual({ ok: false, reason: 'mfa_code_required' });
    expect(t.audit.some(e => e.event === 'Signature confirmation failed')).toBe(false);
  });
  it('a wrong password is refused before the code is checked, so the code is not spent', async () => {
    const t = setup(pwUser);
    await t.require();
    await t.mfa.enrolmentConfirm(pwUser, await t.code());
    t.advance(31_000);
    const code = await t.code();
    const r = await t.svc.withPassword({ username: '', password: 'wrong', action: 'case-sign-out', mfaCode: code });
    expect(r).toMatchObject({ ok: false, reason: 'wrong_credentials' });
    expect((await t.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', mfaCode: code })).ok).toBe(true);
  });
  it('a right password and right code sign, and hand back a fresh stamp', async () => {
    const t = setup(pwUser);
    await t.require();
    await t.mfa.enrolmentConfirm(pwUser, await t.code());
    t.advance(31_000);
    const r = await t.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', mfaCode: await t.code() });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mfa).toMatchObject({ organisationId: 'ORG-A', userId: 'u1', method: 'simulated-totp' });
    // with the stamp on the session, the next signature inside the window needs no code
    t.setProfile({ ...pwUser, mfa: r.mfa });
    expect(t.svc.mfaCodeNeeded()).toBe(false);
    const next = await t.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out' });
    expect(next.ok).toBe(true);
    if (next.ok) expect(next.mfa).toBeUndefined();
    // and after the window it asks again
    t.advance(31 * 60_000);
    expect(t.svc.mfaCodeNeeded()).toBe(true);
  });
  it('a wrong code signs nothing and reports the attempts left; a replayed code is refused', async () => {
    const t = setup(pwUser);
    await t.require();
    await t.mfa.enrolmentConfirm(pwUser, await t.code());
    t.advance(31_000);
    const bad = await t.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', mfaCode: '000000' });
    expect(bad).toMatchObject({ ok: false, reason: 'mfa_invalid', attemptsLeft: 4 });
    const good = await t.code();
    expect((await t.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', mfaCode: good })).ok).toBe(true);
    expect(await t.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', mfaCode: good })).toMatchObject({ ok: false, reason: 'mfa_invalid' });
  });
  it('five wrong codes lock it', async () => {
    const t = setup(pwUser);
    await t.require();
    await t.mfa.enrolmentConfirm(pwUser, await t.code());
    t.advance(31_000);
    let r: Awaited<ReturnType<typeof t.svc.withPassword>> = { ok: false, reason: 'unavailable' };
    for (let i = 0; i < 5; i++) r = await t.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', mfaCode: '000000' });
    expect(r).toMatchObject({ ok: false, reason: 'locked' });
  });
  it('is not asked when the policy is off', async () => {
    const t = setup(pwUser, { mode: 'off' });
    await t.require();
    expect(t.svc.mfaCodeNeeded()).toBe(false);
    expect((await t.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out' })).ok).toBe(true);
  });
  it('the simulated biometric does not stand in for the second factor', async () => {
    const t = setup(pwUser);
    await t.require();
    expect(await t.svc.withBiometric({ action: 'case-sign-out' })).toEqual({ ok: false, reason: 'mfa_code_required' });
    await t.mfa.enrolmentConfirm(pwUser, await t.code());
    t.advance(31_000);
    const r = await t.svc.withBiometric({ action: 'case-sign-out', mfaCode: await t.code() });
    expect(r.ok).toBe(true);
  });
});

describe('single sign-on signature with the second factor required', () => {
  const claims = (extra: Record<string, unknown>) => ({
    ok: true as const, issuer: ISS, idToken: 'tok',
    claims: { iss: ISS, aud: 'spa', sub: 'oid-1', oid: 'oid-1', exp: NOW_S + 600, iat: NOW_S + 1, auth_time: NOW_S + 1, ...extra },
  });
  it('needs no typed code (the provider asks), and passes when the fresh sign-in reports a second factor', async () => {
    const t = setup(ssoUser, { reauth: claims({ amr: ['pwd', 'mfa'] }) });
    await t.require();
    expect(t.svc.mfaCodeNeeded()).toBe(false);
    const r = await t.svc.withSso({ action: 'case-sign-out' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mfa).toMatchObject({ method: 'idp' });
  });
  it('is refused when the provider did not report a second factor', async () => {
    const t = setup(ssoUser, { reauth: claims({ amr: ['pwd'] }) });
    await t.require();
    expect(await t.svc.withSso({ action: 'case-sign-out' })).toMatchObject({ ok: false, reason: 'mfa_not_asserted' });
  });
});

// ── Batch 642: the sign-out authentication policy ───────────────────────────
import { createSignOutPolicyService } from './signOutPolicy/signOutPolicyService';
import type { SignOutSession } from './signOutPolicy/signOutPolicy';

function setupPolicy(cfg: { mode: 'strict' | 'session'; mfa: boolean }) {
  const t = setup(pwUser, { mode: 'all' });
  let session: SignOutSession | null = null;
  const audit: NewAuditLog[] = [];
  let now = NOW;
  const policy = createSignOutPolicyService({
    store: { readConfig: () => ({ enterprise: { mode: cfg.mode, mfa: cfg.mfa, timeoutMinutes: 15 } }), writeConfig: () => {}, readSession: () => session, writeSession: (_i, s) => { session = s; }, readAny: () => session },
    audit: { logEvent: async e => { audit.push(e); return { ok: true as const, data: { ...e, id: 'a', timestamp: '' } }; } },
    enforce: async () => true, deviceFingerprint: () => 'dev-1', network: () => 'n', now: () => now,
  });
  const locks = new Map<string, SigningLockState>();
  const svc = createSignerConfirmation({
    config: resolveAuthConfig(ENTRA, true), readProfile: () => pwUser,
    verifyDemoCredentials: async (e, p) => (e === pwUser.email && p === 'right' ? ({ id: pwUser.id, email: pwUser.email } as DemoAccount) : null),
    ssoClient: () => ({ reauthenticate: () => Promise.resolve({ ok: false, reason: 'cancelled' }), completeReauthPopup: async () => {} } as unknown as ISsoClient),
    auditService: { logEvent: async e => { audit.push(e); return { ok: true as const, data: { ...e, id: 'a', timestamp: '' } }; } },
    lockStore: { read: id => locks.get(id) ?? null, write: (id, s) => { locks.set(id, s); } },
    signingSession: { current: () => 'tab-1', lastConfirmed: () => 'tab-1', markConfirmed: () => {} },
    biometric: { verify: async () => ({ ok: true }) },
    mfa: { stepUpNeeded: () => false, challenge: (p, c) => t.mfa.challenge(p, c, 'step-up'), stepUpWithClaims: (p, c) => t.mfa.stepUpWithClaims(p, c) },
    signOutPolicy: policy, now: () => now,
  });
  return { svc, t, audit, advance: (ms: number) => { now = new Date(now.getTime() + ms); } };
}

describe('sign-out authentication policy at a signature', () => {
  it('strict mode asks for the password every time and audits each one', async () => {
    const p = setupPolicy({ mode: 'strict', mfa: false });
    expect((await p.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', caseRef: 'S1', facilityId: 'F1' })).ok).toBe(true);
    expect(p.svc.confirmWithinSession({ action: 'case-sign-out', caseRef: 'S2', facilityId: 'F1' })).toBeNull();
    expect(p.audit.some(e => e.event === 'Sign-out authentication')).toBe(true);
  });
  it('session mode asks once, then the next sign-out names the session and asks nothing', async () => {
    const p = setupPolicy({ mode: 'session', mfa: false });
    expect(p.svc.confirmWithinSession({ action: 'case-sign-out', caseRef: 'S1', facilityId: 'F1' })).toBeNull();
    await p.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', caseRef: 'S1', facilityId: 'F1' });
    const again = p.svc.confirmWithinSession({ action: 'case-sign-out', caseRef: 'S2', facilityId: 'F1' });
    expect(again).toMatchObject({ method: 'password', caseRef: 'S2', proof: null });
    expect(again?.sessionReuse?.sessionId).toBeTruthy();
    expect(p.svc.signOutState('case-sign-out', 'F1')?.kind).toBe('valid');
  });
  it('the session does not cover other signing actions', async () => {
    const p = setupPolicy({ mode: 'session', mfa: false });
    await p.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', facilityId: 'F1' });
    expect(p.svc.confirmWithinSession({ action: 'report-finalize', facilityId: 'F1' })).toBeNull();
  });
  it('the session ends at the timeout', async () => {
    const p = setupPolicy({ mode: 'session', mfa: false });
    await p.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', facilityId: 'F1' });
    p.advance(16 * 60_000);
    expect(p.svc.confirmWithinSession({ action: 'case-sign-out', facilityId: 'F1' })).toBeNull();
  });
  it('a second factor at sign-out is asked even when the organisation policy would not', async () => {
    const p = setupPolicy({ mode: 'strict', mfa: true });
    expect(p.svc.mfaCodeNeeded('case-sign-out', 'F1')).toBe(true);
    expect(await p.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', facilityId: 'F1' })).toEqual({ ok: false, reason: 'mfa_code_required' });
  });
  it('a person with no second factor enrolled is blocked, not signed', async () => {
    const p = setupPolicy({ mode: 'strict', mfa: true });
    const r = await p.svc.withPassword({ username: '', password: 'right', action: 'case-sign-out', facilityId: 'F1', mfaCode: '123456' });
    expect(r).toEqual({ ok: false, reason: 'mfa_not_enrolled' });
    expect(p.audit.some(e => e.event === 'Sign-out authentication')).toBe(false);
  });
});
