// @vitest-environment happy-dom
// Batch 453 (PS-324): the biopsy-to-resection window screen saves to the
// surgical settings, separately from the cyto-histo window, and the
// post-sign-out QA reads the rule for the case's facility from them.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('../configDirtyGuardContext', () => ({ useReportConfigDirty: () => {} }));
import BiopsyResectionCorrelationSection from './BiopsyResectionCorrelationSection';
import { biopsyResectionCorrelationSettingsService, cytologyHistologyCorrelationSettingsService } from '@/services';
import { getEffectiveBiopsyResectionRule } from '@/services/quality/biopsyResectionCorrelationSettings';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('BiopsyResectionCorrelationSection (PS-324)', () => {
  it('shows its own title, saves to the surgical settings only, and the facility rule follows', async () => {
    render(<BiopsyResectionCorrelationSection />);
    expect(screen.getByText('biopsyResectionCorrelationSection.title')).toBeTruthy();
    const days = await waitFor(() => { const el = document.getElementById('corr-enterprise-days') as HTMLInputElement; expect(el.value).toBe('180'); return el; });
    fireEvent.change(days, { target: { value: '120' } });
    fireEvent.click(screen.getAllByText('common.save')[0]);
    await waitFor(async () => expect(await biopsyResectionCorrelationSettingsService.get()).toMatchObject({ data: { windowDays: 120, anchor: 'collection' } }));
    expect(await cytologyHistologyCorrelationSettingsService.get()).toMatchObject({ data: { windowDays: 180 } });
    expect(await getEffectiveBiopsyResectionRule(undefined)).toEqual({ windowDays: 120, anchor: 'collection', source: 'enterprise' });
  });
});
