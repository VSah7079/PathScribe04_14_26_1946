// @vitest-environment happy-dom
// Batch 619 (PS-800): the Outbound Queue screen: what it shows and the calls its buttons make.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { OutboundQueueItem } from '@/services';

const state = vi.hoisted(() => ({ items: [] as unknown[] }));
const svc = vi.hoisted(() => ({
  list: vi.fn(), hold: vi.fn(), release: vi.fn(), retry: vi.fn(), markNotReportable: vi.fn(), retract: vi.fn(), overrideRelease: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k} ${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/contexts/BreadcrumbContext', () => ({ useBreadcrumb: () => ({ pushCrumb: () => {} }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('@/utils/formatDate', () => ({ formatDateTime: (iso?: string) => iso ?? '' }));
vi.mock('@/services', async () => {
  const types = await import('@/services/outboundQueue/outboundQueueTypes');
  const view = await import('@/services/outboundQueue/outboundQueueView');
  return { outboundQueueService: svc, outboundActionAllowed: view.allows, OUTBOUND_FEEDS: types.OUTBOUND_FEEDS, OUTBOUND_STATES: types.OUTBOUND_STATES, HOLD_REASONS: types.HOLD_REASONS };
});
import OutboundQueuePage from './OutboundQueuePage';

const item = (o: Partial<OutboundQueueItem>): OutboundQueueItem => ({
  ref: 'result:1', feed: 'result', id: '1', destination: 'interfaceEngine', kind: 'final', state: 'waiting',
  queuedAt: '2026-10-01T00:00:00Z', scheduledFor: '2026-10-01T00:00:00Z', attempts: 0, accessionNumber: 'S26-1', facilityId: 'f1', ...o,
});
const counts = { waiting: 1, held: 0, sent: 0, acknowledged: 0, failed: 0, deadLettered: 0, rejected: 0, notReportable: 0, retracted: 0 };
const view = () => ({ ok: true, data: { items: state.items, counts, deadlineCounts: { dueSoon: 1, overdue: 2 }, billingCounts: { needsReview: 3, amendmentDelta: 4 }, facilityIds: ['f1'] } });
const ok = (refs: string[]) => ({ ok: true, data: refs.map(ref => ({ ref, ok: true })) });

beforeEach(() => {
  cleanup();
  Object.values(svc).forEach(f => f.mockReset());
  state.items = [item({}), item({ ref: 'result:2', id: '2', state: 'failed', errorCode: 'DISPATCH_TIMEOUT', attempts: 3, accessionNumber: 'S26-2' })];
  svc.list.mockImplementation(async () => view());
  svc.hold.mockImplementation(async (refs: string[]) => ok(refs));
  svc.retry.mockImplementation(async (refs: string[]) => ok(refs));
  svc.retract.mockImplementation(async (refs: string[]) => ok(refs));
});

describe('OutboundQueuePage', () => {
  it('lists the messages with the accession number tagged data-phi, and the deadline and review tiles', async () => {
    render(<OutboundQueuePage />);
    await screen.findByText('S26-1');
    expect(screen.getByText('S26-1').getAttribute('data-phi')).toBe('true');
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('outboundQueue.state.waiting').length).toBeGreaterThan(0);
  });

  it('holds the selected message with a picked reason', async () => {
    render(<OutboundQueuePage />);
    await screen.findByText('S26-1');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByText('outboundQueue.actions.hold'));
    fireEvent.click(screen.getByLabelText('outboundQueue.holdReason.billingReview'));
    fireEvent.click(screen.getByText('outboundQueue.panel.confirm'));
    await waitFor(() => expect(svc.hold).toHaveBeenCalledWith(['result:1'], 'billingReview', ''));
    await screen.findByRole('status');
  });

  it('Escape closes the reason panel without acting', async () => {
    render(<OutboundQueuePage />);
    await screen.findByText('S26-1');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByText('outboundQueue.actions.hold'));
    expect(screen.getByText('outboundQueue.panel.hold')).toBeTruthy();
    fireEvent.keyDown(screen.getByText('outboundQueue.panel.hold'), { key: 'Escape' });
    expect(screen.queryByText('outboundQueue.panel.hold')).toBeNull();
    expect(svc.hold).not.toHaveBeenCalled();
  });

  it('retries a failed message directly, with no reason asked', async () => {
    render(<OutboundQueuePage />);
    await screen.findByText('S26-1');
    fireEvent.click(screen.getAllByRole('checkbox')[2]);
    fireEvent.click(screen.getByText('outboundQueue.actions.retry'));
    await waitFor(() => expect(svc.retry).toHaveBeenCalledWith(['result:2'], undefined));
  });

  it('a rejected message asks why it was fixed before it is resubmitted, and shows only the codes', async () => {
    state.items = [item({ ref: 'registry:r', feed: 'registry', id: 'r', destination: 'registry', state: 'rejected', transport: 'sftp', rejection: { errorCodes: ['E22', 'E01'], correctionDueAt: '2026-10-20T00:00:00Z' }, deadline: { dueAt: '2026-10-05T00:00:00Z', flag: 'overdue' } })];
    render(<OutboundQueuePage />);
    await screen.findByText('E22, E01');
    expect(screen.getByText('outboundQueue.transport.sftp')).toBeTruthy();
    expect(screen.getByText('outboundQueue.deadline.overdue', { selector: 'span.ps-obq-flag' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByText('outboundQueue.actions.retry'));
    expect(svc.retry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('outboundQueue.resubmitReason.codingCorrected'));
    fireEvent.click(screen.getByText('outboundQueue.panel.confirm'));
    await waitFor(() => expect(svc.retry).toHaveBeenCalledWith(['registry:r'], 'codingCorrected'));
  });

  it('retracts a billing charge with a reason and can release it now', async () => {
    state.items = [item({ ref: 'billing:c', feed: 'billing', id: 'c', destination: 'billingSystem', billing: { billingType: 'TC', needsReview: 'unmappedCpt' } })];
    svc.overrideRelease.mockImplementation(async (refs: string[]) => ok(refs));
    render(<OutboundQueuePage />);
    await screen.findByText('outboundQueue.needsReview.unmappedCpt');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByText('outboundQueue.actions.overrideRelease'));
    await waitFor(() => expect(svc.overrideRelease).toHaveBeenCalledWith(['billing:c']));
    fireEvent.click(screen.getByText('outboundQueue.actions.retract'));
    fireEvent.click(screen.getByLabelText('outboundQueue.retractReason.caseAmended'));
    fireEvent.click(screen.getByText('outboundQueue.panel.confirm'));
    await waitFor(() => expect(svc.retract).toHaveBeenCalledWith(['billing:c'], 'caseAmended'));
  });

  it('says how many were not applicable, and shows the empty state', async () => {
    render(<OutboundQueuePage />);
    await screen.findByText('S26-1');
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByText('outboundQueue.actions.retry'));
    await waitFor(() => expect(svc.retry).toHaveBeenCalledWith(['result:2'], undefined));
    await screen.findByText(/outboundQueue.summary.skipped/);
    state.items = [];
    fireEvent.click(screen.getByText('outboundQueue.feed.billing'));
    await screen.findByText('outboundQueue.empty');
  });
});
