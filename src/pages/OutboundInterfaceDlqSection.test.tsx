// @vitest-environment happy-dom
// src/pages/OutboundInterfaceDlqSection.test.tsx
// Batch 518 (PS-122): the unified Outbound view — all seven queues, actions
// through the service, identifiers tagged as PHI.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  outboundRows: vi.fn(),
  resendOutboundEntry: vi.fn(async () => 'sent'),
  dispatchOutboundEntry: vi.fn(async () => 'notPermitted'),
  simulateOutboundFailure: vi.fn(async () => 'marked'),
  captureOutboundFailureAsCapa: vi.fn(async () => true),
}));
vi.mock('@/services', () => ({
  ...svc,
  outboundQueueDeps: { tag: 'deps' },
  OUTBOUND_QUEUE_TYPES: ['patient_adt', 'result', 'lis_sync', 'accession', 'cytology_result', 'referral', 'molecular_order', 'report_delivery'],
}));
vi.mock('./DeliveryExceptionsPanel', () => ({ DeliveryExceptionsPanel: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, capability }: { children: React.ReactNode; onClick: () => void; capability: string }) =>
    <button data-capability={capability} onClick={onClick}>{children}</button>,
}));

import OutboundInterfaceDlqSection from './OutboundInterfaceDlqSection';

const K = 'outboundInterfaceDlq';
const row = (id: string, status: 'FAILED' | 'QUEUED') => ({ id, status, identifier: `S26-${id}`, kind: 'order.accessioned', queuedAt: '2026-10-10T10:00:00Z', retryCount: 1, maxRetriesExceeded: false, errorCode: 'DISPATCH_TIMEOUT' });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('OutboundInterfaceDlqSection (Batch 518, PS-122)', () => {
  it('offers all eight queues (Batch 520: report delivery) and loads the chosen one', async () => {
    svc.outboundRows.mockResolvedValue({ failed: [], queued: [] });
    render(<OutboundInterfaceDlqSection />);
    const select = screen.getByLabelText(`${K}.queueLabel`) as HTMLSelectElement;
    expect(select.options).toHaveLength(8);
    fireEvent.change(select, { target: { value: 'referral' } });
    await waitFor(() => expect(svc.outboundRows).toHaveBeenLastCalledWith('referral', { tag: 'deps' }));
    fireEvent.change(select, { target: { value: 'report_delivery' } });
    await waitFor(() => expect(svc.outboundRows).toHaveBeenLastCalledWith('report_delivery', { tag: 'deps' }));
    expect(screen.getAllByText(`${K}.queueType.reportDelivery.identifierColumnLabel`).length).toBeGreaterThan(0);
  });

  it('Retry goes through the service with its permission, and the result is shown; identifiers are PHI', async () => {
    svc.outboundRows.mockResolvedValue({ failed: [row('1', 'FAILED')], queued: [row('2', 'QUEUED')] });
    render(<OutboundInterfaceDlqSection />);
    await waitFor(() => expect(screen.getByText('S26-1')).toBeTruthy());
    expect(screen.getByText('S26-1').getAttribute('data-phi')).toBe('true');
    const retry = screen.getByText(`${K}.retryDispatch`);
    expect(retry.getAttribute('data-capability')).toBe('interface:outbound:resend');
    fireEvent.click(retry);
    await waitFor(() => expect(svc.resendOutboundEntry).toHaveBeenCalledWith('patient_adt', '1', { tag: 'deps' }));
    await waitFor(() => expect(screen.getByText(`${K}.outcomes.sent`)).toBeTruthy());
    fireEvent.click(screen.getByText(`${K}.dispatchNow`));
    await waitFor(() => expect(screen.getByText(`${K}.outcomes.notPermitted`)).toBeTruthy());
    fireEvent.click(screen.getByText(`${K}.simulate.rejected`));
    await waitFor(() => expect(svc.simulateOutboundFailure).toHaveBeenCalledWith('patient_adt', '2', 'rejected', { tag: 'deps' }));
  });

  it('Capture as CAPA raises it once and shows it captured', async () => {
    svc.outboundRows.mockResolvedValue({ failed: [row('1', 'FAILED')], queued: [] });
    render(<OutboundInterfaceDlqSection />);
    await waitFor(() => screen.getByText(`${K}.captureAsCapa`));
    fireEvent.click(screen.getByText(`${K}.captureAsCapa`));
    await waitFor(() => expect(screen.getByText(`${K}.captured`)).toBeTruthy());
    expect(svc.captureOutboundFailureAsCapa).toHaveBeenCalledWith('patient_adt', '1', 'u1', { tag: 'deps' });
  });
});
