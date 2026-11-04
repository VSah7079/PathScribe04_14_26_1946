// @vitest-environment happy-dom
//
// src/pages/PrintQueueDashboardSection.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-279 — a real, page-level render test for the new admin
// dashboard, same real conventions OrSuiteDashboardPage.test.tsx
// already establishes: react-i18next mocked to return the raw key
// (+ interpolation values, so this test can assert on real keys
// rather than translated prose), every real service this page calls
// mocked at the module boundary. This exercises the real UI wiring
// (selection, filtering, button gating, the redirect mini-form) — the
// actual business logic each button delegates to is already covered
// in mockPrintQueueService.test.ts/redispatchPrintJob.test.ts/
// runScheduledBatchAggregation.test.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));

// Batch 515: the action buttons are CapabilityButtons; the permission itself is tested in the services.
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) =>
    <button type="button" className={className} onClick={onClick} disabled={disabled}>{children}</button>,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1', name: 'Admin One' } }),
}));

const queueService = vi.hoisted(() => ({
  getAll: vi.fn(),
  holdPrintJob: vi.fn(),
  releaseHold: vi.fn(),
  cancelPrintJob: vi.fn(),
  holdMany: vi.fn(),
  releaseHoldMany: vi.fn(),
  cancelMany: vi.fn(),
}));
vi.mock('@/services/printing/mockPrintQueueService', () => ({ mockPrintQueueService: queueService }));

const redispatch = vi.hoisted(() => ({
  redispatchPrintJob: vi.fn(),
  redispatchManyPrintJobs: vi.fn(),
  redirectAndRedispatchPrintJob: vi.fn(),
  redirectAndRedispatchManyPrintJobs: vi.fn(),
}));
vi.mock('@/services/printing/redispatchPrintJob', () => redispatch);

// Batch 553: the site's agent printers (the service and its capability are tested in siteAgentAdmin.test.ts).
const agentPrinters = vi.hoisted(() => ({ useAgentPrinters: vi.fn((siteId: string | null) => ({ printers: siteId ? [{ destinationId: 'rep-1', label: 'Front desk' }] : [], loading: false, error: null })) }));
vi.mock('@/hooks/useAgentPrinters', () => agentPrinters);

const batchAggregation = vi.hoisted(() => ({ runScheduledBatchAggregation: vi.fn() }));
vi.mock('@/services/printing/runScheduledBatchAggregation', () => batchAggregation);

import PrintQueueDashboardSection from './PrintQueueDashboardSection';

function job(overrides: Record<string, unknown> & { id: string }) {
  return {
    caseId: 'S26-1001', reportType: 'FINAL', mode: 'DIRECT_NETWORK_PRINT', priority: 'Routine',
    status: 'QUEUED', queuedAt: '2026-09-23T10:00:00.000Z', retryCount: 0, maxRetriesExceeded: false,
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(queueService).forEach(fn => fn.mockReset());
  Object.values(redispatch).forEach(fn => fn.mockReset());
  batchAggregation.runScheduledBatchAggregation.mockReset();
  queueService.getAll.mockResolvedValue({ ok: true, data: [] });
  queueService.holdPrintJob.mockResolvedValue({ ok: true, data: {} });
  queueService.releaseHold.mockResolvedValue({ ok: true, data: {} });
  queueService.cancelPrintJob.mockResolvedValue({ ok: true, data: {} });
  queueService.holdMany.mockResolvedValue({ ok: true, data: { succeededIds: [], failed: [] } });
  queueService.releaseHoldMany.mockResolvedValue({ ok: true, data: { succeededIds: [], failed: [] } });
  queueService.cancelMany.mockResolvedValue({ ok: true, data: { succeededIds: [], failed: [] } });
  redispatch.redispatchPrintJob.mockResolvedValue({ outcome: 'dispatched', jobId: 'j1' });
  redispatch.redispatchManyPrintJobs.mockResolvedValue([]);
  redispatch.redirectAndRedispatchPrintJob.mockResolvedValue({ outcome: 'dispatched', jobId: 'j1' });
  redispatch.redirectAndRedispatchManyPrintJobs.mockResolvedValue([]);
  batchAggregation.runScheduledBatchAggregation.mockResolvedValue({ groups: [], skippedJobIds: [], taggedJobCount: 0 });
});
afterEach(() => cleanup());

