// @vitest-environment happy-dom
// Batch 611 (#157): the second-factor policy card in Session Security.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const granted = new Set<string>();
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (c: string) => ({ allowed: granted.has(c) }),
    evaluate: async (c: string) => ({ allowed: granted.has(c) }),
    grantedCapabilities: async () => new Set(granted),
  },
}));
const admin = { id: 'adm', name: 'Ada Admin', email: 'ada@hospital.org', role: 'admin', initials: 'AA', voiceProfile: 'EN-US', organisationId: 'ORG-A' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: admin }) }));
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@/i18n/config';
import MfaPolicyCard from './MfaPolicyCard';
import { mfaService } from '@/services';

describe('MfaPolicyCard', () => {
  // The service loads the authorization module on first use; load it before the test so a slow first load can't time the test out.
  beforeEach(async () => { await import('@/services/authorization/defaultAuthorizationService'); localStorage.clear(); granted.clear(); granted.add('config:session-security:manage'); granted.add('auth:mfa-enrolment:reset'); });
  afterEach(cleanup);

  it('saves the policy and shows the timings once something is required', async () => {
    render(<MfaPolicyCard />);
    expect(screen.queryByLabelText('Ask for a fresh code at a signature after (minutes)')).toBeNull();
    fireEvent.change(screen.getByLabelText('Who is asked'), { target: { value: 'signing_roles' } });
    await waitFor(() => expect(mfaService.policyOf(admin as never).mode).toBe('signing_roles'), { timeout: 5000 });
    expect(await screen.findByLabelText('Ask for a fresh code at a signature after (minutes)')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Ask for a fresh code at a signature after (minutes)'), { target: { value: '10' } });
    await waitFor(() => expect(mfaService.policyOf(admin as never).stepUpMinutes).toBe(10), { timeout: 5000 });
  });

  it('says so, and changes nothing, without the capability', async () => {
    granted.delete('config:session-security:manage');
    render(<MfaPolicyCard />);
    fireEvent.change(screen.getByLabelText('Who is asked'), { target: { value: 'all' } });
    expect(await screen.findByText('You don’t have permission to change this setting.')).toBeTruthy();
    expect(mfaService.policyOf(admin as never).mode).toBe('off');
  });
});
