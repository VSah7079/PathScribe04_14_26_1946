// @vitest-environment happy-dom
// Batch 611 (#157): the second-factor code field on a signature.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@/i18n/config';
import SignerConfirmationFields from './SignerConfirmationFields';
import type { SignerConfirmationState } from '@/hooks/useSignerConfirmation';

const signer = (over: Partial<SignerConfirmationState> = {}): SignerConfirmationState => ({
  method: 'password', needsUsername: false, biometricAllowed: false, signerName: 'Sarah Chen', signerCredentials: 'MD',
  username: '', setUsername: vi.fn(), password: '', setPassword: vi.fn(), mfaCodeNeeded: false, mfaCode: '', setMfaCode: vi.fn(),
  error: '', busy: false, confirm: vi.fn(), confirmBiometric: vi.fn(), reset: vi.fn(), ...over,
} as SignerConfirmationState);

describe('SignerConfirmationFields: second factor', () => {
  afterEach(cleanup);
  it('shows a code field only when the signature asks for one', () => {
    const { rerender } = render(<SignerConfirmationFields signer={signer()} onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText('Second-factor code')).toBeNull();
    rerender(<SignerConfirmationFields signer={signer({ mfaCodeNeeded: true })} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Second-factor code')).toBeTruthy();
    expect(screen.getByText('Your organisation asks for a fresh second factor before a signature.')).toBeTruthy();
  });
  it('passes what is typed on, and Enter submits', () => {
    const setMfaCode = vi.fn();
    const onSubmit = vi.fn();
    render(<SignerConfirmationFields signer={signer({ mfaCodeNeeded: true, setMfaCode })} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Second-factor code');
    fireEvent.change(input, { target: { value: '123456' } });
    expect(setMfaCode).toHaveBeenCalledWith('123456');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalled();
  });
});
