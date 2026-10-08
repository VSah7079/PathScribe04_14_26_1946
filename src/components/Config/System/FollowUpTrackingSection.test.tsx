// @vitest-environment happy-dom
// Batch 454: Configuration → System → Follow-up tracking saves the warning
// period and the clinician-email switch; the email wording shows only when
// the switch is on, and an unknown placeholder can't be saved.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('../configDirtyGuardContext', () => ({ useReportConfigDirty: () => {} }));
import FollowUpTrackingSection from './FollowUpTrackingSection';
import { followUpSettingsService } from '@/services';
import { getEffectiveFollowUpSettings } from '@/services/followUp/followUpSettings';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('FollowUpTrackingSection', () => {
  it('starts at 30 days with clinician email off, and saves a change', async () => {
    render(<FollowUpTrackingSection />);
    expect(screen.getByText('followUpTrackingSection.title')).toBeTruthy();
    const warning = await waitFor(() => { const el = document.getElementById('followup-enterprise-warning') as HTMLInputElement; expect(el.value).toBe('30'); return el; });
    expect(document.getElementById('followup-enterprise-body')).toBeNull();
    fireEvent.change(warning, { target: { value: '14' } });
    fireEvent.click(screen.getByText('followUpTrackingSection.clinicianEmailLabel'));
    expect(document.getElementById('followup-enterprise-body')).not.toBeNull();
    fireEvent.click(screen.getAllByText('common.save')[0]);
    await waitFor(async () => expect(await followUpSettingsService.get()).toMatchObject({ data: { warningDays: 14, clinicianEmailEnabled: true } }));
    expect(await getEffectiveFollowUpSettings(undefined)).toMatchObject({ warningDays: 14, clinicianEmailEnabled: true, source: 'enterprise' });
  });

  it('flags an unknown placeholder and keeps Save off', async () => {
    render(<FollowUpTrackingSection />);
    await waitFor(() => expect((document.getElementById('followup-enterprise-warning') as HTMLInputElement).value).toBe('30'));
    fireEvent.click(screen.getByText('followUpTrackingSection.clinicianEmailLabel'));
    fireEvent.change(document.getElementById('followup-enterprise-body')!, { target: { value: 'About {{patientName}}' } });
    expect(screen.getByText('followUpTrackingSection.errors.unknownPlaceholder')).toBeTruthy();
    expect((screen.getAllByText('common.save')[0] as HTMLButtonElement).disabled).toBe(true);
  });
});
