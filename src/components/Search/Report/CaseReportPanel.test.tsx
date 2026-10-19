// @vitest-environment happy-dom
// Batch 613: the Search page's report view and its synoptic answer filters.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key) }),
}));
vi.mock('i18next', () => ({ default: { language: 'en-US' } }));

const h = vi.hoisted(() => ({
  report: vi.fn(), exportReport: vi.fn(), protocols: vi.fn(), runExport: vi.fn(),
  savedList: vi.fn(), savedSave: vi.fn(), schedules: vi.fn(), runDue: vi.fn(), create: vi.fn(), has: true, download: vi.fn(),
}));
vi.mock('@/services', async () => ({
  ...(await import('@/services/authorization/capabilityCatalog')),
  caseSearchService: { report: h.report, exportReport: h.exportReport, listSynopticProtocols: h.protocols },
  savedCaseReportService: { list: h.savedList, save: h.savedSave, recordUse: vi.fn(), delete: vi.fn() },
  scheduledReportService: { list: h.schedules, runDue: h.runDue, create: h.create, runNow: vi.fn(), setActive: vi.fn(), remove: vi.fn(), assessRecipients: async () => ({ ok: true, data: [] }) },
  userService: { getAll: async () => ({ ok: true, data: [{ id: 'u2', firstName: 'Sam', lastName: 'Ray', status: 'Active' }] }) },
}));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ loading: false, has: () => h.has, decide: () => ({ allowed: h.has, reason: 'notGranted' }) }),
}));
vi.mock('@/services/exports/runExport', () => ({ runExport: (...a: unknown[]) => h.runExport(...a) }));
vi.mock('@/utils/csv', () => ({ downloadCsv: (...a: unknown[]) => h.download(...a), csvQuoted: (v: unknown) => `"${String(v)}"` }));

import { CaseReportPanel } from './CaseReportPanel';
import { SynopticValueFilters } from './SynopticValueFilters';
import { emptyCaseSearchDraft } from '@/services/caseSearch/caseSearchTypes';

const protocols = [{ templateId: 'breast', name: 'Breast', fields: [
  { id: 'grade', label: 'Grade', kind: 'choice', options: [{ id: 'g3', label: 'Grade 3' }] },
  { id: 'size', label: 'Tumor size', kind: 'number', options: [], unit: 'cm' },
] }];
const grouped = {
  total: 3, groupBy: 'pathologist', rows: [], rowsTruncated: false, groupsTruncated: false,
  groups: [{ key: 'u1', count: 2, share: 2 / 3, medianTatDays: 2.5 }, { key: 'u2', count: 1, share: 1 / 3, medianTatDays: null }],
};
const props = {
  searchedDraft: emptyCaseSearchDraft('2026-09-01', '2026-09-27'), timeZone: 'UTC',
  pathologists: [{ id: 'u1', name: 'Dr Lee' }, { id: 'u2', name: 'Dr Ray' }], facilities: [], subspecialties: [], onLoadSearch: vi.fn(),
};

