// @vitest-environment happy-dom
// Batch 611 (#157): a password sign-in waits for its second factor before any session starts.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionProfile } from '@/services/auth/sessionProfile';

const profile: SessionProfile = { id: 'u1', name: 'Sarah Chen', email: 'schen@hospital.org', role: 'pathologist', initials: 'SC', voiceProfile: 'EN-US', organisationId: 'ORG-A' };
const state = { status: 'challenge' as 'not_required' | 'challenge' | 'enrol' | 'unavailable', conflict: false };
const startSession = vi.fn((_p: SessionProfile, force: boolean) => (state.conflict && !force ? { result: 'session_conflict' as const } : { result: 'success' as const, showBiometricWizard: false }));

vi.mock('@/services/signIn', () => ({
  authConfig: { passwordSignIn: true, providers: [] },
  authSession: {
    signInWithPassword: async () => profile,
    startSession: (p: SessionProfile, f: boolean) => startSession(p, f),
    restoreSession: async () => null,
    saveProfile: vi.fn(),
    endSession: vi.fn(),
    releaseActiveMarker: vi.fn(),
  },
  mfaService: {
    statusFor: async () => state.status,
    simulatedFactorAvailable: () => true,
    enrolmentStart: async () => ({ ok: true, secret: 'SECRET', account: 'schen@hospital.org' }),
    enrolmentConfirm: async (_p: SessionProfile, code: string) => (code === '111111'
      ? { ok: true, recoveryCodes: ['AAAAA-BBBBB'], stamp: { organisationId: 'ORG-A', userId: 'u1', verifiedAt: '2026-10-18T09:00:00Z', method: 'simulated-totp' } }
      : { ok: false, reason: 'invalid', attemptsLeft: 4 }),
    challenge: async (_p: SessionProfile, code: string) => (code === '222222'
      ? { ok: true, stamp: { organisationId: 'ORG-A', userId: 'u1', verifiedAt: '2026-10-18T09:00:00Z', method: 'simulated-totp' }, usedRecoveryCode: false, recoveryCodesLeft: 8 }
      : { ok: false, reason: 'invalid', attemptsLeft: 4 }),
    demoCurrentCode: async () => '222222',
  },
}));

import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const mount = async () => { const h = renderHook(() => useAuth(), { wrapper }); await waitFor(() => expect(h.result.current.loading).toBe(false)); return h; };

describe('AuthContext: second factor at password sign-in', () => {
  beforeEach(() => { startSession.mockClear(); state.status = 'challenge'; state.conflict = false; });
  afterEach(cleanup);

  it('starts no session until the code is verified, then starts it with the stamp', async () => {
    const h = await mount();
    let outcome: unknown;
    await act(async () => { outcome = await h.result.current.login('schen@hospital.org', 'pw'); });
    expect(outcome).toBe('mfa_required');
    expect(startSession).not.toHaveBeenCalled();
    expect(h.result.current.user).toBeNull();
    expect(h.result.current.mfa.pending).toEqual({ status: 'challenge', name: 'Sarah Chen' });

    let bad: unknown;
    await act(async () => { bad = await h.result.current.mfa.verify('000000'); });
    expect(bad).toMatchObject({ ok: false, reason: 'invalid' });
    expect(h.result.current.user).toBeNull();

    await act(async () => { await h.result.current.mfa.verify('222222'); });
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(startSession.mock.calls[0][0].mfa).toMatchObject({ organisationId: 'ORG-A', userId: 'u1' });
    expect(h.result.current.user?.mfa?.method).toBe('simulated-totp');
    expect(h.result.current.mfa.pending).toBeNull();
  });

  it('enrolment: the session starts only after the recovery codes were shown (finish)', async () => {
    state.status = 'enrol';
    const h = await mount();
    await act(async () => { await h.result.current.login('schen@hospital.org', 'pw'); });
    expect(h.result.current.mfa.pending?.status).toBe('enrol');
    await act(async () => { await h.result.current.mfa.enrolConfirm('111111'); });
    expect(startSession).not.toHaveBeenCalled();
    await act(async () => { h.result.current.mfa.finish(); });
    expect(h.result.current.user?.mfa?.method).toBe('simulated-totp');
  });

  it('going back drops the pending sign-in; nothing started', async () => {
    const h = await mount();
    await act(async () => { await h.result.current.login('schen@hospital.org', 'pw'); });
    act(() => h.result.current.mfa.cancel());
    expect(h.result.current.mfa.pending).toBeNull();
    expect(startSession).not.toHaveBeenCalled();
  });

  it('a session conflict after the code asks first; confirming signs in with the stamp kept', async () => {
    state.conflict = true;
    const h = await mount();
    await act(async () => { await h.result.current.login('schen@hospital.org', 'pw'); });
    let r: { ok: boolean; outcome?: string } | undefined;
    await act(async () => { r = await h.result.current.mfa.verify('222222') as never; });
    expect(r).toMatchObject({ ok: true, outcome: 'session_conflict' });
    expect(h.result.current.user).toBeNull();
    expect(h.result.current.mfa.pending).not.toBeNull();
    await act(async () => { h.result.current.mfa.finish(true); });
    expect(h.result.current.user?.mfa?.userId).toBe('u1');
  });

  it('refuses the sign-in when an administrator-required second factor cannot be offered', async () => {
    state.status = 'unavailable';
    const h = await mount();
    let outcome: unknown;
    await act(async () => { outcome = await h.result.current.login('schen@hospital.org', 'pw'); });
    expect(outcome).toBe('mfa_unavailable');
    expect(startSession).not.toHaveBeenCalled();
  });

  it('signs in straight away when no second factor is required', async () => {
    state.status = 'not_required';
    const h = await mount();
    await act(async () => { await h.result.current.login('schen@hospital.org', 'pw'); });
    expect(h.result.current.user?.id).toBe('u1');
    expect(h.result.current.user?.mfa).toBeUndefined();
  });
});
