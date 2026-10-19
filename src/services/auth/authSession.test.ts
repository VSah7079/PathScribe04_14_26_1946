// src/services/auth/authSession.test.ts — PS-60 (Batch 343)
// Sign-in, session start/end and restore, with fakes for every dependency.
import { describe, it, expect, vi } from 'vitest';
import type { StaffUser } from '../users/IUserService';
import type { NewAuditLog } from '../auditlog/IAuditService';
import { createAuthSession, type AuthSessionDeps, type SessionMarkers } from './authSession';
import { resolveAuthConfig } from './authConfig';
import type { ISsoClient, SsoCompletion } from './sso/ssoClient';
import type { SessionProfile } from './sessionProfile';
import type { DemoAccount } from './demo/demoAccounts';
import { createMfaService } from './mfa/mfaService';
import { memoryMfaStores } from './mfa/mfaStores';

const TENANT = 'tenant-1';
const ISS = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const ENTRA = { VITE_AUTH_MICROSOFT_AUTHORITY: ISS, VITE_AUTH_MICROSOFT_CLIENT_ID: 'spa' };

const staff = (id: string, email: string, extra: Partial<StaffUser> = {}): StaffUser => ({
  id, firstName: 'Sarah', lastName: 'Chen', email, roles: ['Pathologist'], npi: '', license: '', phone: '', status: 'Active',
  organisationId: 'ORG-DVMC', canViewPediatric: true, ...extra,
});
const ROLES = [
  { id: 'pathologist', name: 'Pathologist', caseAccess: true, configAccess: false },
  { id: 'admin', name: 'Admin', caseAccess: false, configAccess: true },
  { id: 'physician', name: 'Physician', caseAccess: false, configAccess: false },
];
const DEMO: DemoAccount = { email: 'demo@pathscribe.ai', id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin', initials: 'PN', voiceProfile: 'EN-US', password: { iterations: 1, salt: '', hash: '' } };

function memoryMarkers(): SessionMarkers & { active: Map<string, string>; own: string | null } {
  let n = 0;
  const m = {
    active: new Map<string, string>(),
    own: null as string | null,
    getActiveSessionId: (u: string) => m.active.get(u) ?? null,
    setActiveSessionId: (u: string, s: string) => { m.active.set(u, s); },
    clearActiveSessionId: (u: string) => { m.active.delete(u); },
    getOwnSessionId: () => m.own,
    setOwnSessionId: (s: string) => { m.own = s; },
    clearOwnSessionId: () => { m.own = null; },
    generateSessionId: () => `s${++n}`,
  };
  return m;
}

function fakeSso(completion: SsoCompletion, opts: { hasSession?: boolean; token?: string | null } = {}) {
  const signedOut: string[] = [];
  const client: ISsoClient = {
    providers: [],
    begin: vi.fn(async () => ({ ok: true as const })),
    complete: vi.fn(async () => completion),
    accessToken: vi.fn(async () => opts.token ?? 'access-token'),
    hasSession: vi.fn(async () => opts.hasSession ?? true),
    signOut: vi.fn(async (id: string) => { signedOut.push(id); }),
    reauthenticate: vi.fn(async () => ({ ok: false as const, reason: 'cancelled' as const })),
    completeReauthPopup: vi.fn(async () => {}),
  };
  return { client, signedOut };
}

function setup(over: Partial<AuthSessionDeps> & { env?: Record<string, string>; people?: StaffUser[]; stored?: SessionProfile | null; completion?: SsoCompletion; hasSession?: boolean } = {}) {
  const people = over.people ?? [staff('1', 'schen@hospital.org')];
  const audit: NewAuditLog[] = [];
  const updates: { id: string; changes: Partial<StaffUser> }[] = [];
  let stored: SessionProfile | null = over.stored ?? null;
  const markers = memoryMarkers();
  const sso = fakeSso(over.completion ?? { ok: true, providerId: 'microsoft', claims: { iss: ISS, sub: 'x', oid: 'oid-1', email: 'SChen@hospital.org' }, returnPath: '/worklist' }, { hasSession: over.hasSession });
  const drafts: string[] = [];
  const deps: AuthSessionDeps = {
    config: resolveAuthConfig(over.env ?? ENTRA, true),
    verifyDemoCredentials: async (e, p) => (e === DEMO.email && p === 'right' ? DEMO : null),
    ssoClient: () => sso.client,
    apiBaseUrl: null,
    userService: {
      getAll: async () => ({ ok: true, data: people }),
      update: async (id, changes) => { updates.push({ id, changes }); const s = people.find(p => p.id === id)!; Object.assign(s, changes); return { ok: true, data: s }; },
    },
    roleService: { getAll: async () => ({ ok: true, data: ROLES as never }) },
    auditService: { logEvent: async e => { audit.push(e); return { ok: true, data: { ...e, id: 'a', timestamp: '' } }; } },
    draftCacheService: { clearAllDraftsForUser: async id => { drafts.push(id); return { ok: true, data: undefined }; } },
    markers,
    profileStore: { read: () => stored, write: p => { stored = p; } },
    shouldShowBiometricWizard: () => false,
    now: () => new Date('2026-09-26T12:00:00Z'),
    ...over,
  };
  return { session: createAuthSession(deps), audit, updates, markers, sso, drafts, stored: () => stored, people };
}

describe('password sign-in: passwords set from the Staff screen (Batch 448)', () => {
  const check = (map: Record<string, { pw: string; mustChange?: boolean; staffId: string }>) =>
    async (email: string, password: string) => {
      const r = map[email];
      if (!r) return { result: 'none' as const };
      return r.pw === password ? { result: 'match' as const, staffId: r.staffId, mustChange: !!r.mustChange } : { result: 'wrong' as const };
    };
  it('a staff-set password signs in a demo account with its own profile', async () => {
    const t = setup({ people: [staff('PATH-001', DEMO.email)], verifyStaffPassword: check({ [DEMO.email]: { pw: 'new-long-password', staffId: 'PATH-001' } }), demoAccountFor: async id => (id === 'PATH-001' ? DEMO : undefined) });
    expect(await t.session.signInWithPassword(DEMO.email, 'new-long-password')).toMatchObject({ id: 'PATH-001', role: 'superadmin', authMethod: 'password' });
  });
  it('once set, the built-in demo password no longer works', async () => {
    const t = setup({ people: [staff('PATH-001', DEMO.email)], verifyStaffPassword: check({ [DEMO.email]: { pw: 'new-long-password', staffId: 'PATH-001' } }) });
    expect(await t.session.signInWithPassword(DEMO.email, 'right')).toBeNull();
  });
  it('with no staff-set password, the built-in demo password still works', async () => {
    const t = setup({ people: [staff('PATH-001', DEMO.email)], verifyStaffPassword: check({}) });
    expect(await t.session.signInWithPassword(DEMO.email, 'right')).toMatchObject({ id: 'PATH-001' });
  });
  it('someone with no demo account gets the app role their staff roles give', async () => {
    const ld = staff('LD-001', 'r.okafor@dvmc.org', { firstName: 'Rachel', lastName: 'Okafor', roles: ['Pathologist', 'Admin'] });
    const t = setup({ people: [ld], verifyStaffPassword: check({ 'r.okafor@dvmc.org': { pw: 'a-long-password', staffId: 'LD-001' } }), demoAccountFor: async () => undefined });
    expect(await t.session.signInWithPassword('r.okafor@dvmc.org', 'a-long-password')).toMatchObject({ id: 'LD-001', name: 'Rachel Okafor', role: 'pathologist-admin', initials: 'RO', authMethod: 'password' });
  });
  it('Batch 456 correction: a staff-set password for Grace Liu (QA Reviewer only) signs her in with her built-in account\'s role', async () => {
    const grace = staff('QA-001', 'grace.liu@demo.pathscribe.ai', { firstName: 'Grace', lastName: 'Liu', roles: ['QA Reviewer'] });
    const account: DemoAccount = { ...DEMO, email: 'grace.liu@demo.pathscribe.ai', id: 'QA-001', name: 'Grace Liu', role: 'pathologist', initials: 'GL' };
    const t = setup({ people: [grace], verifyStaffPassword: check({ 'grace.liu@demo.pathscribe.ai': { pw: 'a-long-password', staffId: 'QA-001' } }), demoAccountFor: async id => (id === 'QA-001' ? account : undefined) });
    expect(await t.session.signInWithPassword('grace.liu@demo.pathscribe.ai', 'a-long-password')).toMatchObject({ id: 'QA-001', name: 'Grace Liu', role: 'pathologist', authMethod: 'password' });
  });
  it('a staff record whose roles give no app access is refused', async () => {
    const doc = staff('PHY-1', 'doc@clinic.org', { roles: ['Physician'] });
    const t = setup({ people: [doc], verifyStaffPassword: check({ 'doc@clinic.org': { pw: 'a-long-password', staffId: 'PHY-1' } }) });
    expect(await t.session.signInWithPassword('doc@clinic.org', 'a-long-password')).toBeNull();
  });
  it('a password that must be changed starts no session', async () => {
    const t = setup({ people: [staff('PATH-001', DEMO.email)], verifyStaffPassword: check({ [DEMO.email]: { pw: 'temporary-password', staffId: 'PATH-001', mustChange: true } }) });
    expect(await t.session.signInWithPassword(DEMO.email, 'temporary-password')).toBe('password_change_required');
    expect(t.stored()).toBeNull();
  });
});

describe('Batch 456: sign-in lockout (5 failures, 15 minutes)', () => {
  const memoryLocks = () => {
    const m = new Map<string, { failures: number; lockedUntil: string | null }>();
    return { m, store: { read: (k: string) => m.get(k) ?? null, write: (k: string, s: { failures: number; lockedUntil: string | null }) => { m.set(k, s); }, clear: (ks: readonly string[]) => ks.forEach(k => m.delete(k)) } };
  };
  const at = (min: number) => () => new Date(Date.parse('2026-10-04T12:00:00Z') + min * 60_000);

  it('counts down, locks on the 5th failure, and audits each failure and the lock without the password', async () => {
    const locks = memoryLocks();
    const t = setup({ signInLocks: locks.store, accountNameFor: async e => (e === DEMO.email ? 'Pete Nimmo' : null), now: at(0) });
    for (const left of [4, 3, 2, 1]) expect(await t.session.signInWithPassword(DEMO.email, 'Wrong-Guess-1')).toEqual({ refused: 'invalid', attemptsLeft: left });
    expect(await t.session.signInWithPassword(' Demo@PathScribe.ai ', 'Wrong-Guess-1')).toEqual({ refused: 'locked', lockedUntil: '2026-10-04T12:15:00.000Z' });
    expect(t.audit.filter(a => a.event === 'Sign-in failed')).toHaveLength(5);
    expect(t.audit.find(a => a.event === 'Sign-in locked')).toMatchObject({ user: 'Pete Nimmo', detail: expect.stringContaining('15 minutes after 5 failed attempts') });
    expect(JSON.stringify(t.audit)).not.toContain('Wrong-Guess-1');
  });

  it('while locked, even the right password is refused and not checked; after 15 minutes it works and the count clears', async () => {
    const locks = memoryLocks();
    locks.m.set(DEMO.email, { failures: 5, lockedUntil: '2026-10-04T12:15:00.000Z' });
    const verify = vi.fn(async (e: string, p: string) => (e === DEMO.email && p === 'right' ? DEMO : null));
    const locked = setup({ signInLocks: locks.store, verifyDemoCredentials: verify, now: at(10) });
    expect(await locked.session.signInWithPassword(DEMO.email, 'right')).toEqual({ refused: 'locked', lockedUntil: '2026-10-04T12:15:00.000Z' });
    expect(verify).not.toHaveBeenCalled();
    expect(locked.audit.find(a => a.event === 'Sign-in refused')).toMatchObject({ user: 'Unknown email' });
    const later = setup({ signInLocks: locks.store, verifyDemoCredentials: verify, now: at(15) });
    expect(await later.session.signInWithPassword(DEMO.email, 'right')).toMatchObject({ id: 'PATH-001' });
    expect(locks.m.get(DEMO.email)).toEqual({ failures: 0, lockedUntil: null });
  });

  it('a right password resets the count; an email nobody has is counted the same way', async () => {
    const locks = memoryLocks();
    const t = setup({ signInLocks: locks.store, now: at(0) });
    await t.session.signInWithPassword(DEMO.email, 'nope');
    await t.session.signInWithPassword(DEMO.email, 'nope');
    await t.session.signInWithPassword(DEMO.email, 'right');
    expect(await t.session.signInWithPassword(DEMO.email, 'nope')).toEqual({ refused: 'invalid', attemptsLeft: 4 });
    expect(await t.session.signInWithPassword('nobody@nowhere.org', 'nope')).toEqual({ refused: 'invalid', attemptsLeft: 4 });
  });

  it('a staff-set password that is wrong counts too; one that must be changed clears the count', async () => {
    const locks = memoryLocks();
    const verifyStaffPassword = async (_e: string, p: string) => (p === 'temporary-password' ? { result: 'match' as const, staffId: 'PATH-001', mustChange: true } : { result: 'wrong' as const });
    const t = setup({ signInLocks: locks.store, verifyStaffPassword, now: at(0) });
    expect(await t.session.signInWithPassword(DEMO.email, 'right')).toEqual({ refused: 'invalid', attemptsLeft: 4 });
    expect(await t.session.signInWithPassword(DEMO.email, 'temporary-password')).toBe('password_change_required');
    expect(locks.m.get(DEMO.email)).toEqual({ failures: 0, lockedUntil: null });
  });
});

describe('password sign-in (demo accounts)', () => {
  it('signs in a demo account with its staff fields', async () => {
    const t = setup({ people: [staff('PATH-001', 'pete.nimmo@pathscribe.ai', { organisationId: 'ORG-DVMC', canViewOrchestration: true })] });
    const p = await t.session.signInWithPassword(DEMO.email, 'right');
    expect(p).toMatchObject({ id: 'PATH-001', role: 'superadmin', authMethod: 'password', organisationId: 'ORG-DVMC', canViewOrchestration: true });
  });
  it('refuses a wrong password', async () => {
    expect(await setup().session.signInWithPassword(DEMO.email, 'wrong')).toBeNull();
  });
  it('is off in sso mode, and in a build without the demo accounts', async () => {
    expect(await setup({ env: { ...ENTRA, VITE_AUTH_MODE: 'sso' } }).session.signInWithPassword(DEMO.email, 'right')).toBeNull();
    expect(await setup({ verifyDemoCredentials: null }).session.signInWithPassword(DEMO.email, 'right')).toBeNull();
  });
});

describe('SSO sign-in (no API server: matched against the local staff directory)', () => {
  it('first sign-in links the account by email, audits the link, and returns the profile and return path', async () => {
    const t = setup();
    const r = await t.session.completeSsoSignIn('microsoft', 'https://app/auth/callback/microsoft?code=c');
    expect(r).toMatchObject({ ok: true, returnPath: '/worklist', profile: { id: '1', name: 'Sarah Chen', role: 'pathologist', authMethod: 'sso', ssoProviderId: 'microsoft', organisationId: 'ORG-DVMC' } });
    expect(t.updates).toEqual([{ id: '1', changes: { externalIdentities: [{ providerId: 'microsoft', issuer: ISS, subject: 'oid-1', linkedAt: '2026-09-26T12:00:00.000Z', linkedBy: 'first-sign-in' }] } }]);
    expect(t.audit.map(a => a.event)).toEqual(['SSO account linked']);
    expect(t.audit[0].detail).toBe('Account at Microsoft Entra ID linked to staff record 1 at first sign-in, matched by email.');

    // Next time the link is used (no second update), even if the email changed.
    t.people[0].email = 'sarah.chen@hospital.org';
    expect(await t.session.completeSsoSignIn('microsoft', 'u2')).toMatchObject({ ok: true, profile: { id: '1' } });
    expect(t.updates).toHaveLength(1);
  });

  it('refuses someone with no staff record, audits it, and forgets their tokens', async () => {
    const t = setup({ people: [staff('1', 'someone-else@hospital.org')] });
    expect(await t.session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'not_provisioned' });
    expect(t.audit).toEqual([expect.objectContaining({ event: 'SSO sign-in refused', detail: 'Sign-in with Microsoft Entra ID refused (not_provisioned).', user: 'schen@hospital.org' })]);
    expect(t.sso.signedOut).toEqual(['microsoft']);
  });

  it('refuses a directory-only role (no app access)', async () => {
    const t = setup({ people: [staff('1', 'schen@hospital.org', { roles: ['Physician'] })] });
    expect(await t.session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'no_app_access' });
    expect(t.updates).toEqual([]); // nothing linked for someone who can't sign in
  });

  it('passes on the provider refusal, and refuses a provider this build does not offer', async () => {
    expect(await setup({ completion: { ok: false, reason: 'cancelled' } }).session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'cancelled' });
    expect(await setup().session.completeSsoSignIn('oidc', 'u')).toEqual({ ok: false, reason: 'not_configured' });
  });
});

