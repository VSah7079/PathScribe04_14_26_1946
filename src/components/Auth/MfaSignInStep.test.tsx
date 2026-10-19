// @vitest-environment happy-dom
// Batch 611 (#157): the second-factor step of a password sign-in.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@/i18n/config';
import MfaSignInStep from './MfaSignInStep';
import type { MfaSignInApi } from '@/contexts/AuthContext';

const api = (over: Partial<MfaSignInApi> = {}): MfaSignInApi => ({
  pending: { status: 'challenge', name: 'Sarah Chen' },
  simulated: true,
  enrolStart: async () => ({ ok: true, secret: 'GEZDGNBVGY3TQOJQ', account: 'schen@hospital.org' }),
  enrolConfirm: async () => ({ ok: false, reason: 'invalid', attemptsLeft: 4 }),
  verify: async () => ({ ok: false, reason: 'invalid', attemptsLeft: 4 }),
  finish: () => 'success',
  cancel: vi.fn(),
  demoCode: async () => '493021',
  ...over,
});

describe('MfaSignInStep', () => {
  afterEach(cleanup);

  it('labels the authenticator Simulated and signs in with a good code', async () => {
    const onSignedIn = vi.fn();
    const verify = vi.fn(async () => ({ ok: true as const, outcome: 'success' as const, usedRecoveryCode: false, recoveryCodesLeft: 8 }));
    render(<MfaSignInStep mfa={api({ verify })} onSignedIn={onSignedIn} onSessionConflict={vi.fn()} />);
    expect(screen.getByText('Simulated')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Six-digit code or recovery code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
    expect(verify).toHaveBeenCalledWith('123456');
  });

  it('reports a session conflict instead of signing in', async () => {
    const onSessionConflict = vi.fn();
    const verify = async () => ({ ok: true as const, outcome: 'session_conflict' as const, usedRecoveryCode: false, recoveryCodesLeft: 8 });
    render(<MfaSignInStep mfa={api({ verify })} onSignedIn={vi.fn()} onSessionConflict={onSessionConflict} />);
    fireEvent.change(screen.getByLabelText('Six-digit code or recovery code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(onSessionConflict).toHaveBeenCalled());
  });

  it('says a code was not accepted, with the attempts left, and clears the field', async () => {
    render(<MfaSignInStep mfa={api()} onSignedIn={vi.fn()} onSessionConflict={vi.fn()} />);
    const input = screen.getByLabelText('Six-digit code or recovery code') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect((await screen.findByRole('alert')).textContent).toContain('4 attempts left before codes are locked.');
    expect(input.value).toBe('');
  });

  it('says when codes are locked, and until when', async () => {
    const verify = async () => ({ ok: false as const, reason: 'locked' as const, lockedUntil: '2026-10-18T09:15:00Z' });
    render(<MfaSignInStep mfa={api({ verify })} onSignedIn={vi.fn()} onSessionConflict={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Six-digit code or recovery code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Too many attempts\. Second-factor codes are locked until/);
  });

  it('shows the demo code on request, labelled Simulated', async () => {
    render(<MfaSignInStep mfa={api()} onSignedIn={vi.fn()} onSessionConflict={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show demo code (Simulated)' }));
    expect(await screen.findByText('Demo code: 493021')).toBeTruthy();
  });

  it('has no demo-code button when there is no simulated factor', () => {
    render(<MfaSignInStep mfa={api({ simulated: false })} onSignedIn={vi.fn()} onSessionConflict={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Show demo code (Simulated)' })).toBeNull();
  });

  it('enrolment: shows the secret, then the recovery codes once, then continues', async () => {
    const onSignedIn = vi.fn();
    const finish = vi.fn(() => 'success' as const);
    const enrolConfirm = async () => ({ ok: true as const, recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'], stamp: { organisationId: 'o', userId: 'u', verifiedAt: '2026-10-18T09:00:00Z', method: 'simulated-totp' as const } });
    render(<MfaSignInStep mfa={api({ pending: { status: 'enrol', name: 'Sarah Chen' }, enrolConfirm, finish })} onSignedIn={onSignedIn} onSessionConflict={vi.fn()} />);
    expect(await screen.findByText('GEZDGNBVGY3TQOJQ')).toBeTruthy();
    expect(screen.getByText('Set up your second factor')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Six-digit code or recovery code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    expect(await screen.findByText('Save your recovery codes')).toBeTruthy();
    expect(screen.getByText('AAAAA-BBBBB')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'I have saved them, continue' }));
    expect(finish).toHaveBeenCalled();
    expect(onSignedIn).toHaveBeenCalled();
  });

  it('going back cancels the pending sign-in', () => {
    const cancel = vi.fn();
    render(<MfaSignInStep mfa={api({ cancel })} onSignedIn={vi.fn()} onSessionConflict={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(cancel).toHaveBeenCalled();
  });
});
