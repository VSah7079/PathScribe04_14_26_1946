// src/services/auth/signOutPolicy/signOutPolicyService.test.ts — Batch 642: saving, sessions and audit
import { describe, it, expect } from 'vitest';
import type { NewAuditLog } from '../../auditlog/IAuditService';
import { createSignOutPolicyService, type SignOutPolicyStore } from './signOutPolicyService';
import type { SignOutPolicyConfig, SignOutSession } from './signOutPolicy';

const me = { id: 'u1', name: 'Sarah Chen', role: 'pathologist' as const };

function setup(allowed = true) {
  const audit: NewAuditLog[] = [];
  let config: Partial<SignOutPolicyConfig> | null = null;
  let session: SignOutSession | null = null;
  let now = new Date('2026-10-20T10:00:00Z');
  let n = 0;
  const store: SignOutPolicyStore = {
    readConfig: () => config, writeConfig: c => { config = c; },
    readSession: id => (session && session.userId === id ? session : null), writeSession: (_id, s) => { session = s; }, readAny: () => session,
  };
  const svc = createSignOutPolicyService({
    store, audit: { logEvent: async e => { audit.push(e); return { ok: true as const, data: { ...e, id: 'a', timestamp: '' } }; } },
    enforce: async () => allowed, deviceFingerprint: () => 'dev-1', network: () => 'not classified (browser build)',
    now: () => now, newId: () => `sess-${++n}`,
  });
  return { svc, audit, advance: (min: number) => { now = new Date(now.getTime() + min * 60_000); }, session: () => session };
}
const auth = { facilityId: 'F1', facilityName: 'North Lab', caseId: 'S26-1', method: 'password' as const, mfa: false };

describe('saving the policy', () => {
  it('is refused without the permission, and changes nothing', async () => {
    const t = setup(false);
    expect(await t.svc.saveConfig(me, { enterprise: { mode: 'session', mfa: true, timeoutMinutes: 60 } })).toEqual({ ok: false, reason: 'not_permitted' });
    expect(t.svc.getConfig().enterprise.mode).toBe('strict');
    expect(t.audit).toHaveLength(0);
  });
  it('audits who, when, old and new for the default, an override and the lock', async () => {
    const t = setup();
    const r = await t.svc.saveConfig(me, {
      enterprise: { mode: 'session', mfa: false, timeoutMinutes: 60 },
      overrides: { F1: { mode: 'strict', mfa: true, timeoutMinutes: 30 } },
      overridesLocked: true,
    });
    expect(r.ok).toBe(true);
    const lines = t.audit.filter(e => e.event === 'Sign-out policy changed').map(e => e.detail);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/Sarah Chen at 2026-10-20T10:00:00.000Z from "password every sign-out" to "password once per session \(60 min\)"/);
    expect(lines[1]).toMatch(/Facility F1 .* from "no override" to "password every sign-out, second factor at sign-out"/);
    expect(lines[2]).toMatch(/from allowed to locked/);
  });
  it('saving with no change writes no audit lines', async () => {
    const t = setup();
    await t.svc.saveConfig(me, {});
    expect(t.audit).toHaveLength(0);
  });
});

describe('sessions', () => {
  it('strict mode audits every authentication and holds no session', () => {
    const t = setup();
    expect(t.svc.recordAuthentication(me, auth).sessionId).toBeNull();
    expect(t.session()).toBeNull();
    expect(t.audit[t.audit.length - 1]).toMatchObject({ event: 'Sign-out authentication', caseId: 'S26-1' });
  });
  it('session mode starts a session, audits the context, and later sign-outs ride on it', async () => {
    const t = setup();
    await t.svc.saveConfig(me, { enterprise: { mode: 'session', mfa: false, timeoutMinutes: 15 } });
    const { sessionId } = t.svc.recordAuthentication(me, auth);
    expect(sessionId).toBe('sess-1');
    expect(t.audit[t.audit.length - 1]?.detail).toMatch(/facility North Lab.*session sess-1.*authentication password.*case S26-1.*device dev-1.*network not classified/);
    const state = t.svc.stateFor(me, 'F1');
    expect(state.kind).toBe('valid');
    if (state.kind === 'valid') t.svc.recordSessionSignOut(me, state.session, { ...auth, caseId: 'S26-2' });
    expect(t.audit[t.audit.length - 1]).toMatchObject({ event: 'Sign-out within session', caseId: 'S26-2' });
  });
  it('an expiry is audited once, with its reason', async () => {
    const t = setup();
    await t.svc.saveConfig(me, { enterprise: { mode: 'session', mfa: false, timeoutMinutes: 15 } });
    t.svc.recordAuthentication(me, auth);
    t.advance(16);
    expect(t.svc.stateFor(me, 'F1')).toEqual({ kind: 'prompt', why: 'expired', reason: 'timeout' });
    expect(t.svc.stateFor(me, 'F1')).toEqual({ kind: 'prompt', why: 'none' });
    expect(t.audit.filter(e => e.event === 'Sign-out session expired')).toHaveLength(1);
  });
  it('a logout ends the session even after the profile is gone', async () => {
    const t = setup();
    await t.svc.saveConfig(me, { enterprise: { mode: 'session', mfa: false, timeoutMinutes: 15 } });
    t.svc.recordAuthentication(me, auth);
    t.svc.expireAny('logout');
    expect(t.session()).toBeNull();
    expect(t.audit[t.audit.length - 1]?.detail).toMatch(/ended \(logout\)/);
  });
  it('switching the policy back to strict stops reuse at once', async () => {
    const t = setup();
    await t.svc.saveConfig(me, { enterprise: { mode: 'session', mfa: false, timeoutMinutes: 15 } });
    t.svc.recordAuthentication(me, auth);
    await t.svc.saveConfig(me, { enterprise: { mode: 'strict', mfa: false, timeoutMinutes: 15 } });
    expect(t.svc.stateFor(me, 'F1')).toEqual({ kind: 'prompt', why: 'strict' });
  });
  it('reports the second factor requirement from the policy that applies', async () => {
    const t = setup();
    await t.svc.saveConfig(me, { overrides: { F1: { mode: 'strict', mfa: true, timeoutMinutes: 30 } } });
    expect(t.svc.mfaRequired('F1')).toBe(true);
    expect(t.svc.mfaRequired('F2')).toBe(false);
  });
});
