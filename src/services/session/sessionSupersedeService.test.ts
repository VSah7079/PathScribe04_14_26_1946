// src/services/session/sessionSupersedeService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

// Real, working in-memory localStorage/sessionStorage stubs — same
// approach as mockCaseServiceConcurrency.test.ts, since this test
// environment is plain Node (no browser storage available natively).
const localStore = new Map<string, string>();
const sessionStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (localStore.has(k) ? localStore.get(k)! : null),
  setItem: (k: string, v: string) => { localStore.set(k, v); },
  removeItem: (k: string) => { localStore.delete(k); },
};
(globalThis as any).sessionStorage = {
  getItem: (k: string) => (sessionStore.has(k) ? sessionStore.get(k)! : null),
  setItem: (k: string, v: string) => { sessionStore.set(k, v); },
  removeItem: (k: string) => { sessionStore.delete(k); },
};

const {
  activeSessionKeyFor, generateSessionId,
  getActiveSessionId, setActiveSessionId, clearActiveSessionId,
  getOwnSessionId, setOwnSessionId, clearOwnSessionId,
} = await import('./sessionSupersedeService');

describe('sessionSupersedeService', () => {
  beforeEach(() => {
    localStore.clear();
    sessionStore.clear();
  });

  it('generates distinct session ids across calls', () => {
    const a = generateSessionId();
    const b = generateSessionId();
    expect(a).not.toBe(b);
  });

  it('active session id is scoped per-user, not global', () => {
    setActiveSessionId('user-a', 'session-1');
    setActiveSessionId('user-b', 'session-2');
    expect(getActiveSessionId('user-a')).toBe('session-1');
    expect(getActiveSessionId('user-b')).toBe('session-2');
  });

  it('no active session initially returns null, not an error', () => {
    expect(getActiveSessionId('nobody-logged-in-yet')).toBeNull();
  });

  it('clearing a user\'s active session removes only that user\'s entry', () => {
    setActiveSessionId('user-a', 'session-1');
    setActiveSessionId('user-b', 'session-2');
    clearActiveSessionId('user-a');
    expect(getActiveSessionId('user-a')).toBeNull();
    expect(getActiveSessionId('user-b')).toBe('session-2'); // untouched
  });

  it('own session id (per-tab identity) round-trips correctly', () => {
    expect(getOwnSessionId()).toBeNull();
    setOwnSessionId('this-tabs-session');
    expect(getOwnSessionId()).toBe('this-tabs-session');
    clearOwnSessionId();
    expect(getOwnSessionId()).toBeNull();
  });

  it('the active-session storage key is real and stable for a given user id', () => {
    expect(activeSessionKeyFor('user-a')).toBe('pathscribe_active_session_user-a');
  });
});
