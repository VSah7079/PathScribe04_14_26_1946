// @vitest-environment happy-dom
// Batch 612: Configuration → System → Workstations.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => <button type="button" disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('@/utils/performingLabs', () => ({ getActivePerformingLabs: async () => [{ id: 'f1', name: 'Main Lab' }, { id: 'f2', name: 'North Lab' }] }));

const hoisted = vi.hoisted(() => ({ store: {} as Record<string, unknown>, service: null as unknown }));
vi.mock('@/services', async () => {
  const { createWorkstationRegistryService } = await import('@/services/workstationRegistry/workstationRegistryService');
  const { hashWorkstationToken } = await import('@/services/workstationRegistry/workstationRegistryRules');
  hoisted.service = createWorkstationRegistryService({
    load: (k, fb) => (k in hoisted.store ? (hoisted.store[k] as never) : fb),
    save: (k, v) => { hoisted.store[k] = JSON.parse(JSON.stringify(v)); },
    audit: async () => undefined,
    actor: () => ({ name: 'Admin' }),
    now: () => new Date().toISOString(),
    random: n => globalThis.crypto.getRandomValues(new Uint8Array(n)),
    hash: hashWorkstationToken,
  });
  return {
    workstationRegistryService: hoisted.service,
    siteAgentAdminService: { reportPrinters: async () => ({ ok: true, data: [{ destinationId: 'rep-1' }] }) },
  };
});

import WorkstationsSection from './WorkstationsSection';

beforeEach(() => { hoisted.store = {}; localStorage.clear(); });
afterEach(() => cleanup());

async function register(name = 'Grossing Station A') {
  fireEvent.click(await screen.findByText('workstationRegistry.register'));
  fireEvent.change(screen.getByPlaceholderText('workstationRegistry.placeholders.name'), { target: { value: name } });
  const facility = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
  await waitFor(() => expect(facility.querySelectorAll('option').length).toBeGreaterThan(1));
  fireEvent.change(facility, { target: { value: 'f1' } });
  fireEvent.click(screen.getByText('workstationRegistry.form.registerSubmit'));
}

describe('WorkstationsSection', () => {
  it('starts empty and offers the Simulated label', async () => {
    render(<WorkstationsSection />);
    expect(await screen.findByTestId('workstations-empty')).toBeTruthy();
    expect(screen.getAllByText('workstationRegistry.simulated').length).toBeGreaterThan(0);
  });

  it('registers a workstation, shows its token once, and never lists it in the table', async () => {
    render(<WorkstationsSection />);
    await register();
    const panel = await screen.findByTestId('workstation-token-panel');
    const token = panel.querySelector('code')!.textContent!;
    expect(token).toMatch(/^pswt_[0-9a-f]{48}$/);
    expect(screen.getByText('Grossing Station A')).toBeTruthy();
    expect(document.querySelector('table')!.textContent).not.toContain(token);
    fireEvent.click(within(panel).getByText('workstationRegistry.tokenPanel.done'));
    expect(screen.queryByTestId('workstation-token-panel')).toBeNull();
    expect(document.body.textContent).not.toContain(token);
  });

  it('refuses a second workstation with the same name at the facility', async () => {
    render(<WorkstationsSection />);
    await register();
    fireEvent.click(await screen.findByText('workstationRegistry.tokenPanel.done'));
    fireEvent.click(await screen.findByText('workstationRegistry.register'));
    fireEvent.change(screen.getByPlaceholderText('workstationRegistry.placeholders.name'), { target: { value: 'grossing station a' } });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'f1' } });
    expect(await screen.findByText('workstationRegistry.problem.NAME_TAKEN')).toBeTruthy();
    expect((screen.getByText('workstationRegistry.form.registerSubmit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('revokes with a reason, and the Simulated check-in then refuses the old token', async () => {
    render(<WorkstationsSection />);
    await register();
    const panel = await screen.findByTestId('workstation-token-panel');
    const token = panel.querySelector('code')!.textContent!;
    fireEvent.click(within(panel).getByText('workstationRegistry.tokenPanel.done'));
    fireEvent.click(await screen.findByText('workstationRegistry.revoke'));
    fireEvent.click(screen.getByText('workstationRegistry.revokeReasons.compromised'));
    fireEvent.click(screen.getByText('workstationRegistry.confirmRevoke'));
    await waitFor(() => expect(screen.getByText('workstationRegistry.status.revoked')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('workstationRegistry.placeholders.token'), { target: { value: token } });
    fireEvent.click(screen.getByText('workstationRegistry.checkin.button'));
    expect((await screen.findByTestId('workstation-checkin-result')).textContent).toContain('workstationRegistry.checkin.results.revoked');
  });

  it('makes this computer act as a workstation, and stops', async () => {
    render(<WorkstationsSection />);
    await register();
    fireEvent.click(await screen.findByText('workstationRegistry.tokenPanel.done'));
    fireEvent.click(await screen.findByText('workstationRegistry.useThisComputer'));
    expect(localStorage.getItem('pathscribe_registered_workstation_id')).toMatch(/^ws-/);
    fireEvent.click(await screen.findByText('workstationRegistry.stopUsing'));
    expect(localStorage.getItem('pathscribe_registered_workstation_id')).toBeNull();
  });
});
