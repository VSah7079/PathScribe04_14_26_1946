// @vitest-environment happy-dom
// Batch 642: the sign-out authentication policy card against the real services (localStorage), permission allowed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('@/components/Common/CapabilityButton', () => ({ CapabilityButton: (p: { className?: string; disabled?: boolean; onClick?: () => void; children?: React.ReactNode }) => <button className={p.className} disabled={p.disabled} onClick={p.onClick}>{p.children}</button> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Pat Admin', role: 'pathologist-admin' } }) }));
import SignOutPolicyCard from './SignOutPolicyCard';
import { signOutPolicyService } from '@/services';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);
const K = 'signOutPolicy.card';

describe('SignOutPolicyCard (Batch 642)', () => {
  it('starts on the strict default with nothing to save', () => {
    render(<SignOutPolicyCard />);
    expect((screen.getByLabelText(`${K}.modeLabel`) as HTMLSelectElement).value).toBe('strict');
    expect((screen.getByText(`${K}.save`) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByLabelText(`${K}.timeoutLabel`)).toBeNull();
  });

  it('session mode shows its length and the 21 CFR 11.200 note; Save stores it and Discard goes back', async () => {
    render(<SignOutPolicyCard />);
    fireEvent.change(screen.getByLabelText(`${K}.modeLabel`), { target: { value: 'session' } });
    expect(screen.getByText(`${K}.sessionWarning`)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(`${K}.timeoutLabel`), { target: { value: '60' } });
    fireEvent.click(screen.getByText(`${K}.save`));
    await waitFor(() => expect(signOutPolicyService.getConfig().enterprise).toEqual({ mode: 'session', mfa: false, timeoutMinutes: 60 }));
    fireEvent.change(screen.getByLabelText(`${K}.modeLabel`), { target: { value: 'strict' } });
    fireEvent.click(screen.getByText(`${K}.discard`));
    expect((screen.getByLabelText(`${K}.modeLabel`) as HTMLSelectElement).value).toBe('session');
  });

  it('the second factor and the override lock are saved too', async () => {
    render(<SignOutPolicyCard />);
    fireEvent.click(screen.getByLabelText(`${K}.mfaLabel`));
    expect(screen.getByText(`${K}.mfaHint`)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(`${K}.lockLabel`));
    fireEvent.click(screen.getByText(`${K}.save`));
    await waitFor(() => expect(signOutPolicyService.getConfig()).toMatchObject({ enterprise: { mfa: true }, overridesLocked: true }));
  });
});
