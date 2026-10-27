// src/services/auth/mfa/mfaService.test.ts — Batch 611 (#157)
// Each acceptance criterion of docs/architecture/MFA.md is named in a test title here.
import { describe, it, expect, vi } from 'vitest';
import type { NewAuditLog } from '../../auditlog/IAuditService';
import type { SessionProfile } from '../sessionProfile';
import { createMfaService, MFA_LOCK_POLICY, MFA_RECOVERY_CODE_COUNT } from './mfaService';
import { memoryMfaStores } from './mfaStores';
import { base32Encode, totpForStep, totpStepAt } from './totp';

const SECRET = base32Encode(new TextEncoder().encode('12345678901234567890'));
const START = new Date('2026-10-18T09:00:00Z');

const person = (over: Partial<SessionProfile> = {}): SessionProfile =>
  ({ id: 'u1', name: 'Sarah Chen', email: 'schen@hospital.org', role: 'pathologist', initials: 'SC', voiceProfile: 'EN-US', organisationId: 'ORG-A', ...over });

function setup(opts: { granted?: string[]; secret?: string | null } = {}) {
  const audit: NewAuditLog[] = [];
  const stores = memoryMfaStores();
  let now = START;
  let counter = 0;
  const granted = new Set(opts.granted ?? ['config:session-security:manage', 'auth:mfa-enrolment:reset']);
  const svc = createMfaService({
    stores,
    secretFor: opts.secret === null ? null : async () => opts.secret ?? SECRET,
    audit: { logEvent: async e => { audit.push(e); return { ok: true, data: { ...e, id: 'a', timestamp: '' } }; } },
    enforce: async c => granted.has(c),
    now: () => now,
    randomBytes: n => { counter++; return Uint8Array.from({ length: n }, (_, i) => (counter * 31 + i * 17) % 251); },
  });
  const codeAt = async (offsetSteps = 0) => (await totpForStep(SECRET, totpStepAt(now.getTime()) + offsetSteps))!;
  return { svc, audit, stores, granted, codeAt, advance: (ms: number) => { now = new Date(now.getTime() + ms); }, set: (d: Date) => { now = d; } };
}

const requireAll = async (t: ReturnType<typeof setup>, org = 'ORG-A') => { await t.svc.savePolicy(person({ organisationId: org }), { mode: 'all' }); t.audit.length = 0; };
const enrol = async (t: ReturnType<typeof setup>, p = person()) => {
  await t.svc.enrolmentStart(p);
  const r = await t.svc.enrolmentConfirm(p, await t.codeAt());
  if (!r.ok) throw new Error('enrolment failed');
  t.advance(31_000); // the enrolment code's step is spent; move on to a fresh one
  return r;
};
const auditText = (t: ReturnType<typeof setup>) => t.audit.map(e => `${e.event} ${e.detail}`).join('\n');

describe('policy', () => {
  it('is off by default and per organisation', async () => {
    const t = setup();
    expect(t.svc.getPolicy('ORG-A')).toEqual({ mode: 'off', stepUpMinutes: 30, sessionMaxHours: 12 });
    expect(t.svc.requiredFor(person())).toBe(false);
    await t.svc.savePolicy(person(), { mode: 'signing_roles', stepUpMinutes: 10 });
    expect(t.svc.requiredFor(person())).toBe(true);
    expect(t.svc.requiredFor(person({ role: 'admin' }))).toBe(false);
    expect(t.svc.requiredFor(person({ organisationId: 'ORG-B' }))).toBe(false);
    expect(t.svc.policyOf(person()).stepUpMinutes).toBe(10);
  });
  it('is saved only with config:session-security:manage, and the change is audited', async () => {
    const t = setup({ granted: [] });
    expect(await t.svc.savePolicy(person(), { mode: 'all' })).toEqual({ ok: false, reason: 'not_permitted' });
    expect(t.svc.getPolicy('ORG-A').mode).toBe('off');
    t.granted.add('config:session-security:manage');
    expect((await t.svc.savePolicy(person(), { mode: 'all' })).ok).toBe(true);
    expect(t.audit.map(e => e.event)).toEqual(['MFA policy changed']);
    expect(t.audit[0].detail).toContain('from off to all');
  });
});

