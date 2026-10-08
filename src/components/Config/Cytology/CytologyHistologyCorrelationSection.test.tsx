// @vitest-environment happy-dom
// Batch 452 (PS-156): the Correlation window settings screen against the real
// services (localStorage), with the permission check allowed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string, p?: Record<string, unknown>) => p && 'days' in p ? `${key}:${p.days}:${p.anchor}` : key }) }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('../configDirtyGuardContext', () => ({ useReportConfigDirty: () => {} }));
import CytologyHistologyCorrelationSection from './CytologyHistologyCorrelationSection';
import { cytologyHistologyCorrelationSettingsService } from '@/services';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const days = (prefix: string) => document.getElementById(`${prefix}-days`) as HTMLInputElement;
const anchor = (prefix: string) => document.getElementById(`${prefix}-anchor`) as HTMLSelectElement;

describe('CytologyHistologyCorrelationSection (PS-156)', () => {
  it('shows the default of 180 days from collection and saves a new enterprise rule', async () => {
    render(<CytologyHistologyCorrelationSection />);
    await waitFor(() => expect(days('corr-enterprise').value).toBe('180'));
    expect(anchor('corr-enterprise').value).toBe('collection');
    fireEvent.change(days('corr-enterprise'), { target: { value: '200' } });
    fireEvent.change(anchor('corr-enterprise'), { target: { value: 'receipt' } });
    fireEvent.click(screen.getAllByText('common.save')[0]);
    await waitFor(async () => expect((await cytologyHistologyCorrelationSettingsService.get())).toMatchObject({ data: { windowDays: 200, anchor: 'receipt' } }));
  });

  it('an invalid number of days shows the error and Save stays off', async () => {
    render(<CytologyHistologyCorrelationSection />);
    await waitFor(() => expect(days('corr-enterprise').value).toBe('180'));
    fireEvent.change(days('corr-enterprise'), { target: { value: '0' } });
    expect(screen.getByRole('alert').textContent).toBe('cytologyHistologyCorrelationSection.errors.windowDaysInvalid');
    expect((screen.getAllByText('common.save')[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('adds and removes a jurisdiction rule', async () => {
    render(<CytologyHistologyCorrelationSection />);
    fireEvent.click(await screen.findByText('cytologyHistologyCorrelationSection.addRule'));
    fireEvent.change(screen.getByLabelText('cytologyHistologyCorrelationSection.jurisdictionTitle'), { target: { value: 'CA' } });
    fireEvent.change(days('corr-region'), { target: { value: '365' } });
    fireEvent.click(screen.getAllByText('common.save')[1]);
    expect(await screen.findByText('cytologyHistologyCorrelationSection.ruleSummary:365:cytologyHistologyCorrelationSection.anchors.collection')).toBeTruthy();
    expect(screen.getByText('jurisdictionNames.CA').tagName).toBe('SPAN');
    fireEvent.click(screen.getByText('common.remove'));
    await waitFor(() => expect(screen.queryByText('jurisdictionNames.CA')).toBeNull());
    expect((await cytologyHistologyCorrelationSettingsService.get())).toMatchObject({ data: { jurisdictionRules: {} } });
  });
});
