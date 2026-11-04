// @vitest-environment happy-dom
// Batch 611 (#132, #166): Import legacy file: choose a source system and a file, run, see counts; the file name is never shown.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({ importFile: vi.fn(), getAll: vi.fn() }));
vi.mock('@/services', async () => {
  const parse = await import('@/services/migration/parseLegacyFile');
  const run = await import('@/services/migration/runLegacyFileImport');
  return {
    importLegacyFile: h.importFile,
    migrationFieldMappingService: { getAll: h.getAll },
    parseLegacyFile: parse.parseLegacyFile, legacyFormatOf: parse.legacyFormatOf, LEGACY_IMPORT_MAX_RECORDS: parse.LEGACY_IMPORT_MAX_RECORDS,
    sourceSystemsWithMappings: run.sourceSystemsWithMappings,
  };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Admin One' } }) }));

import { LegacyImportModal } from './LegacyImportModal';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const mapping = (s: string, active = true) => ({ id: s + active, sourceSystemName: s, sourceFieldName: 'a', targetField: 'patientFirstName', category: 'demographics', active });
const file = (name: string, text: string) => new File([text], name, { type: 'text/plain' });
const job = { id: 'migjob-1', sourceSystemName: 'LegacyLIS', status: 'completed', totalRecordsProcessed: 2, succeededCount: 2, failedCount: 0, needsReviewCount: 0, createdByUserId: 'u1', createdByUserName: 'Admin One', createdAt: '2026-10-18T00:00:00Z' };

async function open(props: Partial<React.ComponentProps<typeof LegacyImportModal>> = {}) {
  h.getAll.mockResolvedValue({ ok: true, data: [mapping('LegacyLIS'), mapping('OtherLIS', false)] });
  const onClose = vi.fn(); const onFinished = vi.fn(); const onOpenJob = vi.fn();
  const view = render(<LegacyImportModal onClose={onClose} onFinished={onFinished} onOpenJob={onOpenJob} {...props} />);
  await waitFor(() => expect(screen.getByText('LegacyLIS')).toBeTruthy());
  return { view, onClose, onFinished, onOpenJob };
}

const upload = async (f: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [f] } });
};

describe('LegacyImportModal', () => {
  it('offers only source systems that have active mappings and says the import is simulated', async () => {
    await open();
    expect(screen.queryByText('OtherLIS')).toBeNull();
    expect(screen.getByRole('note').textContent).toBe('migrationImport.simulatedBanner');
  });

  it('says so when no source system has mappings', async () => {
    h.getAll.mockResolvedValue({ ok: true, data: [] });
    render(<LegacyImportModal onClose={vi.fn()} onFinished={vi.fn()} onOpenJob={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('migrationImport.noMappings')).toBeTruthy());
  });

  it('preselects the only source system, keeps Run off until a readable file is chosen, and never shows the file name', async () => {
    await open();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('LegacyLIS');
    const run = screen.getByText('migrationImport.run') as HTMLButtonElement;
    expect(run.disabled).toBe(true);
    await upload(file('Jane-Roe-export.csv', 'pt_fname,pt_lname\nJane,Roe\nBen,Lee\n'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('"count":2'));
    expect(document.body.textContent).not.toContain('Jane-Roe-export');
    expect(run.disabled).toBe(false);
  });

  it('with several source systems none is preselected, and Run stays off until one is chosen', async () => {
    h.getAll.mockResolvedValue({ ok: true, data: [mapping('LegacyLIS'), mapping('SecondLIS')] });
    render(<LegacyImportModal onClose={vi.fn()} onFinished={vi.fn()} onOpenJob={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('SecondLIS')).toBeTruthy());
    await upload(file('x.csv', 'a\n1\n'));
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    const run = screen.getByText('migrationImport.run') as HTMLButtonElement;
    expect(run.disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'SecondLIS' } });
    expect(run.disabled).toBe(false);
  });

  it('refuses a file type it cannot read and shows a file error', async () => {
    await open();
    await upload(file('scan.pdf', 'x'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('migrationImport.pick.unsupported'));
    await upload(file('empty.csv', ''));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('migrationImport.error.empty'));
  });

  it('runs the import with the chosen options and shows the counts, draft cases and View job', async () => {
    h.importFile.mockResolvedValue({ ok: true, summary: { job, results: [], draftCasesCreated: 2, alreadyImported: 1, unmappedFields: ['extra'], skippedNested: 0 } });
    const { onFinished, onOpenJob } = await open();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'LegacyLIS' } });
    await upload(file('x.json', JSON.stringify([{ a: '1' }, { a: '2' }])));
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    fireEvent.change(document.querySelector('input[type="number"]') as HTMLInputElement, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('migrationImport.run'));
    await waitFor(() => expect(h.importFile).toHaveBeenCalled());
    expect(h.importFile.mock.calls[0][0]).toMatchObject({ sourceSystemName: 'LegacyLIS', format: 'json', claimedSourceRecordCount: 2, createDraftCases: false, createdByUserId: 'u1', createdByUserName: 'Admin One' });
    await waitFor(() => expect(screen.getByText(/migrationImport.result.cases/)).toBeTruthy());
    expect(screen.getByText(/migrationImport.result.already/)).toBeTruthy();
    expect(screen.getByText(/migrationImport.result.unmapped/).textContent).toContain('extra');
    expect(onFinished).toHaveBeenCalled();
    fireEvent.click(screen.getByText('migrationImport.viewJob'));
    expect(onOpenJob).toHaveBeenCalledWith(job);
  });

  it('shows why a run was refused', async () => {
    h.importFile.mockResolvedValue({ ok: false, error: 'notPermitted' });
    await open();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'LegacyLIS' } });
    await upload(file('x.csv', 'a\n1\n'));
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    fireEvent.click(screen.getByText('migrationImport.run'));
    await waitFor(() => expect(screen.getByText('migrationImport.error.notPermitted' + ':{"max":2000}')).toBeTruthy());
  });
});
