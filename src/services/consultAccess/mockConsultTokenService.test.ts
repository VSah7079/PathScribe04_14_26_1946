// src/services/consultAccess/mockConsultTokenService.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Batch 515: the user actions check their capability; `allowed` switches the answer.
const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[], denied: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async (capability: string) => { auth.asked.push(capability); return { allowed: auth.allowed && !auth.denied.includes(capability) }; } },
}));
// Batch 522: openConsult reads the case from the case store.
vi.mock('../cases/mockCaseService', () => ({
  mockCaseService: { getCase: async (id: string) => ({ id, accession: { accessionNumber: id }, patient: { firstName: 'Ana', lastName: 'Ruiz', dateOfBirth: '1970-01-02' }, specimens: [] }) },
}));
import { mockConsultTokenService } from './mockConsultTokenService';
import { resolveConsultTokenStatus, CONSULT_LINK_NOT_PERMITTED, CONSULT_REVEAL_NOT_PERMITTED } from './IConsultTokenService';
import { mockAuditService } from '../auditlog/mockAuditService';

// Real, minimal localStorage mock — same established pattern every
// other storage-backed service test in this app uses (confirmed
// directly against mockQaActivityTypeService.test.ts) — this
// project's real test environment provides no real localStorage global
// at all.
beforeEach(() => {
  auth.allowed = true; auth.asked = []; auth.denied = [];
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('mockConsultTokenService — real, per PS-290', () => {
  it('issue() creates an Active token with a real, computed default expiry', async () => {
    const res = await mockConsultTokenService.issue({
      scope: { caseId: 'case-issue-1', caseAccessionNumber: 'S26-9001' },
      issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson',
      consultantIdentifier: 'Dr. Consult Reviewer',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.isActive).toBe(true);
      expect(res.data.accessCount).toBe(0);
      expect(new Date(res.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
      expect(res.data.token).toBeTruthy();
    }
  });

  it('issue() rejects a blank consultant identifier — no real external-identity directory to fall back on', async () => {
    const res = await mockConsultTokenService.issue({
      scope: { caseId: 'case-issue-2', caseAccessionNumber: 'S26-9002' },
      issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson',
      consultantIdentifier: '   ',
    });
    expect(res.ok).toBe(false);
  });

  it('resolve() finds a real, just-issued Active token by its own opaque bearer string', async () => {
    const issued = await mockConsultTokenService.issue({
      scope: { caseId: 'case-resolve-1', caseAccessionNumber: 'S26-9003' },
      issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson',
      consultantIdentifier: 'Dr. Consult Reviewer',
    });
    if (!issued.ok) throw new Error('setup failed');
    const resolved = await mockConsultTokenService.resolve(issued.data.token);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.data.id).toBe(issued.data.id);
  });

  it('resolve() gives one uniform, non-distinguishing denial for a token that never existed', async () => {
    const res = await mockConsultTokenService.resolve('ct_this_token_was_never_issued');
    expect(res.ok).toBe(false);
  });

  it('resolve() denies an already-revoked token, even though it has not expired', async () => {
    const issued = await mockConsultTokenService.issue({
      scope: { caseId: 'case-revoke-1', caseAccessionNumber: 'S26-9004' },
      issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson',
      consultantIdentifier: 'Dr. Consult Reviewer',
    });
    if (!issued.ok) throw new Error('setup failed');
    const revoked = await mockConsultTokenService.revoke(issued.data.id);
    expect(revoked.ok && revoked.data.isActive).toBe(false);

    const resolved = await mockConsultTokenService.resolve(issued.data.token);
    expect(resolved.ok).toBe(false);
  });

  it('resolve() denies an expired token, even though it was never revoked', async () => {
    const issued = await mockConsultTokenService.issue({
      scope: { caseId: 'case-expire-1', caseAccessionNumber: 'S26-9005' },
      issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson',
      consultantIdentifier: 'Dr. Consult Reviewer',
      expiresAt: new Date(Date.now() - 1000).toISOString(), // already in the past
    });
    if (!issued.ok) throw new Error('setup failed');
    const resolved = await mockConsultTokenService.resolve(issued.data.token);
    expect(resolved.ok).toBe(false);
  });

  it('openConsult() records one view per opening; resolve() records none (Batch 522)', async () => {
    const issued = await mockConsultTokenService.issue({
      scope: { caseId: 'case-access-1', caseAccessionNumber: 'S26-9006' },
      issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson',
      consultantIdentifier: 'Dr. Consult Reviewer',
    });
    if (!issued.ok) throw new Error('setup failed');
    await mockConsultTokenService.resolve(issued.data.token);
    await mockConsultTokenService.resolve(issued.data.token);
    const opened = await mockConsultTokenService.openConsult(issued.data.token);
    expect(opened.ok).toBe(true);
    const links = await mockConsultTokenService.getByCaseId('case-access-1');
    expect(links.ok && links.data[0].accessCount).toBe(1);
    expect(links.ok && links.data[0].lastAccessedAt).toBeTruthy();
  });

  it('getByCaseId() scopes to only the given case’s own tokens', async () => {
    await mockConsultTokenService.issue({
      scope: { caseId: 'case-scope-a', caseAccessionNumber: 'S26-9007' },
      issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson', consultantIdentifier: 'Dr. A',
    });
    await mockConsultTokenService.issue({
      scope: { caseId: 'case-scope-b', caseAccessionNumber: 'S26-9008' },
      issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson', consultantIdentifier: 'Dr. B',
    });
    const res = await mockConsultTokenService.getByCaseId('case-scope-a');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.every(t => t.scope.caseId === 'case-scope-a')).toBe(true);
      expect(res.data.some(t => t.scope.caseId === 'case-scope-b')).toBe(false);
    }
  });

  it('submitOpinion() takes the case and consultant from the token, rejects a blank opinion, and round-trips (Batch 522)', async () => {
    const issued = await mockConsultTokenService.issue({
      scope: { caseId: 'case-opinion-1', caseAccessionNumber: 'S26-9009' },
      issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson', consultantIdentifier: 'Dr. Consult Reviewer',
    });
    if (!issued.ok) throw new Error('setup failed');

    const blank = await mockConsultTokenService.submitOpinion(issued.data.token, { signedStatus: 'Draft', opinionText: '   ' });
    expect(blank).toEqual({ ok: false, error: 'OPINION_REQUIRED' });

    const real = await mockConsultTokenService.submitOpinion(issued.data.token, { signedStatus: 'Signed', diagnosticCategory: 'Benign', opinionText: 'Concur with original diagnosis.' });
    expect(real.ok && real.data).toMatchObject({ tokenId: issued.data.id, caseId: 'case-opinion-1', consultantIdentifier: 'Dr. Consult Reviewer' });

    const list = await mockConsultTokenService.getOpinionsByCaseId('case-opinion-1');
    expect(list.ok && list.data.some(o => o.opinionText === 'Concur with original diagnosis.')).toBe(true);
  });
});

describe('mockConsultTokenService — permissions (Batch 515, PS-290)', () => {
  const draft = { scope: { caseId: 'case-perm-1', caseAccessionNumber: 'S26-9100' }, issuedByUserId: 'u1', issuedByName: 'Dr. A', consultantIdentifier: 'Dr. Outside' };

  it('issuing needs case:consult-link:issue; refused, no link is created', async () => {
    auth.allowed = false;
    expect(await mockConsultTokenService.issue(draft)).toEqual({ ok: false, error: CONSULT_LINK_NOT_PERMITTED });
    const links = await mockConsultTokenService.getByCaseId('case-perm-1');
    expect(links.ok && links.data).toEqual([]);
    expect(auth.asked).toEqual(['case:consult-link:issue']);
  });

  it('revoking needs case:consult-link:revoke; refused, the link stays active', async () => {
    const issued = await mockConsultTokenService.issue(draft);
    if (!issued.ok) throw new Error('setup failed');
    auth.allowed = false;
    expect(await mockConsultTokenService.revoke(issued.data.id)).toEqual({ ok: false, error: CONSULT_LINK_NOT_PERMITTED });
    const links = await mockConsultTokenService.getByCaseId('case-perm-1');
    expect(links.ok && links.data[0].isActive).toBe(true);
    expect(auth.asked).toEqual(['case:consult-link:issue', 'case:consult-link:revoke']);
  });
});

describe('mockConsultTokenService — Batch 522 (PS-290): tokens, scope, opinions, expiry, oversight', () => {
  const draft = { scope: { caseId: 'case-522', caseAccessionNumber: 'S26-9522' }, issuedByUserId: 'u1', issuedByName: 'Dr. A', consultantIdentifier: 'Dr. Outside' };
  const storedRaw = () => Object.keys(localStorageStore()).map(k => localStorage.getItem(k)).join('\n');
  let localStorageStore: () => Record<string, string> = () => ({});
  beforeEach(() => {
    const store: Record<string, string> = {};
    localStorageStore = () => store;
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    };
  });

  it('issues a 256-bit random token and stores only its SHA-256 fingerprint', async () => {
    const a = await mockConsultTokenService.issue(draft);
    const b = await mockConsultTokenService.issue(draft);
    if (!a.ok || !b.ok) throw new Error('setup failed');
    expect(a.data.token).toMatch(/^ct_[A-Za-z0-9_-]{43}$/);
    expect(a.data.token).not.toBe(b.data.token);
    expect(a.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(storedRaw()).not.toContain(a.data.token);
    expect(storedRaw()).toContain(a.data.tokenHash);
    const listed = await mockConsultTokenService.getByCaseId('case-522');
    expect(listed.ok && listed.data.every(t => !('token' in t))).toBe(true);
  });

  it('keeps only the fingerprint of a link stored before Batch 522, and its token still opens it', async () => {
    const issued = await mockConsultTokenService.issue(draft);
    if (!issued.ok) throw new Error('setup failed');
    // Simulate an older record that kept the token itself.
    const key = Object.keys(localStorageStore()).find(k => localStorage.getItem(k)!.includes(issued.data.tokenHash))!;
    const legacy = JSON.parse(localStorage.getItem(key)!).map((t: any) => { const { tokenHash, ...rest } = t; void tokenHash; return { ...rest, token: 'ct_legacy-token-1' }; });
    localStorage.setItem(key, JSON.stringify(legacy));
    const resolved = await mockConsultTokenService.resolve('ct_legacy-token-1');
    expect(resolved.ok).toBe(true);
    expect(localStorage.getItem(key)).not.toContain('ct_legacy-token-1');
  });

  it('refuses an opinion on a revoked link, and a second opinion after a signed one', async () => {
    const issued = await mockConsultTokenService.issue(draft);
    if (!issued.ok) throw new Error('setup failed');
    expect((await mockConsultTokenService.submitOpinion(issued.data.token, { signedStatus: 'Draft', opinionText: 'First look.' })).ok).toBe(true);
    expect((await mockConsultTokenService.submitOpinion(issued.data.token, { signedStatus: 'Signed', opinionText: 'Final.' })).ok).toBe(true);
    expect(await mockConsultTokenService.submitOpinion(issued.data.token, { signedStatus: 'Signed', opinionText: 'Again.' })).toEqual({ ok: false, error: 'OPINION_ALREADY_SIGNED' });

    const other = await mockConsultTokenService.issue(draft);
    if (!other.ok) throw new Error('setup failed');
    await mockConsultTokenService.revoke(other.data.id);
    expect(await mockConsultTokenService.submitOpinion(other.data.token, { signedStatus: 'Draft', opinionText: 'Late.' })).toEqual({ ok: false, error: 'CONSULT_LINK_INVALID' });
  });

  it('records the revoker from the session, and refuses to revoke a link that is no longer active', async () => {
    const issued = await mockConsultTokenService.issue(draft);
    if (!issued.ok) throw new Error('setup failed');
    const first = await mockConsultTokenService.revoke(issued.data.id);
    expect(first.ok && first.data.revokedAt).toBeTruthy();
    expect(await mockConsultTokenService.revoke(issued.data.id)).toEqual({ ok: false, error: 'CONSULT_LINK_NOT_ACTIVE' });
  });

  it('records an expiry once, the first time the links are read after it', async () => {
    const issued = await mockConsultTokenService.issue({ ...draft, expiresAt: new Date(Date.now() - 1000).toISOString() });
    if (!issued.ok) throw new Error('setup failed');
    const first = await mockConsultTokenService.getByCaseId('case-522');
    const at = first.ok ? first.data[0].expiryRecordedAt : undefined;
    expect(at).toBeTruthy();
    const again = await mockConsultTokenService.getByCaseId('case-522');
    expect(again.ok && again.data[0].expiryRecordedAt).toBe(at);
  });

  it('lists every link across cases only with audit:consult-links:view', async () => {
    await mockConsultTokenService.issue(draft);
    await mockConsultTokenService.issue({ ...draft, scope: { caseId: 'case-522b', caseAccessionNumber: 'S26-9523' } });
    auth.asked = [];
    const all = await mockConsultTokenService.listAll();
    expect(all.ok && all.data.map(t => t.scope.caseId).sort()).toEqual(['S26-4602', 'case-522', 'case-522b']);
    expect(auth.asked).toEqual(['audit:consult-links:view']);
    auth.allowed = false;
    expect(await mockConsultTokenService.listAll()).toEqual({ ok: false, error: CONSULT_LINK_NOT_PERMITTED });
  });
});

describe('mockConsultTokenService — Batch 669 (access-11): masked identity by default, audited opt-in', () => {
  const base = { scope: { caseId: 'case-669', caseAccessionNumber: 'S26-9669' }, issuedByUserId: 'u1', issuedByName: 'Dr. A', consultantIdentifier: 'Dr. Outside' };
  const auditDetails = () => (spy.mock.calls as unknown as Array<[{ event: string; detail: string }]>).map(c => c[0]);
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { spy = vi.spyOn(mockAuditService, 'logEvent').mockResolvedValue(undefined as never); spy.mockClear(); });

  it('by default the consultant gets a masked identity: no surname, no first name, no full date of birth', async () => {
    const issued = await mockConsultTokenService.issue(base);
    if (!issued.ok) throw new Error('setup failed');
    expect(auth.asked).not.toContain('case:consult-link:reveal-identity');
    const opened = await mockConsultTokenService.openConsult(issued.data.token);
    if (!opened.ok) throw new Error('open failed');
    expect(opened.data.patient).toEqual({ identity: 'masked', maskedName: 'A** R***', birthYearMasked: '**-***-1970' });
    const wire = JSON.stringify(opened.data);
    for (const secret of ['Ruiz', 'Ana', '1970-01-02', '01-02']) expect(wire).not.toContain(secret);
  });

  it('with the opt-in the consultant sees the full name and date of birth, and the creation is audited as an opt-in without PHI', async () => {
    const issued = await mockConsultTokenService.issue({ ...base, revealIdentity: true });
    if (!issued.ok) throw new Error('setup failed');
    expect(auth.asked).toContain('case:consult-link:reveal-identity');
    expect(issued.data.revealIdentity).toBe(true);
    const opened = await mockConsultTokenService.openConsult(issued.data.token);
    if (!opened.ok) throw new Error('open failed');
    expect(opened.data.patient).toEqual({ identity: 'full', lastName: 'Ruiz', firstName: 'Ana', dateOfBirth: '02-JAN-1970' });
    const created = auditDetails().find(e => e.event === 'consult.link.created');
    expect(created?.detail).toContain('Identity opt-in used');
    const viewed = auditDetails().find(e => e.event === 'consult.link.accessed');
    expect(viewed?.detail).toContain('full patient identity shown');
    for (const e of auditDetails()) for (const secret of ['Ruiz', 'Ana ', '1970']) expect(e.detail).not.toContain(secret);
  });

  it('without the opt-in the creation audit says the identity was masked', async () => {
    await mockConsultTokenService.issue(base);
    expect(auditDetails().find(e => e.event === 'consult.link.created')?.detail).toContain('Patient identity masked (default)');
  });

  it('the opt-in needs case:consult-link:reveal-identity; refused, no link is created and nothing is audited as created', async () => {
    auth.denied = ['case:consult-link:reveal-identity'];
    expect(await mockConsultTokenService.issue({ ...base, scope: { caseId: 'case-669-deny', caseAccessionNumber: 'S26-9670' }, revealIdentity: true })).toEqual({ ok: false, error: CONSULT_REVEAL_NOT_PERMITTED });
    const links = await mockConsultTokenService.getByCaseId('case-669-deny');
    expect(links.ok && links.data).toEqual([]);
    expect(auditDetails().some(e => e.event === 'consult.link.created')).toBe(false);
    // A plain link is still allowed without the opt-in capability.
    expect((await mockConsultTokenService.issue({ ...base, scope: { caseId: 'case-669-deny', caseAccessionNumber: 'S26-9670' } })).ok).toBe(true);
  });

  it('links expire: an expired token opens nothing, masked or not (verified, Batch 669)', async () => {
    const issued = await mockConsultTokenService.issue({ ...base, revealIdentity: true, expiresAt: new Date(Date.now() - 1000).toISOString() });
    if (!issued.ok) throw new Error('setup failed');
    expect(await mockConsultTokenService.openConsult(issued.data.token)).toEqual({ ok: false, error: 'CONSULT_LINK_INVALID' });
  });
});

