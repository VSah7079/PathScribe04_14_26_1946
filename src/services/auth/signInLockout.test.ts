// @vitest-environment happy-dom
// Batch 456: the sign-in lockout's message and its browser store.
import { describe, it, expect, beforeEach } from 'vitest';
import { signInRefusalNotice, browserSignInLockStore, SIGN_IN_LOCK_POLICY, signInLockKey } from './signInLockout';
import { SIGNING_LOCK_POLICY } from './signerConfirmation';

const NOW = new Date('2026-10-04T12:00:00Z');

describe('what the sign-in screen says', () => {
  it('the same 5 tries and 15 minutes as signature confirmation', () => {
    expect(SIGN_IN_LOCK_POLICY).toEqual(SIGNING_LOCK_POLICY);
  });
  it('plain "incorrect" until the last try, then a warning, then the minutes left', () => {
    expect(signInRefusalNotice('invalid_credentials', NOW)).toEqual({ key: 'login.invalidCredentials' });
    expect(signInRefusalNotice({ refused: 'invalid', attemptsLeft: 2 }, NOW)).toEqual({ key: 'login.invalidCredentials' });
    expect(signInRefusalNotice({ refused: 'invalid', attemptsLeft: 1 }, NOW)).toEqual({ key: 'login.lockWarning', values: { minutes: 15 } });
    expect(signInRefusalNotice({ refused: 'locked', lockedUntil: '2026-10-04T12:14:30Z' }, NOW)).toEqual({ key: 'login.locked', values: { count: 15 } });
    expect(signInRefusalNotice({ refused: 'locked', lockedUntil: '2026-10-04T12:00:10Z' }, NOW)).toEqual({ key: 'login.locked', values: { count: 1 } });
  });
});

describe('the browser store', () => {
  beforeEach(() => localStorage.clear());
  it('keeps counts per email key, drops a cleared count, and clears by email in any case', () => {
    expect(signInLockKey('  Sam@Lab.ORG ')).toBe('sam@lab.org');
    browserSignInLockStore.write('sam@lab.org', { failures: 2, lockedUntil: null });
    browserSignInLockStore.write('kim@lab.org', { failures: 1, lockedUntil: null });
    expect(browserSignInLockStore.read('sam@lab.org')).toEqual({ failures: 2, lockedUntil: null });
    browserSignInLockStore.write('kim@lab.org', { failures: 0, lockedUntil: null });
    expect(browserSignInLockStore.read('kim@lab.org')).toBeNull();
    browserSignInLockStore.clear(['SAM@lab.org']);
    expect(browserSignInLockStore.read('sam@lab.org')).toBeNull();
  });
  it('holds at most 200 emails, dropping the oldest', () => {
    for (let i = 0; i < 205; i++) browserSignInLockStore.write(`u${i}@x.org`, { failures: 1, lockedUntil: null });
    const stored = Object.keys(JSON.parse(Object.entries(localStorage).find(([k]) => k.endsWith('pathscribe_sign_in_locks'))![1] as string));
    expect(stored.length).toBe(200);
  });
});
