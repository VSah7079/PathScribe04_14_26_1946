// @vitest-environment happy-dom
// Batch 613: choosing, for each recipient who cannot see every case, to narrow the report or skip them.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key) }),
}));
vi.mock('i18next', () => ({ default: { language: 'en-US' } }));

const h = vi.hoisted(() => ({ list: vi.fn(), runDue: vi.fn(), create: vi.fn(), assess: vi.fn(), has: true }));
vi.mock('@/services', async () => ({
  ...(await import('@/services/authorization/capabilityCatalog')),
  scheduledReportService: { list: h.list, runDue: h.runDue, create: h.create, assessRecipients: h.assess, runNow: vi.fn(), setActive: vi.fn(), remove: vi.fn() },
  userService: { getAll: async () => ({ ok: true, data: [
    { id: 'u2', firstName: 'Sam', lastName: 'Ray', status: 'Active' }, { id: 'u3', firstName: 'Kim', lastName: 'Ono', status: 'Active' },
  ] }) },
}));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ loading: false, has: () => h.has, decide: () => ({ allowed: h.has, reason: 'notGranted' }) }),
}));

import { ReportSchedulesPanel } from './ReportSchedulesPanel';

const saved = [{ id: 'r1', name: 'Grade 3 by month' }] as never;

beforeEach(() => {
  h.has = true;
  h.list.mockResolvedValue({ ok: true, data: [] });
  h.runDue.mockResolvedValue({ ok: true, data: [] });
  h.create.mockImplementation(async (d: unknown) => ({ ok: true, data: d }));
  h.assess.mockResolvedValue({ ok: true, data: [
    { userId: 'u2', seesAll: true, visibleCount: 27, totalCount: 27 },
    { userId: 'u3', seesAll: false, visibleCount: 10, totalCount: 27 },
  ] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function pick() {
  render(<ReportSchedulesPanel saved={saved} timeZone="UTC" />);
  await screen.findByText(/caseReport.schedule.none/);
  fireEvent.change(screen.getByRole('combobox', { name: /caseReport.schedule.report/ }), { target: { value: 'r1' } });
  fireEvent.click(await screen.findByLabelText('Sam Ray'));
  fireEvent.click(await screen.findByLabelText('Kim Ono'));
}

describe('recipient access choice on a schedule (Batch 613)', () => {
  it('flags only the recipient who cannot see everything, inline, with narrow pre-selected', async () => {
    await pick();
    expect(await screen.findByTestId('recipient-access-u3')).toBeTruthy();
    expect(screen.queryByTestId('recipient-access-u2')).toBeNull();
    const narrow = screen.getByLabelText('caseReport.schedule.accessNarrow') as HTMLInputElement;
    expect(narrow.checked).toBe(true);
    expect(screen.getByTestId('recipient-access-u3').textContent).toContain('"visible":10');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('saves the person\'s choice to skip with the schedule', async () => {
    await pick();
    fireEvent.click(await screen.findByLabelText('caseReport.schedule.accessSkip'));
    fireEvent.click(screen.getByRole('button', { name: /caseReport.schedule.create/ }));
    await waitFor(() => expect(h.create).toHaveBeenCalled());
    expect(h.create.mock.calls[0][0]).toMatchObject({ recipientUserIds: ['u2', 'u3'], recipientChoices: { u3: 'skip' } });
  });

  it('shows nothing extra when everyone can see the whole report', async () => {
    h.assess.mockResolvedValue({ ok: true, data: [{ userId: 'u2', seesAll: true, visibleCount: 27, totalCount: 27 }] });
    await pick();
    await waitFor(() => expect(h.assess).toHaveBeenCalled());
    expect(screen.queryByTestId('recipient-access')).toBeNull();
  });

  it('says on a schedule how many recipients the last run narrowed or skipped', async () => {
    h.list.mockResolvedValue({ ok: true, data: [{
      id: 's1', savedReportName: 'Grade 3 by month', frequency: 'weekly', dayOfWeek: 1, dayOfMonth: 1, timeOfDay: '07:00', lookbackDays: 7,
      recipientUserIds: ['u2', 'u3'], active: true, nextRunAt: null,
      lastRun: { ranAt: '2026-09-28T11:00:00Z', status: 'simulated', simulated: true, groupCount: 1, rowCount: 0, total: 27, recipientCount: 1, message: '',
        recipients: [{ userId: 'u2', outcome: 'full', caseCount: 27 }, { userId: 'u3', outcome: 'skipped', caseCount: 0 }] },
    }] });
    render(<ReportSchedulesPanel saved={saved} timeZone="UTC" />);
    const line = await screen.findByTestId('lastrun-access-s1');
    expect(line.textContent).toContain('"narrowed":0');
    expect(line.textContent).toContain('"skipped":1');
  });
});