describe('SSO sign-in through the API server', () => {
  it('asks /api/me with the access token and uses its profile', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ profile: { id: 'S-9', name: 'Dr Ada', email: 'ada@h.org', role: 'pathologist-admin', initials: 'DA', voiceProfile: 'EN-GB', organisationId: 'ORG-1' } }), { status: 200 }));
    const t = setup({ apiBaseUrl: 'https://api.h.org/', fetch: fetch as unknown as typeof globalThis.fetch });
    const r = await t.session.completeSsoSignIn('microsoft', 'u');
    expect(r).toMatchObject({ ok: true, profile: { id: 'S-9', role: 'pathologist-admin', authMethod: 'sso', ssoProviderId: 'microsoft' } });
    expect(fetch).toHaveBeenCalledWith('https://api.h.org/api/me', { headers: { Authorization: 'Bearer access-token', Accept: 'application/json' } });
    expect(t.updates).toEqual([]); // the server does the linking
  });

  it('maps the server refusals', async () => {
    const reply = (status: number, body: unknown) => setup({ apiBaseUrl: 'https://api', fetch: (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch });
    expect(await reply(403, { reason: 'inactive' }).session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'inactive' });
    expect(await reply(403, { reason: 'something-new' }).session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'not_provisioned' });
    expect(await reply(401, {}).session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'invalid_token' });
    expect(await reply(500, {}).session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'server_unavailable' });
    expect(await reply(200, { profile: { id: 'x', name: 'y', role: 'god' } }).session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'server_unavailable' });
    const down = setup({ apiBaseUrl: 'https://api', fetch: (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch });
    expect(await down.session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'server_unavailable' });
  });
});

