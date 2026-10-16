// @vitest-environment happy-dom
// Batch 552 (PS-539 phase 2d): Configuration → System → Site agents.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/services', () => ({ siteAgentAdminService: {} }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => <button type="button" disabled={disabled} onClick={onClick}>{children}</button>,
}));

import SiteAgentsSection from './SiteAgentsSection';
import type { ISiteAgentAdminService } from '@/services/siteAgent/siteAgentAdminService';
import type { SiteAgentConfig } from '@/services/siteAgent/siteAgentAdmin';

function fake(viaServer: boolean): ISiteAgentAdminService & { saved: SiteAgentConfig[] } {
  const saved: SiteAgentConfig[] = [];
  return {
    viaServer, saved,
    listAgents: vi.fn(async () => ({ ok: true as const, data: viaServer ? [{ agentId: 'a1', siteId: 'S1', machineName: 'LAB-PC-01', agentVersion: '1.2.0', enrolledAt: 'x', certExpiresAt: '2027-01-01T00:00:00Z' }] : [] })),
    createEnrollmentCode: vi.fn(async () => ({ ok: true as const, data: { code: 'ABCD-EFGH', siteId: 'S1', expiresAt: '2026-10-14T12:00:00Z' } })),
    revoke: vi.fn(async () => ({ ok: true as const, data: { agentId: 'a1', siteId: 'S1', machineName: 'LAB-PC-01', agentVersion: '1.2.0', enrolledAt: 'x', certExpiresAt: 'y', revokedAt: 'now' } })),
    getConfig: vi.fn(async () => ({ ok: true as const, data: { siteId: 'S1', printers: [], shares: [] } })),
    saveConfig: vi.fn(async (c: SiteAgentConfig) => { saved.push(c); return { ok: true as const, data: c }; }),
    reportPrinters: vi.fn(async () => ({ ok: true as const, data: [] })),
  };
}
afterEach(() => cleanup());

