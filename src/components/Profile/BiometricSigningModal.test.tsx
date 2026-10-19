// @vitest-environment happy-dom
// src/components/Profile/BiometricSigningModal.test.tsx
// Batch 611 (#158): the enrolment window says the check is simulated.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '1' } }) }));
vi.mock('@/services', () => ({
  biometricFlow: {
    getCredential: async () => ({ userId: '1', credentialId: 'x', enrolledAt: '2026-10-01T00:00:00Z', lastVerifiedAt: null, deviceName: 'Touch ID', prompt: 'device' }),
    isAvailable: async () => true,
    deviceName: () => 'Touch ID',
    enroll: async () => ({ ok: true }),
    remove: async () => ({ ok: true }),
    dismissWizard: async () => {},
  },
}));

import BiometricSigningModal from './BiometricSigningModal';

describe('BiometricSigningModal (Batch 611)', () => {
  it('shows the Simulated banner and which prompt was used', async () => {
    render(<BiometricSigningModal mode="manage" onClose={() => {}} />);
    expect(screen.getByRole('note').textContent).toBe('profileMenu.biometric.simulatedBanner');
    await waitFor(() => expect(screen.getByText(/profileMenu\.biometric\.promptDevice/)).toBeTruthy());
  });
});
