// @vitest-environment happy-dom
// Batch 534: the line for each report held for the release delay, with Recall for the person who released it.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { svc, toast } = vi.hoisted(() => ({ svc: { list: vi.fn(), recall: vi.fn() }, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast }));
vi.mock('@/services/reportRelease/releaseThroughDelay', () => ({ listHeldReports: svc.list, recallHeldReport: svc.recall }));
// Batch 649: Recall also needs report:release:recall; `cap.allowed` is what the person holds here.
const cap = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => cap.allowed, decide: () => ({ allowed: cap.allowed }) }) }));

import { HeldReportsBanner } from './HeldReportsBanner';

const later = new Date(Date.now() + 600_000).toISOString();
const held = (over: Record<string, unknown> = {}) => ({
  id: 'h1', caseId: 'C1', kind: 'cytology-revision', event: { caseId: 'C1', reportType: 'CORRECTED', releasedAt: 'x' }, followUps: [],
  heldAt: 'x', expiresAt: later, releasedBy: { userId: 'P1', userName: 'Dr P' }, status: 'held', ...over,
});

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe('HeldReportsBanner', () => {
  it('nothing held: nothing shown', async () => {
    svc.list.mockResolvedValue([]);
    const { container } = render(<HeldReportsBanner caseId="C1" user={{ id: 'P1', name: 'Dr P' }} />);
    await waitFor(() => expect(svc.list).toHaveBeenCalledWith('C1'));
    expect(container.innerHTML).toBe('');
  });
  it('the person who released it can recall it; the screen reloads', async () => {
    svc.list.mockResolvedValue([held()]);
    svc.recall.mockResolvedValue({ ok: true });
    const onRecalled = vi.fn();
    render(<HeldReportsBanner caseId="C1" user={{ id: 'P1', name: 'Dr P' }} onRecalled={onRecalled} />);
    expect((await screen.findByText(/heldReports.line/)).textContent).toContain('heldReports.kinds.cytology-revision');
    fireEvent.click(screen.getByText('heldReports.recall'));
    await waitFor(() => expect(svc.recall).toHaveBeenCalledWith('h1', { userId: 'P1', userName: 'Dr P' }));
    await waitFor(() => expect(onRecalled).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('heldReports.recalled');
  });
  it('Batch 649: the person who released it, without report:release:recall, sees the line without Recall', async () => {
    svc.list.mockResolvedValue([held()]);
    cap.allowed = false;
    try {
      render(<HeldReportsBanner caseId="C1" user={{ id: 'P1', name: 'Dr P' }} />);
      await waitFor(() => expect(svc.list).toHaveBeenCalled());
      expect(screen.queryByText('heldReports.recall')).toBeNull();
    } finally { cap.allowed = true; }
  });

  it('someone else, or a sign-out (it has its own banner), sees the line without Recall', async () => {
    svc.list.mockResolvedValue([held(), held({ id: 'h2', kind: 'surgical-sign-out', releasedBy: { userId: 'P2', userName: 'Dr Q' } })]);
    render(<HeldReportsBanner caseId="C1" user={{ id: 'P2', name: 'Dr Q' }} />);
    expect(await screen.findAllByText(/heldReports.line/)).toHaveLength(2);
    expect(screen.queryByText('heldReports.recall')).toBeNull();
  });
});
