// @vitest-environment happy-dom
// src/components/FacilityDictionary/FacilityPrintingTab.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({ getById: vi.fn(), setPrintSettings: vi.fn() }));
const agents = vi.hoisted(() => ({ reportPrinters: vi.fn() }));
vi.mock('@/services', () => ({ facilityService: svc, siteAgentAdminService: agents }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) =>
    <button disabled={disabled} onClick={onClick}>{children}</button>,
}));

import { FacilityPrintingTab } from './FacilityPrintingTab';
import type { Facility } from '@/services/facilities/IFacilityService';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const K = 'facilityPrintingTab';
const facility = { id: 'c1', name: 'Metro General' } as Facility;

describe('FacilityPrintingTab (Batch 517, PS-337)', () => {
  it('reads the stored settings, and an ordering client sees only paper handling', async () => {
    svc.getById.mockResolvedValue({ ok: true, data: { ...facility, printPresentationPreference: { duplexMode: 'SIMPLEX' } } });
    render(<FacilityPrintingTab facility={facility} isPerformingLab={false} />);
    await waitFor(() => expect((screen.getByLabelText(`${K}.presentation.duplex`) as HTMLSelectElement).value).toBe('SIMPLEX'));
    expect(screen.queryByText(`${K}.delivery.title`)).toBeNull();
  });

  it('a performing lab turns printing on, is told to name the printer, then saves', async () => {
    svc.getById.mockResolvedValue({ ok: true, data: facility });
    svc.setPrintSettings.mockResolvedValue({ ok: true, data: facility });
    render(<FacilityPrintingTab facility={facility} isPerformingLab />);
    await waitFor(() => expect(svc.getById).toHaveBeenCalledWith('c1'));
    fireEvent.click(screen.getByText(`${K}.delivery.enabled`));
    expect(screen.getByRole('alert').textContent).toBe(`${K}.problems.printerNameRequired`);
    expect((screen.getByText(`${K}.save`) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(`${K}.delivery.printerName`), { target: { value: 'Histology LaserJet' } });
    fireEvent.click(screen.getByText(`${K}.save`));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(`${K}.saved`));
    expect(svc.setPrintSettings).toHaveBeenCalledWith('c1', {
      printDeliveryConfig: { enabled: true, mode: 'NATIVE_QZ_TRAY', printerName: 'Histology LaserJet' },
      printPresentationPreference: undefined,
    });
  });

  it('shows a refusal in words', async () => {
    svc.getById.mockResolvedValue({ ok: true, data: facility });
    svc.setPrintSettings.mockResolvedValue({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    render(<FacilityPrintingTab facility={facility} isPerformingLab={false} />);
    fireEvent.click(screen.getByText(`${K}.save`));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(`${K}.notPermitted`));
  });

  it('Batch 553: a direct-network lab picks its default from its own site agent printers', async () => {
    svc.getById.mockResolvedValue({ ok: true, data: { ...facility, printDeliveryConfig: { enabled: true, mode: 'DIRECT_NETWORK_PRINT' } } });
    svc.setPrintSettings.mockResolvedValue({ ok: true, data: facility });
    agents.reportPrinters.mockResolvedValue({ ok: true, data: [{ destinationId: 'rep-1', kind: 'report', protocol: 'IPPS', host: 'p', port: 631, displayName: 'Front desk' }] });
    render(<FacilityPrintingTab facility={facility} isPerformingLab />);
    await waitFor(() => expect(agents.reportPrinters).toHaveBeenCalledWith('c1', 'facilityDefault'));
    const printer = await screen.findByLabelText('printDestination.printer') as HTMLSelectElement;
    await waitFor(() => expect(printer.disabled).toBe(false));
    fireEvent.change(printer, { target: { value: 'rep-1' } });
    fireEvent.click(screen.getByText(`${K}.save`));
    await waitFor(() => expect(svc.setPrintSettings).toHaveBeenCalled());
    expect(svc.setPrintSettings.mock.calls[0][1].printDeliveryConfig.directNetworkPrintDestination)
      .toEqual({ agentPrinter: { siteId: 'c1', destinationId: 'rep-1' }, displayName: 'Front desk' });
  });
});