beforeEach(() => {
  h.has = true;
  h.report.mockResolvedValue({ ok: true, data: grouped });
  h.protocols.mockResolvedValue({ ok: true, data: protocols });
  h.savedList.mockResolvedValue({ ok: true, data: [] });
  h.schedules.mockResolvedValue({ ok: true, data: [] });
  h.runDue.mockResolvedValue({ ok: true, data: [] });
  h.runExport.mockImplementation(async (_k: string, _f: string, _p: unknown, build: () => Promise<void>) => { await build(); });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('report view (Batch 613)', () => {
  it('shows counts by group with shares, medians and a total, and sorts when a heading is clicked', async () => {
    render(<CaseReportPanel {...props} />);
    const table = await screen.findByTestId('report-groups');
    expect(table.textContent).toContain('Dr Lee');
    expect(table.textContent).toContain('66.7%');
    expect(table.textContent).toContain('2.5');
    expect(table.textContent).toContain('caseReport.table.total');
    const names = () => [...table.querySelectorAll('tbody tr')].map(r => r.querySelector('[data-phi]')?.textContent);
    expect(names()).toEqual(['Dr Lee', 'Dr Ray']);
    fireEvent.click(screen.getByText(/caseReport.table.cases/)); // count: was descending, now ascending
    expect(names()).toEqual(['Dr Ray', 'Dr Lee']);
  });

  it('shows the cases of a group when it is opened', async () => {
    h.report.mockImplementation(async (r: { groupKey?: string }) => ({
      ok: true, data: r.groupKey ? { ...grouped, rows: [{ caseId: 'C1', cells: { accession: 'S26-1' } }] } : grouped,
    }));
    render(<CaseReportPanel {...props} />);
    await screen.findByTestId('report-groups');
    fireEvent.click(screen.getAllByTitle('caseReport.showCases')[0]);
    expect((await screen.findByTestId('report-cases')).textContent).toContain('S26-1');
    expect(h.report).toHaveBeenLastCalledWith(expect.objectContaining({ groupKey: 'u1' }));
  });

  it('asks the service for the grouping chosen, and for a list when there is no grouping', async () => {
    render(<CaseReportPanel {...props} />);
    await screen.findByTestId('report-groups');
    h.report.mockResolvedValue({ ok: true, data: { total: 1, groupBy: 'none', groups: [], rowsTruncated: false, groupsTruncated: false, rows: [{ caseId: 'C1', cells: { accession: 'S26-1' } }] } });
    fireEvent.change(screen.getByLabelText('caseReport.groupByLabel', { exact: false }) as HTMLSelectElement, { target: { value: 'none' } });
    expect((await screen.findByTestId('report-cases')).textContent).toContain('S26-1');
    expect(h.report).toHaveBeenLastCalledWith(expect.objectContaining({ groupBy: 'none' }));
  });

  it('shows loading text while the report builds, and a failure message when it fails', async () => {
    let resolve: (v: unknown) => void = () => {};
    h.report.mockReturnValue(new Promise(r => { resolve = r; }));
    render(<CaseReportPanel {...props} />);
    expect(await screen.findByText('caseReport.loading', {}, { timeout: 4000 })).toBeTruthy();
    resolve({ ok: false, error: 'x' });
    expect((await screen.findByRole('alert')).textContent).toBe('caseReport.failed');
  });

  it('says to search first when nothing has been searched', () => {
    render(<CaseReportPanel {...props} searchedDraft={null} />);
    expect(screen.getByText('caseReport.noSearchYet')).toBeTruthy();
    expect(h.report).not.toHaveBeenCalled();
  });

  it('exports through the export service with the report\'s own kind, and downloads the file', async () => {
    h.exportReport.mockResolvedValue({ ok: true, data: grouped });
    render(<CaseReportPanel {...props} />);
    await screen.findByTestId('report-groups');
    fireEvent.click(screen.getByText('caseReport.export.button'));
    await waitFor(() => expect(h.download).toHaveBeenCalled());
    expect(h.runExport.mock.calls[0][0]).toBe('search.case-report');
    expect(h.download.mock.calls[0][0]).toMatch(/^pathscribe-case-report-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('tells the user when the export is refused, and downloads nothing', async () => {
    h.exportReport.mockResolvedValue({ ok: false, error: 'EXPORT_NOT_PERMITTED' });
    render(<CaseReportPanel {...props} />);
    await screen.findByTestId('report-groups');
    fireEvent.click(screen.getByText('caseReport.export.button'));
    expect(await screen.findByText('caseReport.export.notPermitted')).toBeTruthy();
    expect(h.download).not.toHaveBeenCalled();
  });

  it('greys out the export for someone without the capability, and the click does nothing', async () => {
    h.has = false;
    render(<CaseReportPanel {...props} />);
    await screen.findByTestId('report-groups');
    const btn = screen.getByText('caseReport.export.button');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(btn);
    expect(h.exportReport).not.toHaveBeenCalled();
  });

  it('saves the report with its search, grouping and columns, and loads a saved one back', async () => {
    h.savedSave.mockResolvedValue({ ok: true, data: { id: 's1' } });
    render(<CaseReportPanel {...props} />);
    await screen.findByTestId('report-groups');
    fireEvent.change(screen.getByLabelText('caseReport.saveNamePlaceholder'), { target: { value: 'By pathologist' } });
    fireEvent.click(screen.getByText('caseReport.save'));
    await waitFor(() => expect(h.savedSave).toHaveBeenCalled());
    expect(h.savedSave.mock.calls[0][0]).toBe('By pathologist');
    expect(h.savedSave.mock.calls[0][1]).toMatchObject({ kind: 'caseReport', groupBy: 'pathologist', draft: props.searchedDraft });
  });

  it('loading a saved report runs its search on the page', async () => {
    const def = { kind: 'caseReport', draft: emptyCaseSearchDraft('2026-01-01', '2026-01-31'), groupBy: 'month', columns: ['accession'] };
    h.savedList.mockResolvedValue({ ok: true, data: [{ id: 's1', name: 'Jan', definition: def, createdAt: '', useCount: 0 }] });
    render(<CaseReportPanel {...props} />);
    await screen.findByTestId('report-groups');
    await screen.findByText('Jan');
    fireEvent.change(screen.getByLabelText('caseReport.savedLabel', { exact: false }) as HTMLSelectElement, { target: { value: 's1' } });
    expect(props.onLoadSearch).toHaveBeenCalledWith(def.draft);
  });

  it('shows the schedules with the last run labelled Simulated, and creates a schedule', async () => {
    h.savedList.mockResolvedValue({ ok: true, data: [{ id: 'r1', name: 'Weekly', definition: {}, createdAt: '', useCount: 0 }] });
    h.schedules.mockResolvedValue({ ok: true, data: [{
      id: 's1', savedReportName: 'Weekly', frequency: 'weekly', dayOfWeek: 1, dayOfMonth: 1, timeOfDay: '07:00', timeZone: 'UTC', lookbackDays: 7,
      recipientUserIds: ['u2'], active: true, nextRunAt: '2026-10-05T07:00:00Z', ownerId: 'u1', ownerName: 'x', savedReportId: 'r1', createdAt: '',
      lastRun: { ranAt: '2026-09-28T07:00:00Z', status: 'simulated', simulated: true, groupCount: 4, rowCount: 0, total: 27, recipientCount: 1, message: '' },
    }] });
    h.create.mockResolvedValue({ ok: true, data: {} });
    render(<CaseReportPanel {...props} />);
    await screen.findByTestId('report-groups');
    fireEvent.click(screen.getByText('caseReport.schedulesButton'));
    const last = await screen.findByTestId('lastrun-s1');
    expect(last.textContent).toContain('caseReport.schedule.simulated');
    expect(last.textContent).toContain('"total":27');
    expect(h.runDue).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('caseReport.schedule.report'), { target: { value: 'r1' } });
    fireEvent.click(await screen.findByLabelText('Sam Ray'));
    fireEvent.click(screen.getByText(/caseReport.schedule.create/));
    await waitFor(() => expect(h.create).toHaveBeenCalled());
    expect(h.create.mock.calls[0][0]).toMatchObject({ savedReportId: 'r1', recipientUserIds: ['u2'], frequency: 'weekly', lookbackDays: 7 });
  });
});

describe('synoptic answer filters (Batch 613)', () => {
  it('offers the protocol\'s own questions and choices, and only the conditions that fit the question', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<SynopticValueFilters criteria={[]} onChange={onChange} />);
    await waitFor(() => expect((screen.getByText('searchPage.synopticValues.add') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByText('searchPage.synopticValues.add'));
    expect(onChange).toHaveBeenCalledWith([{ templateId: 'breast', fieldId: 'grade', operator: 'is', value: '' }]);
    rerender(<SynopticValueFilters criteria={[{ templateId: 'breast', fieldId: 'grade', operator: 'is', value: '' }]} onChange={onChange} />);
    const ops = screen.getByLabelText('searchPage.synopticValues.operatorLabel') as HTMLSelectElement;
    expect([...ops.options].map(o => o.value)).toEqual(['is', 'isNot', 'answered', 'unanswered']);
    expect([...(screen.getByLabelText('searchPage.synopticValues.value') as HTMLSelectElement).options].map(o => o.value)).toEqual(['', 'g3']);
    // A number question offers comparisons and a free value with its unit.
    fireEvent.change(screen.getByLabelText('searchPage.synopticValues.question'), { target: { value: 'size' } });
    expect(onChange).toHaveBeenLastCalledWith([{ templateId: 'breast', fieldId: 'size', operator: 'is', value: '' }]);
  });

  it('hides the value for "answered" and removes a row', async () => {
    const onChange = vi.fn();
    render(<SynopticValueFilters criteria={[{ templateId: 'breast', fieldId: 'size', operator: 'answered', value: '' }]} onChange={onChange} />);
    await screen.findByLabelText('searchPage.synopticValues.operatorLabel');
    expect(screen.queryByLabelText('searchPage.synopticValues.value')).toBeNull();
    fireEvent.click(screen.getByLabelText('searchPage.synopticValues.remove'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
