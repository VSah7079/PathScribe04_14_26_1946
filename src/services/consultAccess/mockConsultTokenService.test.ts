// src/services/consultAccess/mockConsultTokenService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Batch 515: the user actions check their capability; `allowed` switches the answer.
const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async (capability: string) => { auth.asked.push(capability); return { allowed: auth.allowed }; } },
}));
// Batch 522: openConsult reads the case from the case store.
vi.mock('../cases/mockCaseService', () => ({
  mockCaseService: { getCase: async (id: string) => ({ id, accession: { accessionNumber: id }, patient: { firstName: 'Ana', lastName: 'Ruiz' }, specimens: [] }) },
}));
import { mockConsultTokenService } from './mockConsultTokenService';
import { CONSULT_LINK_NOT_PERMITTED } from './IConsultTokenService';

// Real, minimal localStorage mock — same established pattern every
// other storage-backed service test in this app uses (confirmed
// directly against mockQaActivityTypeService.test.ts) — this
// project's real test environment provides no real localStorage global
// at all.
beforeEach(() => {
  auth.allowed = true; auth.asked = [];
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
