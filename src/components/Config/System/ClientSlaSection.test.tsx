// @vitest-environment happy-dom
// Batch 610 (#164): the Client service levels screen starts empty, adds a level
// for a client, and refuses a first-touch target longer than the total.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('../configDirtyGuardContext', () => ({ useReportConfigDirty: () => {} }));
import ClientSlaSection from './ClientSlaSection';
import { clientSlaService, facilityService } from '@/services';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const firstClient = async () => {
  const res = await facilityService.getAll();
  const f = res.ok ? res.data.find(x => x.status !== 'Inactive' && x.assigningAuthority) : undefined;
  expect(f).toBeTruthy();
  return f!;
};

describe('ClientSlaSection (#164)', () => {
  it('starts with no service levels', async () => {
    render(<ClientSlaSection />);
    expect(await screen.findByTestId('client-sla-empty')).toBeTruthy();
  });

  it('adds a service level for a client', async () => {
    const f = await firstClient();
    render(<ClientSlaSection />);
    const pick = await waitFor(() => { const el = screen.getByLabelText('clientSlaSection.add.client') as HTMLSelectElement; expect(el.options.length).toBeGreaterThan(1); return el; });
    fireEvent.change(pick, { target: { value: f.assigningAuthority } });
    fireEvent.change(screen.getAllByLabelText('clientSlaSection.columns.firstTouchTargetHrs')[0], { target: { value: '4' } });
    fireEvent.change(screen.getAllByLabelText('clientSlaSection.columns.totalTatTargetHrs')[0], { target: { value: '48' } });
    fireEvent.click(screen.getByText('clientSlaSection.add.button'));
    await waitFor(async () => {
      const r = await clientSlaService.getByAssigningAuthority(f.assigningAuthority);
      expect(r.ok && r.data?.totalTatTargetHrs).toBe(48);
    });
  });

  it('refuses a first-touch target longer than the total', async () => {
    const f = await firstClient();
    render(<ClientSlaSection />);
    const pick = await waitFor(() => { const el = screen.getByLabelText('clientSlaSection.add.client') as HTMLSelectElement; expect(el.options.length).toBeGreaterThan(1); return el; });
    fireEvent.change(pick, { target: { value: f.assigningAuthority } });
    fireEvent.change(screen.getAllByLabelText('clientSlaSection.columns.firstTouchTargetHrs')[0], { target: { value: '60' } });
    fireEvent.change(screen.getAllByLabelText('clientSlaSection.columns.totalTatTargetHrs')[0], { target: { value: '48' } });
    fireEvent.click(screen.getByText('clientSlaSection.add.button'));
    await screen.findByRole('alert');
    const r = await clientSlaService.getAll();
    expect(r.ok && r.data.length).toBe(0);
  });
});