describe('starting and ending a session', () => {
  const profile = { id: '1', name: 'Sarah Chen', email: 'e', role: 'pathologist', initials: 'SC', voiceProfile: 'EN-US', authMethod: 'sso', ssoProviderId: 'microsoft' } as SessionProfile;

  it('reports a conflict with another tab unless the user confirmed, and audits the sign-in', () => {
    const t = setup();
    t.markers.active.set('1', 'other-tab');
    expect(t.session.startSession(profile, false)).toEqual({ result: 'session_conflict' });
    expect(t.stored()).toBeNull();
    expect(t.session.startSession(profile, true)).toEqual({ result: 'success', showBiometricWizard: false });
    expect(t.stored()).toEqual(profile);
    expect(t.markers.active.get('1')).toBe(t.markers.own);
    expect(t.audit.slice(-1)[0]).toMatchObject({ event: 'Signed in', detail: 'Signed in with Microsoft Entra ID.', user: 'Sarah Chen' });
  });

  it('explicit sign-out clears drafts, releases the marker, forgets SSO tokens', () => {
    const t = setup();
    t.session.startSession(profile, false);
    t.session.endSession(profile, true);
    expect(t.drafts).toEqual(['1']);
    expect(t.markers.active.has('1')).toBe(false);
    expect(t.markers.own).toBeNull();
    expect(t.sso.signedOut).toEqual(['microsoft']);
    expect(t.stored()).toBeNull();
  });

  it('idle timeout keeps drafts; a superseded tab leaves the newer marker alone', () => {
    const t = setup();
    t.session.startSession(profile, false);
    t.markers.active.set('1', 'newer-tab');
    t.session.endSession(profile, false);
    expect(t.drafts).toEqual([]);
    expect(t.markers.active.get('1')).toBe('newer-tab');
  });

  it('a cancelled conflict prompt forgets the pending SSO tokens', async () => {
    const t = setup();
    await t.session.abandonPendingSession(profile);
    expect(t.sso.signedOut).toEqual(['microsoft']);
  });
});

