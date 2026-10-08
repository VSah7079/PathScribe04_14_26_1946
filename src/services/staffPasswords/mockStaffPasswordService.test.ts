// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const allowed = { value: true };
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: allowed.value }), evaluate: async () => ({ allowed: allowed.value }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('../users/mockUserService', () => ({
  mockUserService: {
    getById: async (id: string) => (id === 'S-1' ? { ok: true, data: { id: 'S-1', email: 'sam@lab.org' } } : { ok: false, error: 'nf' }),
    getAll: async () => ({ ok: true, data: [{ id: 'S-1', email: 'sam@lab.org' }] }),
  },
}));

import { mockStaffPasswordService as svc, createMockStaffPasswordService } from './mockStaffPasswordService';
import { browserSignInLockStore } from '../auth/signInLockout';
import { mockAuditService } from '../auditlog/mockAuditService';

const PW = 'correct horse battery';

describe('staff password service (Batch 448)', () => {
  beforeEach(() => { localStorage.clear(); allowed.value = true; });

  it('sets a password, which then signs in; a wrong one is "wrong", an unknown email "none"', async () => {
    expect((await svc.set('S-1', PW, { mustChange: false })).ok).toBe(true);
    expect(await svc.verify('Sam@Lab.org ', PW)).toEqual({ result: 'match', staffId: 'S-1', mustChange: false });
    expect(await svc.verify('sam@lab.org', 'wrong password!!')).toEqual({ result: 'wrong' });
    expect(await svc.verify('nobody@lab.org', PW)).toEqual({ result: 'none' });
  }, 20000);

  it('stores only a hash, and the audit never contains the password', async () => {
    const log = vi.spyOn(mockAuditService, 'logEvent');
    await svc.set('S-1', PW, { mustChange: true });
    expect(JSON.stringify(localStorage)).not.toContain(PW);
    const entry = log.mock.calls.find(c => c[0].event === 'STAFF_PASSWORD_SET')![0];
    expect(entry.detail).toContain('must be changed at next sign-in');
    expect(JSON.stringify(log.mock.calls)).not.toContain(PW);
  }, 20000);

  it('is refused without the permission, and enforces the policy', async () => {
    allowed.value = false;
    expect(await svc.set('S-1', PW, { mustChange: false })).toEqual({ ok: false, error: 'notPermitted' });
    allowed.value = true;
    expect(await svc.set('S-1', 'short', { mustChange: false })).toEqual({ ok: false, error: 'tooShort' });
  });

  it('a person who must change it proves the current one, then the new one works and the flag clears', async () => {
    await svc.set('S-1', PW, { mustChange: true });
    expect(await svc.changeAtSignIn('sam@lab.org', 'not the password', 'another long password')).toEqual({ ok: false, error: 'wrongCurrent' });
    expect(await svc.changeAtSignIn('sam@lab.org', PW, PW)).toEqual({ ok: false, error: 'sameAsCurrent' });
    expect(await svc.changeAtSignIn('sam@lab.org', PW, 'another long password')).toEqual({ ok: true, data: true });
    expect(await svc.verify('sam@lab.org', 'another long password')).toEqual({ result: 'match', staffId: 'S-1', mustChange: false });
  }, 30000);

  it('removing it returns the person to "none" (the built-in demo password applies again)', async () => {
    await svc.set('S-1', PW, { mustChange: false });
    expect((await svc.clear('S-1')).ok).toBe(true);
    expect(await svc.verify('sam@lab.org', PW)).toEqual({ result: 'none' });
  }, 20000);
});

describe('Batch 456: common or breached passwords are refused; a new password lifts the sign-in lock', () => {
  beforeEach(() => { localStorage.clear(); allowed.value = true; });

  it('refuses a common, patterned or service-named password, from the Staff screen and at sign-in', async () => {
    expect(await svc.set('S-1', 'Password1234!', { mustChange: false })).toEqual({ ok: false, error: 'common' });
    expect(await svc.set('S-1', 'abcabcabcabc', { mustChange: false })).toEqual({ ok: false, error: 'predictable' });
    expect(await svc.set('S-1', 'my pathscribe login', { mustChange: false })).toEqual({ ok: false, error: 'contextWord' });
    await svc.set('S-1', PW, { mustChange: true });
    expect(await svc.changeAtSignIn('sam@lab.org', PW, 'iloveyou12345')).toEqual({ ok: false, error: 'common' });
  }, 30000);

  it('refuses a breached password when the breach service says so, and audits only that the service was unreachable', async () => {
    const log = vi.spyOn(mockAuditService, 'logEvent');
    const breached = createMockStaffPasswordService({ screening: { loadCommon: async () => new Set(), breached: async pw => (pw === 'leaked but long' ? 'breached' : 'unavailable') } });
    expect(await breached.set('S-1', 'leaked but long', { mustChange: false })).toEqual({ ok: false, error: 'breached' });
    expect((await breached.set('S-1', PW, { mustChange: false })).ok).toBe(true);
    const entry = log.mock.calls.map(c => c[0]).filter(e => e.event === 'STAFF_PASSWORD_SET').pop()!;
    expect(entry.detail).toContain('could not be reached');
    expect(JSON.stringify(log.mock.calls)).not.toContain(PW);
  }, 20000);

  it('setting a password from the Staff screen clears that person\'s sign-in lock', async () => {
    const until = new Date(Date.now() + 600_000).toISOString();
    browserSignInLockStore.write('sam@lab.org', { failures: 5, lockedUntil: until });
    browserSignInLockStore.write('other@lab.org', { failures: 2, lockedUntil: null });
    const log = vi.spyOn(mockAuditService, 'logEvent');
    await svc.set('S-1', PW, { mustChange: true });
    expect(browserSignInLockStore.read('sam@lab.org')).toBeNull();
    expect(browserSignInLockStore.read('other@lab.org')).toEqual({ failures: 2, lockedUntil: null });
    expect(log.mock.calls.map(c => c[0]).filter(e => e.event === 'STAFF_PASSWORD_SET').pop()!.detail).toContain('Failed sign-in attempts cleared');
  }, 20000);
});
