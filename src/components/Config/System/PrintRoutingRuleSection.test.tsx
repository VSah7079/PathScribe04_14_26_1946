// @vitest-environment happy-dom
// src/components/Config/System/PrintRoutingRuleSection.test.tsx
// Batch 553: a routing rule prints to a site agent's printer (or a printer address).
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const svc = vi.hoisted(() => ({
  printRoutingRuleService: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  facilityService: { getAll: vi.fn() },
  locationService: { getAll: vi.fn() },
}));
vi.mock('@/services', () => svc);
const agentPrinters = vi.hoisted(() => ({
  useAgentPrinters: vi.fn((siteId: string | null) => ({ printers: siteId === 'F1' ? [{ destinationId: 'rep-1', label: 'Front desk' }] : [], loading: false, error: null })),
}));
vi.mock('@/hooks/useAgentPrinters', () => agentPrinters);
vi.mock('react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

import PrintRoutingRuleSection from './PrintRoutingRuleSection';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function setup(rules: unknown[] = []) {
  svc.printRoutingRuleService.getAll.mockResolvedValue({ ok: true, data: rules });
  svc.printRoutingRuleService.create.mockResolvedValue({ ok: true, data: {} });
  svc.facilityService.getAll.mockResolvedValue({ ok: true, data: [{ id: 'F1', name: 'Central Lab', status: 'Active', roles: ['performing_lab'] }, { id: 'F2', name: 'North Lab', status: 'Active', roles: ['performing_lab'] }, { id: 'C1', name: 'Clinic', status: 'Active', roles: ['ordering_client'] }] });
  svc.locationService.getAll.mockResolvedValue({ ok: true, data: [{ pointOfCare: 'ICU' }] });
  render(<PrintRoutingRuleSection />);
}

describe('PrintRoutingRuleSection: agent printers (Batch 553)', () => {
  it('a facility-tier rule uses that facility\'s agent printers; one pick and save', async () => {
    setup();
    fireEvent.click(await screen.findByText('printRoutingRulesSection.addRuleButton'));
    fireEvent.change(screen.getByLabelText('printRoutingRulesSection.fields.scopeType'), { target: { value: 'facility' } });
    fireEvent.change(screen.getByLabelText('printRoutingRulesSection.fields.scopeId'), { target: { value: 'F1' } });
    expect(screen.queryByLabelText('printDestination.site')).toBeNull(); // the rule's facility is the site
    // The facility's only report printer is picked already: one less click.
    await waitFor(() => expect((screen.getByLabelText('printDestination.printer') as HTMLSelectElement).value).toBe('rep-1'));
    const save = screen.getByText('printRoutingRulesSection.modal.addRuleButton') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(svc.printRoutingRuleService.create).toHaveBeenCalledWith(expect.objectContaining({
      scopeType: 'facility', scopeId: 'F1', printDestination: { agentPrinter: { siteId: 'F1', destinationId: 'rep-1' }, displayName: 'Front desk' },
    })));
  });

  it('another tier chooses the site; changing it clears the printer; no printer chosen means no save', async () => {
    setup();
    fireEvent.click(await screen.findByText('printRoutingRulesSection.addRuleButton'));
    expect((screen.getByText('printRoutingRulesSection.modal.addRuleButton') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('printRoutingRulesSection.fields.scopeType'), { target: { value: 'location' } });
    fireEvent.change(screen.getByLabelText('printRoutingRulesSection.fields.scopeId'), { target: { value: 'ICU' } });
    fireEvent.change(screen.getByLabelText('printDestination.site'), { target: { value: 'F1' } });
    fireEvent.change(screen.getByLabelText('printDestination.printer'), { target: { value: 'rep-1' } });
    fireEvent.change(screen.getByLabelText('printDestination.site'), { target: { value: 'F2' } });
    expect((screen.getByLabelText('printDestination.printer') as HTMLSelectElement).value).toBe('');
    expect(screen.getByText('printDestination.noPrinters')).toBeTruthy();
    expect(screen.getByText('printDestination.problems.agentPrinterRequired')).toBeTruthy();
  });

  it('a printer address still works, and the list shows each rule\'s printer by name', async () => {
    setup([{ id: 'r1', scopeType: 'facility', scopeId: 'F1', printDestination: { agentPrinter: { siteId: 'F1', destinationId: 'rep-1' }, displayName: 'Front desk' }, active: true, createdAt: '', updatedAt: '' }]);
    expect(await screen.findByText('Front desk')).toBeTruthy();
    fireEvent.click(screen.getByText('printRoutingRulesSection.addRuleButton'));
    fireEvent.change(screen.getByLabelText('printRoutingRulesSection.fields.scopeId'), { target: { value: 'WS-1' } });
    fireEvent.change(screen.getByLabelText('printDestination.kind'), { target: { value: 'network' } });
    fireEvent.change(screen.getByLabelText('printDestination.address'), { target: { value: '10.0.0.9' } });
    fireEvent.click(screen.getByText('printRoutingRulesSection.modal.addRuleButton'));
    await waitFor(() => expect(svc.printRoutingRuleService.create).toHaveBeenCalledWith(expect.objectContaining({
      scopeType: 'workstation', scopeId: 'WS-1', printDestination: { protocol: 'RAW_9100', ipAddress: '10.0.0.9' },
    })));
  });

  it('a refused save keeps the window open with the reason; only performing labs are offered as sites', async () => {
    setup();
    svc.printRoutingRuleService.create.mockResolvedValue({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    fireEvent.click(await screen.findByText('printRoutingRulesSection.addRuleButton'));
    fireEvent.change(screen.getByLabelText('printRoutingRulesSection.fields.scopeType'), { target: { value: 'location' } });
    fireEvent.change(screen.getByLabelText('printRoutingRulesSection.fields.scopeId'), { target: { value: 'ICU' } });
    const site = screen.getByLabelText('printDestination.site') as HTMLSelectElement;
    expect(Array.from(site.options).map(o => o.value)).toEqual(['', 'F1', 'F2']);
    fireEvent.change(site, { target: { value: 'F1' } });
    await waitFor(() => expect((screen.getByLabelText('printDestination.printer') as HTMLSelectElement).value).toBe('rep-1')); // the only printer is picked
    fireEvent.click(screen.getByText('printRoutingRulesSection.modal.addRuleButton'));
    expect(await screen.findByText('printRoutingRulesSection.errors.notPermitted')).toBeTruthy();
    expect(screen.getByText('printRoutingRulesSection.modal.addRuleButton')).toBeTruthy(); // still open
  });
});