describe('restoring a session on page load', () => {
  const pw = { id: 'PATH-001', name: 'Pete', email: 'e', role: 'superadmin', initials: 'PN', voiceProfile: '', canViewPediatric: false, canViewOrchestration: false, canAccessCrossTenantQa: false, organisationId: 'ORG-DVMC' } as unknown as SessionProfile;
  const sso = { ...pw, id: '1', role: 'pathologist', authMethod: 'sso', ssoProviderId: 'microsoft' } as SessionProfile;

  it('keeps a password session in demo mode (a pre-Batch-343 one has no authMethod)', async () => {
    const t = setup({ stored: pw });
    expect(await t.session.restoreSession()).toMatchObject({ id: 'PATH-001', voiceProfile: 'EN-US' });
  });

  it('drops a password session in an sso build', async () => {
    const t = setup({ env: { ...ENTRA, VITE_AUTH_MODE: 'sso' }, stored: pw });
    expect(await t.session.restoreSession()).toBeNull();
    expect(t.stored()).toBeNull();
  });

  it('keeps an SSO session only while its tokens are there and its provider is offered', async () => {
    expect(await setup({ stored: sso }).session.restoreSession()).toMatchObject({ id: '1' });
    const noTokens = setup({ stored: sso, hasSession: false });
    expect(await noTokens.session.restoreSession()).toBeNull();
    expect(noTokens.stored()).toBeNull();
    expect(await setup({ stored: sso, env: {} }).session.restoreSession()).toBeNull();
  });

  it('fills in staff fields a stored session predates (otherwise no organisation = no cases)', async () => {
    const old = { ...pw, organisationId: undefined } as SessionProfile;
    const t = setup({ stored: old, people: [staff('PATH-001', 'x', { organisationId: 'ORG-DVMC' })] });
    expect(await t.session.restoreSession()).toMatchObject({ organisationId: 'ORG-DVMC', canViewPediatric: true });
    expect(t.stored()).toMatchObject({ organisationId: 'ORG-DVMC' });
  });

  it('takes back the active-session marker a reload released, unless another tab has it', async () => {
    const t = setup({ stored: pw });
    t.markers.own = 'tab-a';
    await t.session.restoreSession();
    expect(t.markers.active.get('PATH-001')).toBe('tab-a');
    const u = setup({ stored: pw });
    u.markers.own = 'tab-a';
    u.markers.active.set('PATH-001', 'tab-b');
    await u.session.restoreSession();
    expect(u.markers.active.get('PATH-001')).toBe('tab-b');
  });

  it('nothing stored: nothing restored', async () => {
    expect(await setup().session.restoreSession()).toBeNull();
  });
});

