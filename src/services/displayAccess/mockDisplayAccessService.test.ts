import { describe, it, expect, beforeEach, vi } from 'vitest';

let allowed = true;
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: vi.fn(async () => ({ allowed })) },
}));

import { mockDisplayAccessService as svc, resetDisplayBindingsForTests } from './mockDisplayAccessService';
import { evaluateDisplayBinding, generateDisplayToken, hashDisplayToken, hashesMatch, type DisplayBinding } from './displayToken';

beforeEach(() => { allowed = true; resetDisplayBindingsForTests(); });

describe('Display Token helpers', () => {
  it('generates distinct, long, prefixed tokens', () => {
    const a = generateDisplayToken(); const b = generateDisplayToken();
    expect(a).not.toBe(b);
    expect(a.startsWith('psd_')).toBe(true);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('hashes deterministically and never returns the token', async () => {
    const h = await hashDisplayToken('psd_x');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(await hashDisplayToken(' psd_x '));
    expect(hashesMatch(h, h)).toBe(true);
    expect(hashesMatch(h, h.replace(/.$/, '0') === h ? 'a' : h.replace(/.$/, '0'))).toBe(false);
  });
  it('evaluates unbound, invalid, revoked, expired and valid', () => {
    const b: DisplayBinding = { kind: 'or-suite', subjectId: 't', tokenHash: 'aa', tokenHint: 'abcd', issuedAt: '2026-01-01T00:00:00Z', expiresAt: '2026-06-01T00:00:00Z' };
    const now = new Date('2026-03-01T00:00:00Z');
    expect(evaluateDisplayBinding(undefined, 'aa', now)).toBe('unbound');
    expect(evaluateDisplayBinding(b, null, now)).toBe('invalid');
    expect(evaluateDisplayBinding(b, 'bb', now)).toBe('invalid');
    expect(evaluateDisplayBinding(b, 'aa', now)).toBe('valid');
    expect(evaluateDisplayBinding(b, 'aa', new Date('2026-07-01T00:00:00Z'))).toBe('expired');
    expect(evaluateDisplayBinding({ ...b, revokedAt: '2026-02-01T00:00:00Z' }, 'aa', now)).toBe('revoked');
  });
});

describe('displayAccessService', () => {
  it('issues a token that verifies, and stores only its hash', async () => {
    const res = await svc.issueOrSuiteToken('term-1', 90);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(await svc.verify('or-suite', 'term-1', res.data.token)).toBe('valid');
    expect(JSON.stringify(res.data.binding)).not.toContain(res.data.token);
    expect(JSON.stringify(await svc.getAllSummaries('or-suite'))).not.toContain(res.data.token);
  });
  it('a token only works for its own display and kind', async () => {
    const res = await svc.issueOrSuiteToken('term-1');
    if (!res.ok) throw new Error('issue failed');
    expect(await svc.verify('or-suite', 'term-2', res.data.token)).toBe('unbound');
    expect(await svc.verify('facility-ops', 'term-1', res.data.token)).toBe('unbound');
    expect(await svc.verify('or-suite', 'term-1', 'psd_wrong')).toBe('invalid');
    expect(await svc.verify('or-suite', 'term-1', null)).toBe('invalid');
  });
  it('revoking stops the token at once; re-issuing replaces it', async () => {
    const first = await svc.issueFacilityOpsToken('p1');
    if (!first.ok) throw new Error('issue failed');
    await svc.revokeFacilityOpsToken('p1');
    expect(await svc.verify('facility-ops', 'p1', first.data.token)).toBe('revoked');
    const second = await svc.issueFacilityOpsToken('p1');
    if (!second.ok) throw new Error('issue failed');
    expect(await svc.verify('facility-ops', 'p1', second.data.token)).toBe('valid');
    expect(await svc.verify('facility-ops', 'p1', first.data.token)).toBe('invalid');
  });
  it('an expired token is refused', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const res = await svc.issueOrSuiteToken('term-1', 30);
      if (!res.ok) throw new Error('issue failed');
      vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));
      expect(await svc.verify('or-suite', 'term-1', res.data.token)).toBe('expired');
    } finally { vi.useRealTimers(); }
  });
  it('issuing and revoking need the display’s Configuration capability', async () => {
    allowed = false;
    const res = await svc.issueOrSuiteToken('term-1');
    expect(res.ok).toBe(false);
    expect(await svc.getSummary('or-suite', 'term-1')).toBeNull();
  });
  it('revoking where nothing was issued is an error', async () => {
    const res = await svc.revokeOrSuiteToken('none');
    expect(res.ok).toBe(false);
  });
});