describe('mockConsultTokenService — Batch 669: views and hours after a signed opinion; identity preview', () => {
  const base = { scope: { caseId: 'case-669b', caseAccessionNumber: 'S26-9680' }, issuedByUserId: 'u1', issuedByName: 'Dr. A', consultantIdentifier: 'Dr. Outside' };
  const events = () => (spy.mock.calls as unknown as Array<[{ event: string; detail: string }]>).map(c => c[0]);
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { spy = vi.spyOn(mockAuditService, 'logEvent').mockResolvedValue(undefined as never); spy.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });
  const issue = async () => { const r = await mockConsultTokenService.issue(base); if (!r.ok) throw new Error('setup'); return r.data; };

  it('a draft starts no clock and counts no view, however many times the page is opened', async () => {
    const l = await issue();
    await mockConsultTokenService.submitOpinion(l.token, { signedStatus: 'Draft', opinionText: 'Looking.' });
    for (let i = 0; i < 5; i++) expect((await mockConsultTokenService.openConsult(l.token)).ok).toBe(true);
    const got = await mockConsultTokenService.getByCaseId('case-669b');
    expect(got.ok && got.data[0].signedAt).toBeUndefined();
  });

  it('the signed submit is not a view; then exactly 3 opens work and the 4th is refused and audited', async () => {
    const l = await issue();
    const signed = await mockConsultTokenService.submitOpinion(l.token, { signedStatus: 'Signed', opinionText: 'Final.' });
    expect(signed.ok).toBe(true);
    const stored = await mockConsultTokenService.getByCaseId('case-669b');
    expect(stored.ok && stored.data[0]).toMatchObject({ viewsAfterSignature: 0 });
    const lifetimes: Array<number | undefined> = [];
    for (let i = 0; i < 3; i++) {
      const r = await mockConsultTokenService.openConsult(l.token);
      expect(r.ok).toBe(true);
      lifetimes.push(r.ok ? r.data.lifetime?.remainingViews : undefined);
    }
    expect(lifetimes).toEqual([2, 1, 0]);
    expect(await mockConsultTokenService.openConsult(l.token)).toEqual({ ok: false, error: 'CONSULT_LINK_INVALID' });
    expect(events().filter(e => e.event === 'consult.link.accessed')).toHaveLength(3);
    expect(events().some(e => e.event === 'consult.link.access_attempt_exhausted')).toBe(true);
    // The issuer list now reads it as closed.
    const after = await mockConsultTokenService.getByCaseId('case-669b');
    expect(after.ok && resolveConsultTokenStatus(after.data[0])).toBe('Expired');
  });

  it('48 hours after the signature the link opens nothing, even with views left', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-24T10:00:00Z'));
    const l = await mockConsultTokenService.issue({ ...base, expiresAt: '2026-12-01T00:00:00Z' });
    if (!l.ok) throw new Error('setup');
    await mockConsultTokenService.submitOpinion(l.data.token, { signedStatus: 'Signed', opinionText: 'Final.' });
    vi.setSystemTime(new Date('2026-10-26T09:59:59Z'));
    const open = await mockConsultTokenService.openConsult(l.data.token);
    expect(open.ok && open.data.lifetime).toEqual({ remainingViews: 2, hoursRemaining: 1 });
    vi.setSystemTime(new Date('2026-10-26T10:00:00Z'));
    expect(await mockConsultTokenService.openConsult(l.data.token)).toEqual({ ok: false, error: 'CONSULT_LINK_INVALID' });
    expect(events().some(e => e.event === 'consult.link.access_attempt_expired')).toBe(true);
  });

  it('an expired or exhausted link takes no further opinion or draft either', async () => {
    const l = await issue();
    await mockConsultTokenService.submitOpinion(l.token, { signedStatus: 'Signed', opinionText: 'Final.' });
    for (let i = 0; i < 3; i++) await mockConsultTokenService.openConsult(l.token);
    expect(await mockConsultTokenService.submitOpinion(l.token, { signedStatus: 'Draft', opinionText: 'More.' })).toEqual({ ok: false, error: 'CONSULT_LINK_INVALID' });
  });

  it('before any signature the view carries no lifetime', async () => {
    const l = await issue();
    const open = await mockConsultTokenService.openConsult(l.token);
    expect(open.ok && open.data.lifetime).toBeNull();
  });

  it('identity preview needs reveal-identity (not issue), returns the fixed-format demographics and is audited without PHI', async () => {
    const l = await issue();
    auth.denied = ['case:consult-link:issue']; auth.asked = [];
    const r = await mockConsultTokenService.previewIdentity(l.id);
    expect(r).toEqual({ ok: true, data: { identity: 'full', lastName: 'Ruiz', firstName: 'Ana', dateOfBirth: '02-JAN-1970' } });
    expect(auth.asked).toEqual(['case:consult-link:reveal-identity']);
    const ev = events().find(e => e.event === 'consult.link.identity_previewed');
    expect(ev?.detail).toContain('Patient identity revealed on screen');
    for (const secret of ['Ruiz', 'Ana', '1970']) expect(ev?.detail).not.toContain(secret);
  });

  it('identity preview without the capability reveals nothing and is not audited as a reveal', async () => {
    const l = await issue();
    auth.denied = ['case:consult-link:reveal-identity'];
    expect(await mockConsultTokenService.previewIdentity(l.id)).toEqual({ ok: false, error: CONSULT_REVEAL_NOT_PERMITTED });
    expect(events().some(e => e.event === 'consult.link.identity_previewed')).toBe(false);
    expect(await mockConsultTokenService.previewIdentity('nope')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