describe('the access token for API and hub calls', () => {
  it('only for an SSO session', async () => {
    const sso = { id: '1', authMethod: 'sso', ssoProviderId: 'microsoft' } as SessionProfile;
    expect(await setup({ stored: sso }).session.accessToken()).toBe('access-token');
    expect(await setup({ stored: { ...sso, authMethod: 'password' } }).session.accessToken()).toBeNull();
    expect(await setup().session.accessToken()).toBeNull();
  });
});

// ── Batch 611 (#157): the second factor on single sign-on and on restore ───

describe('multi-factor sign-in (Batch 611)', () => {
  const mfaFor = async (mode: 'off' | 'all', at = new Date('2026-09-26T12:00:00Z')) => {
    const mfa = createMfaService({
      stores: memoryMfaStores(), secretFor: null, audit: { logEvent: async e => ({ ok: true, data: { ...e, id: 'a', timestamp: '' } }) },
      enforce: async () => true, now: () => at,
    });
    await mfa.savePolicy({ id: 'x', name: 'x', email: '', role: 'admin', initials: 'X', voiceProfile: 'EN-US', organisationId: 'ORG-DVMC' }, { mode, sessionMaxHours: 8 });
    return mfa;
  };
  const claims = (extra: Record<string, unknown>) => ({ ok: true as const, providerId: 'microsoft' as const, claims: { iss: ISS, sub: 'x', oid: 'oid-1', email: 'SChen@hospital.org', ...extra }, returnPath: '/worklist' });

  it('refuses a single sign-on that the provider did not back with a second factor, and signs out of the provider', async () => {
    const t = setup({ completion: claims({ amr: ['pwd'] }), mfa: await mfaFor('all') });
    expect(await t.session.completeSsoSignIn('microsoft', 'u')).toEqual({ ok: false, reason: 'mfa_required' });
    expect(t.sso.signedOut).toEqual(['microsoft']);
    expect(t.stored()).toBeNull();
  });
  it('accepts it when the claims assert MFA, and the profile carries the stamp', async () => {
    const t = setup({ completion: claims({ amr: ['pwd', 'mfa'] }), mfa: await mfaFor('all') });
    const r = await t.session.completeSsoSignIn('microsoft', 'u');
    expect(r).toMatchObject({ ok: true, profile: { id: '1', mfa: { organisationId: 'ORG-DVMC', userId: '1', method: 'idp' } } });
  });
  it('asks nothing when the organisation does not require it', async () => {
    const t = setup({ completion: claims({ amr: ['pwd'] }), mfa: await mfaFor('off') });
    expect(await t.session.completeSsoSignIn('microsoft', 'u')).toMatchObject({ ok: true });
  });
  it('a restored session whose second factor has expired is dropped and the provider signed out', async () => {
    const stamp = { organisationId: 'ORG-DVMC', userId: '1', verifiedAt: '2026-09-26T01:00:00Z', method: 'idp' as const };
    const stored: SessionProfile = { id: '1', name: 'Sarah Chen', email: 'schen@hospital.org', role: 'pathologist', initials: 'SC', voiceProfile: 'EN-US', authMethod: 'sso', ssoProviderId: 'microsoft', organisationId: 'ORG-DVMC', canViewPediatric: true, mfa: stamp };
    const live = setup({ stored, mfa: await mfaFor('all', new Date('2026-09-26T05:00:00Z')) });
    expect(await live.session.restoreSession()).toMatchObject({ id: '1' });
    const expired = setup({ stored, mfa: await mfaFor('all', new Date('2026-09-26T12:00:00Z')) });
    expect(await expired.session.restoreSession()).toBeNull();
    expect(expired.stored()).toBeNull();
    expect(expired.sso.signedOut).toEqual(['microsoft']);
  });
});