describe('PrintQueueDashboardSection', () => {
  it('renders the empty state when there are no real jobs', async () => {
    render(<PrintQueueDashboardSection />);
    await waitFor(() => expect(queueService.getAll).toHaveBeenCalled());
    expect(await screen.findByText('printQueueDashboard.noJobs')).toBeTruthy();
  });

  it('Batch 549 (F3): a job that needs the site agent shows its reason in the user\'s language, not the stored English', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'FAILED', errorCode: 'NEEDS_SITE_AGENT', errorMessage: 'Network printing needs the PathScribe site agent (or the API server); it cannot be sent from a browser.' } as never)] });
    render(<PrintQueueDashboardSection />);
    expect(await screen.findByText('printQueueDashboard.failure.needsSiteAgent')).toBeTruthy();
    expect(screen.queryByText(/cannot be sent from a browser/)).toBeNull();
  });

  it('Batch 552: a job the site agent could only send (Raw 9100, LPR) shows "Sent to printer", not "Printed"', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'PRINTED', confirmation: 'sent' } as never), job({ id: 'j2', status: 'PRINTED', confirmation: 'printed', caseId: 'S26-1002' } as never)] });
    render(<PrintQueueDashboardSection />);
    expect(await screen.findByText('printQueueDashboard.status.SENT_TO_PRINTER')).toBeTruthy();
    expect(screen.getAllByText('printQueueDashboard.status.PRINTED').length).toBeGreaterThan(0);
  });

  it('Batch 606: a job printed through the Simulated transport says "Simulated: sent to printer"', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'PRINTED', simulated: true } as never), job({ id: 'j2', status: 'PRINTED', caseId: 'S26-1002' } as never)] });
    render(<PrintQueueDashboardSection />);
    expect(await screen.findAllByText('printQueueDashboard.simulatedSent')).toHaveLength(1);
  });

  it('renders a real, loaded job row with its status and gates actions by its real status', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'FAILED', errorMessage: 'jammed' })] });
    render(<PrintQueueDashboardSection />);
    expect(await screen.findByText('S26-1001')).toBeTruthy();
    expect(screen.getByText('jammed')).toBeTruthy();

    const holdBtn = screen.getByRole('button', { name: 'printQueueDashboard.action.hold' });
    const releaseBtn = screen.getByRole('button', { name: 'printQueueDashboard.action.release' });
    const retryBtn = screen.getByRole('button', { name: 'printQueueDashboard.action.retry' });
    // Real, per HOLDABLE_STATUSES/RETRIABLE — a FAILED job can be held and retried, but not released (it's not on HOLD).
    expect(holdBtn.hasAttribute('disabled')).toBe(false);
    expect(retryBtn.hasAttribute('disabled')).toBe(false);
    expect(releaseBtn.hasAttribute('disabled')).toBe(true);
  });

  it('clicking Hold on a real, holdable job calls the real holdPrintJob service and reloads', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'QUEUED' })] });
    render(<PrintQueueDashboardSection />);
    await screen.findByText('S26-1001');
    fireEvent.click(screen.getByRole('button', { name: 'printQueueDashboard.action.hold' }));
    await waitFor(() => expect(queueService.holdPrintJob).toHaveBeenCalledWith('j1', 'admin-1'));
    await waitFor(() => expect(queueService.getAll).toHaveBeenCalledTimes(2));
  });

  it('selecting a row reveals the real bulk toolbar, and Bulk Cancel calls cancelMany with every selected real id', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', caseId: 'S26-A' }), job({ id: 'j2', caseId: 'S26-B' })] });
    render(<PrintQueueDashboardSection />);
    await screen.findByText('S26-A');
    await screen.findByText('S26-B');
    const checkboxes = screen.getAllByRole('checkbox');
    // checkboxes[0] is the header select-all; row checkboxes follow.
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    expect(await screen.findByText(/printQueueDashboard\.bulk\.selectedCount/)).toBeTruthy();

    // Real, per this component's own DOM order — the bulk toolbar
    // renders above the table, so its own Cancel button is the FIRST
    // one in document order, ahead of any per-row Cancel button.
    const bulkCancel = screen.getAllByRole('button', { name: 'printQueueDashboard.action.cancel' })[0];
    fireEvent.click(bulkCancel);
    await waitFor(() => expect(queueService.cancelMany).toHaveBeenCalledWith(['j1', 'j2'], 'admin-1'));
  });

  it('Run Batch Now calls the real runScheduledBatchAggregation with the real, chosen window and groupBy, and shows the real result message', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [] });
    batchAggregation.runScheduledBatchAggregation.mockResolvedValue({ groups: [{ batchId: 'b1', groupBy: 'clientAccount', groupKey: 'CLIENT-A', jobIds: ['j1'] }], skippedJobIds: [], taggedJobCount: 1 });
    render(<PrintQueueDashboardSection />);
    await waitFor(() => expect(queueService.getAll).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'printQueueDashboard.batch.runNow' }));
    await waitFor(() => expect(batchAggregation.runScheduledBatchAggregation).toHaveBeenCalledWith(
      { groupBy: 'clientAccount', windowStart: '08:00', windowEnd: '17:00' },
      expect.any(String),
    ));
    expect(await screen.findByText(/printQueueDashboard\.batch\.resultMessage/)).toBeTruthy();
  });

  it('Redirect on a real DIRECT_NETWORK_PRINT job opens the real redirect form, and Confirm calls redirectAndRedispatchPrintJob with the real, entered destination', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'FAILED', mode: 'DIRECT_NETWORK_PRINT' })] });
    render(<PrintQueueDashboardSection />);
    await screen.findByText('S26-1001');
    fireEvent.click(screen.getByRole('button', { name: 'printQueueDashboard.action.redirect' }));

    // A job queued before Batch 553 has no site, so only a printer address can be given.
    expect(screen.getByText('printDestination.agentNoSite')).toBeTruthy();
    const ipInput = await screen.findByPlaceholderText('printDestination.placeholders.address');
    const confirm = screen.getByRole('button', { name: 'printQueueDashboard.redirect.confirm' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(ipInput, { target: { value: '10.0.0.9' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(redispatch.redirectAndRedispatchPrintJob).toHaveBeenCalledWith(
      'j1', { protocol: 'RAW_9100', ipAddress: '10.0.0.9' }, 'admin-1',
    ));
  });

  it("Batch 553: Redirect of one lab's jobs offers that site's agent printers first; one pick and Confirm", async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'FAILED', mode: 'DIRECT_NETWORK_PRINT', performingFacilityId: 'S1' })] });
    render(<PrintQueueDashboardSection />);
    await screen.findByText('S26-1001');
    fireEvent.click(screen.getByRole('button', { name: 'printQueueDashboard.action.redirect' }));
    expect((screen.getByLabelText('printDestination.kind') as HTMLSelectElement).value).toBe('agent');
    expect(agentPrinters.useAgentPrinters).toHaveBeenCalledWith('S1', 'redirect');
    fireEvent.change(screen.getByLabelText('printDestination.printer'), { target: { value: 'rep-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'printQueueDashboard.redirect.confirm' }));
    await waitFor(() => expect(redispatch.redirectAndRedispatchPrintJob).toHaveBeenCalledWith(
      'j1', { agentPrinter: { siteId: 'S1', destinationId: 'rep-1' }, displayName: 'Front desk' }, 'admin-1',
    ));
  });

  it("Batch 553: a refused redirect keeps the form open and says how many jobs weren't redirected", async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'FAILED', mode: 'DIRECT_NETWORK_PRINT', performingFacilityId: 'S1' })] });
    redispatch.redirectAndRedispatchPrintJob.mockResolvedValue({ outcome: 'failed', jobId: 'j1', redirectError: 'PRINT_JOB_WRONG_SITE' });
    render(<PrintQueueDashboardSection />);
    await screen.findByText('S26-1001');
    fireEvent.click(screen.getByRole('button', { name: 'printQueueDashboard.action.redirect' }));
    fireEvent.change(screen.getByLabelText('printDestination.printer'), { target: { value: 'rep-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'printQueueDashboard.redirect.confirm' }));
    expect(await screen.findByText('printQueueDashboard.redirect.notRedirected:{"count":1}')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'printQueueDashboard.redirect.confirm' })).toBeTruthy();
  });

  it('Batch 553: a job sent to an agent printer shows the printer by name', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'FAILED', mode: 'DIRECT_NETWORK_PRINT', resolvedDestination: { agentPrinter: { siteId: 'S1', destinationId: 'rep-9' }, displayName: 'Cytology desk' } })] });
    render(<PrintQueueDashboardSection />);
    expect(await screen.findByText('Cytology desk')).toBeTruthy();
  });

  it('Redirect is disabled for a real NATIVE_QZ_TRAY job — a PrintDestination only ever applies to Direct Network Print', async () => {
    queueService.getAll.mockResolvedValue({ ok: true, data: [job({ id: 'j1', status: 'FAILED', mode: 'NATIVE_QZ_TRAY' })] });
    render(<PrintQueueDashboardSection />);
    await screen.findByText('S26-1001');
    expect(screen.getByRole('button', { name: 'printQueueDashboard.action.redirect' }).hasAttribute('disabled')).toBe(true);
  });

  it('changing the status filter shows only real jobs matching that status', async () => {
    queueService.getAll.mockResolvedValue({
      ok: true, data: [job({ id: 'j1', caseId: 'S26-QUEUED', status: 'QUEUED' }), job({ id: 'j2', caseId: 'S26-PRINTED', status: 'PRINTED' })],
    });
    render(<PrintQueueDashboardSection />);
    await screen.findByText('S26-QUEUED');
    expect(screen.getByText('S26-PRINTED')).toBeTruthy();

    const filterSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(filterSelect, { target: { value: 'PRINTED' } });

    await waitFor(() => expect(screen.queryByText('S26-QUEUED')).toBeNull());
    expect(screen.getByText('S26-PRINTED')).toBeTruthy();
  });
});
