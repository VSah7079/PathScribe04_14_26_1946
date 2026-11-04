// @vitest-environment happy-dom
// Batch 610 (#12): the Retention Holds queue: the holds with case, reason, who and when; Release with a note; CSV export.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({ load: vi.fn(), release: vi.fn(), runExport: vi.fn(), exportQueue: vi.fn(), toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/services/retentionHolds/loadRetentionHoldsQueue', () => ({ loadRetentionHoldsQueue: h.load }));
vi.mock('@/services/cases/caseHolds', () => ({ releaseHold: h.release }));
vi.mock('@/services/exports/runExport', () => ({ runExport: h.runExport }));
vi.mock('@/services/retentionHolds/exportRetentionHoldsQueue', () => ({ exportRetentionHoldsQueue: h.exportQueue }));
vi.mock('@/services', () => ({ authorizationService: {}, auditService: { logEvent: vi.fn() } }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase: vi.fn(), updateCase: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: h.toast }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/contexts/BreadcrumbContext', () => ({ useBreadcrumb: () => ({ pushCrumb: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Records One' } }) }));
vi.mock('@/hooks/useFieldRequirements', () => ({ useFieldRequirements: () => [] }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));

import RetentionHoldsQueuePage from './RetentionHoldsQueuePage';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const rows = [
  { caseId: 'c1', accession: 'S26-0001', facilityId: 'F1', holdId: 'h1', reason: 'litigation_hold', note: 'Counsel request', setAt: '2026-10-01T09:00:00Z', setByUserName: 'Dr Lee' },
  { caseId: 'c2', accession: 'S26-0002', facilityId: 'F1', holdId: 'h2', reason: 'research_hold', note: '', setAt: '2026-10-02T09:00:00Z', setByUserName: 'Dr Kim' },
];

describe('RetentionHoldsQueuePage', () => {
  it('lists each active hold with case, reason, who and when, and filters by text', async () => {
    h.load.mockResolvedValue(rows);
    render(<RetentionHoldsQueuePage />);
    await waitFor(() => expect(screen.getByText('S26-0001')).toBeTruthy());
    expect(screen.getByText('S26-0001').getAttribute('data-phi')).toBe('accession');
    expect(screen.getByText('Dr Lee')).toBeTruthy();
    expect(screen.getByTestId('retention-holds-count').textContent).toContain('"count":2');
    fireEvent.change(screen.getByLabelText('retentionHoldsQueue.searchPlaceholder'), { target: { value: 'Kim' } });
    expect(screen.queryByText('S26-0001')).toBeNull();
    expect(screen.getByText('S26-0002')).toBeTruthy();
  });

  it('says so when nothing is held', async () => {
    h.load.mockResolvedValue([]);
    render(<RetentionHoldsQueuePage />);
    await waitFor(() => expect(screen.getByTestId('retention-holds-empty')).toBeTruthy());
  });

  it('releases a hold with a note through the shared release service, then reloads', async () => {
    h.load.mockResolvedValueOnce(rows).mockResolvedValueOnce([rows[1]]);
    h.release.mockResolvedValue({ ok: true });
    render(<RetentionHoldsQueuePage />);
    await waitFor(() => expect(screen.getByText('S26-0001')).toBeTruthy());
    expect(screen.getAllByText('retentionHoldsQueue.release.button')[0].getAttribute('data-capability')).toBe('case:retention-hold:release');
    fireEvent.click(screen.getAllByText('retentionHoldsQueue.release.button')[0]);
    const confirm = screen.getByText('retentionHoldsQueue.release.confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true); // a note is needed
    fireEvent.change(screen.getByLabelText('retentionHoldsQueue.release.noteLabel'), { target: { value: 'Case closed' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(h.release).toHaveBeenCalled());
    expect(h.release.mock.calls[0].slice(0, 4)).toEqual(['retention', 'c1', { releaseNote: 'Case closed' }, { id: 'u1', name: 'Records One' }]);
    await waitFor(() => expect(screen.queryByText('S26-0001')).toBeNull());
    expect(h.toast.success).toHaveBeenCalledWith('retentionHoldsQueue.released');
  });

  it('shows why a release was refused and keeps the hold listed', async () => {
    h.load.mockResolvedValue(rows);
    h.release.mockResolvedValue({ ok: false, reason: 'notPermitted' });
    render(<RetentionHoldsQueuePage />);
    await waitFor(() => expect(screen.getByText('S26-0001')).toBeTruthy());
    fireEvent.click(screen.getAllByText('retentionHoldsQueue.release.button')[0]);
    fireEvent.change(screen.getByLabelText('retentionHoldsQueue.release.noteLabel'), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('retentionHoldsQueue.release.confirm'));
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith('retentionHoldsQueue.releaseRefused.notPermitted'));
    expect(screen.getAllByText('S26-0001').length).toBeGreaterThan(0);
  });

  it('exports the CSV through the export service under retention:holds-queue:export', async () => {
    h.load.mockResolvedValue(rows);
    h.runExport.mockImplementation(async (_kind: string, _name: string, _params: unknown, run: () => Promise<void>) => { await run(); });
    h.exportQueue.mockResolvedValue({ ok: true });
    render(<RetentionHoldsQueuePage />);
    await waitFor(() => expect(screen.getByText('S26-0001')).toBeTruthy());
    const btn = screen.getByText('retentionHoldsQueue.export.button');
    expect(btn.getAttribute('data-capability')).toBe('retention:holds-queue:export');
    fireEvent.click(btn);
    await waitFor(() => expect(h.exportQueue).toHaveBeenCalled());
    expect(h.runExport.mock.calls[0][0]).toBe('retention.holds-queue');
  });
});