describe('SiteAgentsSection (Batch 552)', () => {
  it('with "All facilities" in the picker above, asks for a site', () => {
    render(<SiteAgentsSection service={fake(true)} />);
    expect(screen.getByText('siteAgents.chooseSite')).toBeTruthy();
  });

  it('a failed revoke keeps the reason picked and the note typed', async () => {
    const service = fake(true);
    (service.revoke as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, error: 'UNAVAILABLE' });
    render(<SiteAgentsSection selectedFacilityId="S1" service={service} />);
    fireEvent.click(await screen.findByText('siteAgents.revoke'));
    fireEvent.click(screen.getByText('siteAgents.revokeReasons.compromised'));
    fireEvent.change(screen.getByLabelText('siteAgents.revokeNote'), { target: { value: 'Stolen laptop' } });
    fireEvent.click(screen.getByText('siteAgents.confirmRevoke'));
    expect(await screen.findByText('siteAgents.problem.UNAVAILABLE')).toBeTruthy();
    expect((screen.getByLabelText('siteAgents.revokeNote') as HTMLInputElement).value).toBe('Stolen laptop');
    expect(screen.getByText('siteAgents.revokeReasons.compromised').getAttribute('aria-pressed')).toBe('true');
  });

  it('Batch 553: "Other" needs a note; another reason needs none (one click and confirm)', async () => {
    const service = fake(true);
    render(<SiteAgentsSection selectedFacilityId="S1" service={service} />);
    fireEvent.click(await screen.findByText('siteAgents.revoke'));
    const confirm = screen.getByText('siteAgents.confirmRevoke') as HTMLButtonElement;
    fireEvent.click(screen.getByText('siteAgents.revokeReasons.other'));
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('siteAgents.revokeNote'), { target: { value: 'Lab closed' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('siteAgents.revokeNote'), { target: { value: '' } });
    fireEvent.click(screen.getByText('siteAgents.revokeReasons.retired'));
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(service.revoke).toHaveBeenCalledWith('a1', { code: 'retired', note: '' }, 'S1'));
  });

  it('Batch 553: the update window needs both times, and saves with the printers and shares', async () => {
    const service = fake(true);
    const { container } = render(<SiteAgentsSection selectedFacilityId="S1" service={service} />);
    await screen.findByText('siteAgents.updatesHeading');
    const [start, end] = Array.from(container.querySelectorAll('input[type="time"]')) as HTMLInputElement[];
    fireEvent.change(start, { target: { value: '02:00' } });
    expect(screen.getByText('siteAgents.updateWindow.problem.bothRequired')).toBeTruthy();
    expect((screen.getByText('siteAgents.save') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(end, { target: { value: '04:00' } });
    fireEvent.click(screen.getByText('siteAgents.save'));
    await waitFor(() => expect(service.saved[0]?.updateWindow).toEqual({ start: '02:00', end: '04:00' }));
  });

  it('Batch 553: a pickup share hands to an import picked from the list, or to a channel (already-used channels offered)', async () => {
    const service = fake(true);
    (service.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { siteId: 'S1', printers: [], shares: [
      { shareId: 'in1', uncPath: '\\\\fs\\in', direction: 'pickup', pickup: { pattern: '*.hl7', minStableSeconds: 30, maxFileMegabytes: 50, afterHandover: 'moveToProcessed', rejectedFolder: 'rejected', handTo: { kind: 'engineChannel', channelId: 'ADT_IN' } } },
    ] } });
    const { container } = render(<SiteAgentsSection selectedFacilityId="S1" service={service} />);
    await screen.findByDisplayValue('ADT_IN');
    expect(Array.from(container.querySelectorAll('#ps-siteagents-channels option')).map(o => o.getAttribute('value'))).toEqual(['ADT_IN']);
    fireEvent.change(screen.getByLabelText('siteAgents.share.handTo'), { target: { value: 'apiImport' } });
    const importKind = screen.getByLabelText('siteAgents.share.importKind') as HTMLSelectElement;
    expect(importKind.value).toBe('orders');
    fireEvent.change(importKind, { target: { value: 'results' } });
    expect((screen.getByLabelText('siteAgents.share.importKind') as HTMLSelectElement).value).toBe('results');
  });

  it('the demo explains that no agent can enrol, and still makes a code', async () => {
    const service = fake(false);
    render(<SiteAgentsSection selectedFacilityId="S1" service={service} />);
    expect(screen.getByText('siteAgents.demoNote')).toBeTruthy();
    expect(await screen.findByText('siteAgents.noAgentsDemo')).toBeTruthy();
    fireEvent.click(screen.getByText('siteAgents.newCode'));
    expect(await screen.findByText('ABCD-EFGH')).toBeTruthy();
  });

  it('lists the agents with their status; revoking asks for a reason first', async () => {
    const service = fake(true);
    render(<SiteAgentsSection selectedFacilityId="S1" service={service} />);
    expect(await screen.findByText('LAB-PC-01')).toBeTruthy();
    expect(screen.getByText('siteAgents.status.offline')).toBeTruthy();
    fireEvent.click(screen.getByText('siteAgents.revoke'));
    const confirm = screen.getByText('siteAgents.confirmRevoke') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByText('siteAgents.revokeReasons.replaced'));
    fireEvent.click(confirm);
    await waitFor(() => expect(service.revoke).toHaveBeenCalledWith('a1', { code: 'replaced', note: '' }, 'S1'));
  });

  it('adds a printer, shows a problem until it has an address, then saves', async () => {
    const service = fake(true);
    render(<SiteAgentsSection selectedFacilityId="S1" service={service} />);
    fireEvent.click(await screen.findByText('siteAgents.addPrinter'));
    expect(screen.getByText('siteAgents.printer.problem.hostRequired')).toBeTruthy();
    const save = screen.getByText('siteAgents.save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('siteAgents.printer.host'), { target: { value: '10.20.30.40' } });
    expect(screen.queryByText('siteAgents.printer.problem.hostRequired')).toBeNull();
    fireEvent.click(save);
    await waitFor(() => expect(service.saved[0]?.printers[0]).toMatchObject({ host: '10.20.30.40', protocol: 'IPPS', port: 631 }));
    expect(await screen.findByText('siteAgents.notice.saved')).toBeTruthy();
  });

  it('a label printer is fixed to Raw 9100', async () => {
    render(<SiteAgentsSection selectedFacilityId="S1" service={fake(true)} />);
    fireEvent.click(await screen.findByText('siteAgents.addPrinter'));
    fireEvent.change(screen.getByLabelText('siteAgents.printer.kind'), { target: { value: 'label' } });
    const protocol = screen.getByLabelText('siteAgents.printer.protocol') as HTMLSelectElement;
    expect(protocol.value).toBe('RAW_9100');
    expect(protocol.disabled).toBe(true);
  });

  it('a pickup share needs a pattern', async () => {
    render(<SiteAgentsSection selectedFacilityId="S1" service={fake(true)} />);
    fireEvent.click(await screen.findByText('siteAgents.addPickupShare'));
    fireEvent.change(screen.getByLabelText('siteAgents.share.unc'), { target: { value: '\\\\files\\in' } });
    expect(screen.getByText('siteAgents.share.problem.patternRequired')).toBeTruthy();
  });
});