describe('status at password sign-in', () => {
  it('not required, enrol, challenge, or unavailable (no simulated factor in this build)', async () => {
    const t = setup();
    expect(await t.svc.statusFor(person())).toBe('not_required');
    await requireAll(t);
    expect(await t.svc.statusFor(person())).toBe('enrol');
    await enrol(t);
    expect(await t.svc.statusFor(person())).toBe('challenge');
    const server = setup({ secret: null });
    await requireAll(server);
    expect(await server.svc.statusFor(person())).toBe('unavailable');
    expect(server.svc.simulatedFactorAvailable()).toBe(false);
  });
});

describe('enrolment (Simulated authenticator)', () => {
  it('shows the secret, accepts the first code, issues eight recovery codes once, and stores only hashes', async () => {
    const t = setup();
    await requireAll(t);
    const start = await t.svc.enrolmentStart(person());
    expect(start).toEqual({ ok: true, secret: SECRET, account: 'schen@hospital.org' });
    const done = await t.svc.enrolmentConfirm(person(), await t.codeAt());
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.recoveryCodes).toHaveLength(MFA_RECOVERY_CODE_COUNT);
    expect(new Set(done.recoveryCodes).size).toBe(MFA_RECOVERY_CODE_COUNT);
    expect(done.stamp).toMatchObject({ organisationId: 'ORG-A', userId: 'u1', method: 'simulated-totp' });
    const stored = JSON.stringify(t.stores.enrolment.read('ORG-A', 'u1'));
    for (const c of done.recoveryCodes) expect(stored).not.toContain(c.replace('-', ''));
    expect(stored).not.toContain(SECRET);
    expect((await t.svc.enrolmentStart(person())).ok).toBe(false);
    expect(t.audit.map(e => e.event)).toContain('MFA enrolled');
  });
  it('rejects a wrong first code and does not enrol', async () => {
    const t = setup();
    await requireAll(t);
    const r = await t.svc.enrolmentConfirm(person(), '000000');
    expect(r).toMatchObject({ ok: false, reason: 'invalid', attemptsLeft: MFA_LOCK_POLICY.maxFailures - 1 });
    expect(await t.svc.statusFor(person())).toBe('enrol');
  });
  it('with no simulated factor there is nothing to enrol', async () => {
    const t = setup({ secret: null });
    expect(await t.svc.enrolmentStart(person())).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('challenge at sign-in', () => {
  it('accepts the current code, then rejects the same code (replayed)', async () => {
    const t = setup();
    await requireAll(t); await enrol(t);
    const code = await t.codeAt();
    const first = await t.svc.challenge(person(), code, 'sign-in');
    expect(first).toMatchObject({ ok: true, usedRecoveryCode: false });
    const again = await t.svc.challenge(person(), code, 'sign-in');
    expect(again).toMatchObject({ ok: false, reason: 'replayed' });
  });
  it('rejects a wrong code, an expired code (two steps old) and input that is not a code', async () => {
    const t = setup();
    await requireAll(t); await enrol(t);
    expect(await t.svc.challenge(person(), '123457', 'sign-in')).toMatchObject({ ok: false, reason: 'invalid' });
    expect(await t.svc.challenge(person(), await t.codeAt(-3), 'sign-in')).toMatchObject({ ok: false, reason: 'invalid' });
    expect(await t.svc.challenge(person(), 'hello', 'sign-in')).toMatchObject({ ok: false, reason: 'invalid' });
  });
  it('accepts a code one step either side of now', async () => {
    const t = setup();
    await requireAll(t); await enrol(t);
    expect((await t.svc.challenge(person(), await t.codeAt(1), 'sign-in')).ok).toBe(true);
  });
  it('a person who is not enrolled cannot be challenged', async () => {
    const t = setup();
    await requireAll(t);
    expect(await t.svc.challenge(person(), '123456', 'sign-in')).toEqual({ ok: false, reason: 'not_enrolled' });
  });
  it('locks after five failed codes for fifteen minutes, refusing even the right code, then opens', async () => {
    const t = setup();
    await requireAll(t); await enrol(t);
    let last = await t.svc.challenge(person(), '111111', 'sign-in');
    for (let i = 1; i < MFA_LOCK_POLICY.maxFailures; i++) last = await t.svc.challenge(person(), '111111', 'sign-in');
    expect(last).toMatchObject({ ok: false, reason: 'locked' });
    expect(await t.svc.challenge(person(), await t.codeAt(), 'sign-in')).toMatchObject({ ok: false, reason: 'locked' });
    t.advance(MFA_LOCK_POLICY.lockMinutes * 60_000 + 1000);
    expect((await t.svc.challenge(person(), await t.codeAt(), 'sign-in')).ok).toBe(true);
    const events = t.audit.map(e => e.event);
    expect(events).toContain('MFA locked');
    expect(events).toContain('MFA refused');
  });
  it('a good code clears the failure count', async () => {
    const t = setup();
    await requireAll(t); await enrol(t);
    for (let i = 0; i < 3; i++) await t.svc.challenge(person(), '111111', 'sign-in');
    expect((await t.svc.challenge(person(), await t.codeAt(), 'sign-in')).ok).toBe(true);
    t.advance(31_000);
    expect(await t.svc.challenge(person(), '111111', 'sign-in')).toMatchObject({ attemptsLeft: MFA_LOCK_POLICY.maxFailures - 1 });
  });
});

describe('recovery codes', () => {
  it('work once, in any case and with or without the dash, and are counted down', async () => {
    const t = setup();
    await requireAll(t);
    const { recoveryCodes } = (await enrol(t)) as { recoveryCodes: string[] };
    const typed = recoveryCodes[0].toLowerCase().replace('-', ' ');
    const r = await t.svc.challenge(person(), typed, 'sign-in');
    expect(r).toMatchObject({ ok: true, usedRecoveryCode: true, recoveryCodesLeft: MFA_RECOVERY_CODE_COUNT - 1 });
    if (r.ok) expect(r.stamp.method).toBe('recovery-code');
    expect(await t.svc.challenge(person(), recoveryCodes[0], 'sign-in')).toMatchObject({ ok: false, reason: 'invalid' });
    expect((await t.svc.challenge(person(), recoveryCodes[1], 'sign-in')).ok).toBe(true);
    expect(t.audit.filter(e => e.event === 'MFA recovery code used')).toHaveLength(2);
  });
  it('a recovery code from one person does not work for another', async () => {
    const t = setup();
    await requireAll(t);
    const a = (await enrol(t, person())) as { recoveryCodes: string[] };
    await enrol(t, person({ id: 'u2', email: 'b@hospital.org' }));
    expect(await t.svc.challenge(person({ id: 'u2', email: 'b@hospital.org' }), a.recoveryCodes[0], 'sign-in')).toMatchObject({ ok: false });
  });
});

describe('step-up at a signature', () => {
  it('is needed when the session has no fresh stamp, then not for the policy window, then again', async () => {
    const t = setup();
    await t.svc.savePolicy(person(), { mode: 'all', stepUpMinutes: 30 });
    const enrolled = (await enrol(t)) as { stamp: NonNullable<SessionProfile['mfa']> };
    const base = person();
    expect(t.svc.stepUpNeeded(base)).toBe(true);
    const r = await t.svc.challenge(base, await t.codeAt(), 'step-up');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const signed = person({ mfa: r.stamp });
    expect(t.svc.stepUpNeeded(signed)).toBe(false);
    t.advance(29 * 60_000);
    expect(t.svc.stepUpNeeded(signed)).toBe(false);
    t.advance(2 * 60_000);
    expect(t.svc.stepUpNeeded(signed)).toBe(true);
    expect(enrolled.stamp.userId).toBe('u1');
    expect(t.audit.map(e => e.event)).toContain('MFA step-up passed');
  });
  it('is never needed when the policy does not ask this person', async () => {
    const t = setup();
    await t.svc.savePolicy(person(), { mode: 'signing_roles' });
    expect(t.svc.stepUpNeeded(person({ role: 'admin' }))).toBe(false);
    expect(t.svc.stepUpNeeded(person({ organisationId: 'ORG-B' }))).toBe(false);
  });
  it('another organisation\'s stamp never satisfies this organisation\'s step-up', async () => {
    const t = setup();
    await t.svc.savePolicy(person(), { mode: 'all' });
    const foreign = { organisationId: 'ORG-B', userId: 'u1', verifiedAt: START.toISOString(), method: 'simulated-totp' as const };
    expect(t.svc.stepUpNeeded(person({ mfa: foreign }))).toBe(true);
    expect(t.svc.stepUpNeeded(person({ mfa: { ...foreign, organisationId: 'ORG-A', userId: 'someone-else' } }))).toBe(true);
    expect(t.svc.stepUpNeeded(person({ mfa: { ...foreign, organisationId: 'ORG-A' } }))).toBe(false);
  });
  it('with the provider: a fresh sign-in that reports a second factor passes, otherwise it is refused', () => {
    const t = setup();
    expect(t.svc.stepUpWithClaims(person(), { amr: ['pwd', 'mfa'] })).toMatchObject({ ok: true, stamp: { method: 'idp' } });
    expect(t.svc.stepUpWithClaims(person(), { amr: ['pwd'] })).toEqual({ ok: false });
    expect(t.audit.map(e => e.event)).toEqual(['MFA step-up passed', 'MFA step-up refused']);
  });
});

describe('identity provider sign-in', () => {
  it('refuses sign-in when the policy requires MFA and the token does not say it was used', async () => {
    const t = setup();
    await requireAll(t);
    expect(t.svc.evaluateSso(person(), { amr: ['pwd'] })).toEqual({ ok: false, reason: 'mfa_required' });
    expect(t.audit.map(e => e.event)).toEqual(['MFA sign-in refused']);
  });
  it('accepts it when the token asserts MFA, and carries a stamp', async () => {
    const t = setup();
    await requireAll(t);
    const r = t.svc.evaluateSso(person(), { amr: ['pwd', 'mfa'] });
    expect(r).toMatchObject({ ok: true, stamp: { organisationId: 'ORG-A', userId: 'u1', method: 'idp' } });
  });
  it('asks nothing when the policy does not require MFA (no stamp when none was reported)', () => {
    const t = setup();
    expect(t.svc.evaluateSso(person(), { amr: ['pwd'] })).toEqual({ ok: true, stamp: null });
  });
  it('the policy of one organisation does not bind another', async () => {
    const t = setup();
    await requireAll(t, 'ORG-A');
    expect(t.svc.evaluateSso(person({ organisationId: 'ORG-B' }), { amr: ['pwd'] })).toEqual({ ok: true, stamp: null });
  });
});

describe('session expiry', () => {
  it('a restored session keeps its stamp inside the window, and ends after sessionMaxHours', async () => {
    const t = setup();
    await t.svc.savePolicy(person(), { mode: 'all', sessionMaxHours: 8 });
    const stamp = { organisationId: 'ORG-A', userId: 'u1', verifiedAt: START.toISOString(), method: 'idp' as const };
    t.advance(7 * 3_600_000);
    expect(t.svc.sessionStillValid(person({ mfa: stamp }))).toBe(true);
    t.advance(2 * 3_600_000);
    expect(t.svc.sessionStillValid(person({ mfa: stamp }))).toBe(false);
  });
  it('a stamp that belongs to another organisation or person ends the session', async () => {
    const t = setup();
    await t.svc.savePolicy(person(), { mode: 'all' });
    const stamp = { organisationId: 'ORG-B', userId: 'u1', verifiedAt: START.toISOString(), method: 'idp' as const };
    expect(t.svc.sessionStillValid(person({ mfa: stamp }))).toBe(false);
  });
  it('a session with no stamp stays (the first signature asks), and so does one when the policy is off', async () => {
    const t = setup();
    expect(t.svc.sessionStillValid(person())).toBe(true);
    await t.svc.savePolicy(person(), { mode: 'all' });
    expect(t.svc.sessionStillValid(person())).toBe(true);
  });
});

describe('organisations are separate', () => {
  it('enrolments and lock counts of one organisation never reach another', async () => {
    const t = setup();
    await requireAll(t, 'ORG-A'); await requireAll(t, 'ORG-B');
    await enrol(t, person());
    expect(await t.svc.statusFor(person())).toBe('challenge');
    expect(await t.svc.statusFor(person({ organisationId: 'ORG-B' }))).toBe('enrol');
    for (let i = 0; i < MFA_LOCK_POLICY.maxFailures; i++) await t.svc.challenge(person(), '111111', 'sign-in');
    expect(await t.svc.challenge(person(), await t.codeAt(), 'sign-in')).toMatchObject({ reason: 'locked' });
    // the same staff id in another organisation is not locked (it is not enrolled, so it is told that)
    expect(await t.svc.challenge(person({ organisationId: 'ORG-B' }), '111111', 'sign-in')).toEqual({ ok: false, reason: 'not_enrolled' });
  });
});

describe('reset (a lost device)', () => {
  it('needs auth:mfa-enrolment:reset, works in the administrator\'s own organisation only, and is audited', async () => {
    const t = setup();
    await requireAll(t);
    await enrol(t, person({ id: 'u2', email: 'b@hospital.org' }));
    const admin = person({ id: 'adm', role: 'admin' });
    expect((await t.svc.listEnrolments(admin))!.map(r => r.userId)).toEqual(['u2']);
    expect(await t.svc.listEnrolments(person({ id: 'adm', organisationId: 'ORG-B' }))).toEqual([]);
    expect(await t.svc.resetEnrolment(person({ id: 'adm', organisationId: 'ORG-B' }), 'u2')).toEqual({ ok: false, reason: 'not_enrolled' });
    expect(await t.svc.resetEnrolment(admin, 'u2')).toEqual({ ok: true });
    expect(await t.svc.statusFor(person({ id: 'u2', email: 'b@hospital.org' }))).toBe('enrol');
    expect(t.audit.map(e => e.event)).toContain('MFA enrolment reset');
    t.granted.delete('auth:mfa-enrolment:reset');
    expect(await t.svc.resetEnrolment(admin, 'u2')).toEqual({ ok: false, reason: 'not_permitted' });
    expect(await t.svc.listEnrolments(admin)).toBeNull();
  });
  it('clears the person\'s lock', async () => {
    const t = setup();
    await requireAll(t); await enrol(t);
    for (let i = 0; i < MFA_LOCK_POLICY.maxFailures; i++) await t.svc.challenge(person(), '111111', 'sign-in');
    await t.svc.resetEnrolment(person({ id: 'adm', role: 'admin' }), 'u1');
    expect(await t.svc.enrolmentStart(person())).toMatchObject({ ok: true });
  });
});

describe('the audit trail holds no secret and no code', () => {
  it('across enrolment, success, failure, lock, recovery and reset', async () => {
    const t = setup();
    await requireAll(t);
    const { recoveryCodes } = (await enrol(t)) as { recoveryCodes: string[] };
    const good = await t.codeAt();
    await t.svc.challenge(person(), good, 'sign-in');
    await t.svc.challenge(person(), '654321', 'sign-in');
    await t.svc.challenge(person(), recoveryCodes[0], 'step-up');
    for (let i = 0; i < MFA_LOCK_POLICY.maxFailures; i++) await t.svc.challenge(person(), '654321', 'sign-in');
    await t.svc.resetEnrolment(person({ id: 'adm', role: 'admin' }), 'u1');
    const text = auditText(t);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(good);
    expect(text).not.toContain('654321');
    for (const c of recoveryCodes) { expect(text).not.toContain(c); expect(text).not.toContain(c.replace('-', '')); }
    expect(t.audit.every(e => e.type === 'user' && e.caseId === null)).toBe(true);
    expect(text).toContain('Simulated');
  });
});

describe('demo helper', () => {
  it('shows the code the Simulated authenticator shows now, and nothing without a simulated factor', async () => {
    const t = setup();
    expect(await t.svc.demoCurrentCode(person())).toBe(await t.codeAt());
    expect(await setup({ secret: null }).svc.demoCurrentCode(person())).toBeNull();
  });
});

describe('server-held policy (Batch 675, access-14)', () => {
  const withSource = (source: import('./IMfaPolicyService').IMfaPolicyService, granted = true) => {
    const audit: NewAuditLog[] = [];
    const svc = createMfaService({
      stores: memoryMfaStores(), secretFor: null, policySource: source,
      audit: { logEvent: async e => { audit.push(e); return { ok: true, data: { ...e, id: 'a', timestamp: '' } }; } },
      enforce: async () => granted,
    });
    return { svc, audit };
  };
  const served = { mode: 'all', stepUpMinutes: 15, sessionMaxHours: 4 } as const;

  it('loadPolicy copies the server policy in, so the checks use it', async () => {
    const t = withSource({ get: async () => ({ ok: true, data: served }), save: async () => ({ ok: false, error: 'x' }) });
    expect(t.svc.requiredFor(person())).toBe(false);
    expect(await t.svc.loadPolicy(person())).toBe(true);
    expect(t.svc.requiredFor(person())).toBe(true);
    expect(t.svc.policyOf(person())).toEqual(served);
  });
  it('loadPolicy reports false when the server cannot be reached or refuses, so sign-in can fail closed', async () => {
    expect(await withSource({ get: async () => ({ ok: false, error: 'server_error' }), save: async () => ({ ok: false, error: 'x' }) }).svc.loadPolicy(person())).toBe(false);
    expect(await withSource({ get: async () => { throw new Error('down'); }, save: async () => ({ ok: false, error: 'x' }) }).svc.loadPolicy(person())).toBe(false);
  });
  it('savePolicy sends the merged policy to the server, keeps the saved copy, and writes no browser audit (the server audits)', async () => {
    const sent: unknown[] = [];
    const t = withSource({ get: async () => ({ ok: true, data: served }), save: async n => { sent.push(n); return { ok: true, data: { ...served, ...n } as never }; } });
    await t.svc.loadPolicy(person());
    expect(await t.svc.savePolicy(person(), { stepUpMinutes: 20 })).toEqual({ ok: true, policy: { ...served, stepUpMinutes: 20 } });
    expect(sent).toEqual([{ ...served, stepUpMinutes: 20 }]);
    expect(t.svc.policyOf(person()).stepUpMinutes).toBe(20);
    expect(t.audit).toEqual([]);
  });
  it('a server refusal or failure is not_permitted and leaves the policy as it was', async () => {
    const t = withSource({ get: async () => ({ ok: true, data: served }), save: async () => ({ ok: false, error: 'forbidden' }) });
    await t.svc.loadPolicy(person());
    expect(await t.svc.savePolicy(person(), { mode: 'off' })).toEqual({ ok: false, reason: 'not_permitted' });
    expect(t.svc.policyOf(person()).mode).toBe('all');
    const down = withSource({ get: async () => ({ ok: true, data: served }), save: async () => { throw new Error('down'); } });
    expect(await down.svc.savePolicy(person(), { mode: 'off' })).toEqual({ ok: false, reason: 'not_permitted' });
  });
  it('the capability is still checked in the browser first; the server is not called without it', async () => {
    const save = vi.fn();
    const t = withSource({ get: async () => ({ ok: true, data: served }), save }, false);
    expect(await t.svc.savePolicy(person(), { mode: 'off' })).toEqual({ ok: false, reason: 'not_permitted' });
    expect(save).not.toHaveBeenCalled();
  });
});
