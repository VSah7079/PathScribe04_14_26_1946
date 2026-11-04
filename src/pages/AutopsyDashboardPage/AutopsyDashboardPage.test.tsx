// @vitest-environment happy-dom
//
// Batch 610 (#61, #89): the autopsy dashboards page. The figures are tested
// in services/autopsy/dashboard/; this checks the screen: the Simulated
// notice, the three tiers, and that a case id is tagged as patient data.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/contexts/BreadcrumbContext', () => ({ useBreadcrumb: () => ({ pushCrumb: vi.fn() }) }));

import AutopsyDashboardPage from './AutopsyDashboardPage';

describe('AutopsyDashboardPage', () => {
  it('opens on the enterprise tier with the Simulated notice and facility table', async () => {
    render(<AutopsyDashboardPage />);
    expect(screen.getByText('autopsyDashboard.pageTitle')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('autopsyDashboard.enterprise.byFacility')).toBeTruthy());
    expect(screen.getByRole('note').textContent).toContain('autopsyDashboard.simulated.banner');
    expect(screen.getByText('autopsyDashboard.panels.consent')).toBeTruthy();
  });

  it('turning Simulated off removes the notice', async () => {
    render(<AutopsyDashboardPage />);
    await waitFor(() => expect(screen.getByRole('note')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('autopsyDashboard.simulated.toggle'));
    await waitFor(() => expect(screen.queryByRole('note')).toBeNull());
  });

  it('the department tier lists the reports overdue now', async () => {
    render(<AutopsyDashboardPage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'autopsyDashboard.tiers.department' })).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: 'autopsyDashboard.tiers.department' }));
    await waitFor(() => expect(screen.getByText('autopsyDashboard.department.overdueHeading')).toBeTruthy());
  });

  it('the case tier shows the case id inside a patient-data tag', async () => {
    const { container } = render(<AutopsyDashboardPage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'autopsyDashboard.tiers.case' })).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: 'autopsyDashboard.tiers.case' }));
    await waitFor(() => expect(container.querySelector('h3 [data-phi="accession"]')).not.toBeNull());
    expect(screen.getByText('autopsyDashboard.tat.padHeading', { selector: '.ps-autdash-case-key' })).toBeTruthy();
  });
});
