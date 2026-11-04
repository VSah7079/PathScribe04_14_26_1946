// @vitest-environment happy-dom
//
// Batch 451 (PS-48): the CPT Modifier Dictionary screen downloads its upload
// template as CSV through utils/csv, and uploading that file back goes
// through the same utility into a version submitted for approval. Only the
// browser download itself is stubbed; toCsv, parseCsv and isCsvFile are the
// real ones. The parsing rules are tested in
// services/billing/dictionaryCsvRoundTrip.test.ts.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key), i18n: { language: 'en' } }),
}));

const h = vi.hoisted(() => ({
  downloadCsv: vi.fn(),
  modifierDictionaryService: {
    getAllVersions: vi.fn(async () => ({ ok: true, data: [] })),
    createVersion: vi.fn(async (input: { label: string }) => ({ ok: true, data: { id: 'v2', ...input } })),
  },
}));

vi.mock('@/utils/csv', async () => {
  const real = await vi.importActual<typeof import('@/utils/csv')>('@/utils/csv');
  return { ...real, downloadCsv: h.downloadCsv, readFileAsText: (f: File) => f.text() };
});
vi.mock('@/services', () => ({ modifierDictionaryService: h.modifierDictionaryService }));
vi.mock('@/services/auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: 'admin-1' }) }));

import ModifierDictionarySection from './ModifierDictionarySection';
import { parseCsv } from '@/utils/csv';
import { DEFAULT_CPT_MODIFIERS } from '@/services/billing/cptModifierDictionary';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const upload = (file: File) => fireEvent.change(fileInput(), { target: { files: [file] } });

describe('ModifierDictionarySection CSV template and upload (PS-48)', () => {
  it('the template downloads as CSV with the Code/Description columns and the example modifiers', async () => {
    render(<ModifierDictionarySection />);
    fireEvent.click(await screen.findByText('modifierDictionarySection.downloadTemplate'));
    expect(h.downloadCsv).toHaveBeenCalledTimes(1);
    const [filename, csv] = h.downloadCsv.mock.calls[0] as [string, string];
    expect(filename).toBe('ModifierDictionaryTemplate.csv');
    expect(parseCsv(csv)).toEqual(DEFAULT_CPT_MODIFIERS.slice(0, 2).map(m => ({ Code: m.code, Description: m.description })));
  });

  it('uploading the downloaded template previews its rows and submits them as a new version', async () => {
    render(<ModifierDictionarySection />);
    fireEvent.click(await screen.findByText('modifierDictionarySection.downloadTemplate'));
    const [, csv] = h.downloadCsv.mock.calls[0] as [string, string];

    upload(new File([csv], 'ModifierDictionaryTemplate.csv', { type: 'text/csv' }));
    const codeCell = await screen.findByText(DEFAULT_CPT_MODIFIERS[0].code);
    const preview = codeCell.closest('tbody')!;
    expect(Array.from(preview.querySelectorAll('tr')).map(r => r.textContent)).toEqual(
      DEFAULT_CPT_MODIFIERS.slice(0, 2).map(m => `${m.code}${m.description}`),
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('modifierDictionarySection.submit'));
    await waitFor(() => expect(h.modifierDictionaryService.createVersion).toHaveBeenCalledTimes(1));
    expect(h.modifierDictionaryService.createVersion).toHaveBeenCalledWith(expect.objectContaining({
      entries: DEFAULT_CPT_MODIFIERS.slice(0, 2), sourceFileName: 'ModifierDictionaryTemplate.csv', licenseStatus: 'licensed', uploadedBy: 'admin-1',
    }));
  });

  it('a file that is not .csv is refused before it is read', async () => {
    render(<ModifierDictionarySection />);
    await screen.findByText('modifierDictionarySection.downloadTemplate');
    const xlsx = new File(['Code,Description\n26,x'], 'modifiers.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const read = vi.spyOn(xlsx, 'text');
    upload(xlsx);
    await new Promise(r => setTimeout(r, 0));
    expect(read).not.toHaveBeenCalled();
    // No preview opens, and (Batch 452) the refusal is shown.
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(within(document.body).queryByText('modifierDictionarySection.submit')).toBeNull();
    expect(screen.getByRole('alert').textContent).toBe('modifierDictionarySection.upload.invalidFileType {"fileName":"modifiers.xlsx"}');
  });

  it('Batch 452: an empty CSV is reported, not silently ignored', async () => {
    render(<ModifierDictionarySection />);
    await screen.findByText('modifierDictionarySection.downloadTemplate');
    upload(new File([''], 'empty.csv', { type: 'text/csv' }));
    expect((await screen.findByRole('alert')).textContent).toBe('modifierDictionarySection.upload.noRowsFound');
  });

  it('Batch 452: a file that cannot be read is reported', async () => {
    render(<ModifierDictionarySection />);
    await screen.findByText('modifierDictionarySection.downloadTemplate');
    const bad = new File(['x'], 'bad.csv', { type: 'text/csv' });
    vi.spyOn(bad, 'text').mockRejectedValue(new Error('disk'));
    upload(bad);
    expect((await screen.findByRole('alert')).textContent).toBe('modifierDictionarySection.upload.readError');
  });

  it('Batch 452: a refused or failing save is shown in the preview, and the screen can be used again', async () => {
    const csv = 'Code,Description\n26,Professional component';
    h.modifierDictionaryService.createVersion.mockResolvedValueOnce({ ok: false, error: 'CONFIG_NOT_PERMITTED' } as never);
    h.modifierDictionaryService.createVersion.mockRejectedValueOnce(new Error('network down'));
    render(<ModifierDictionarySection />);
    await screen.findByText('modifierDictionarySection.downloadTemplate');
    upload(new File([csv], 'm.csv', { type: 'text/csv' }));
    fireEvent.click(await screen.findByRole('checkbox'));
    const submit = await screen.findByText('modifierDictionarySection.submit');
    fireEvent.click(submit);
    expect(await screen.findByText('modifierDictionarySection.upload.saveFailed {"reason":"CONFIG_NOT_PERMITTED"}')).toBeTruthy();
    fireEvent.click(submit);
    expect(await screen.findByText('modifierDictionarySection.upload.saveFailed {"reason":"network down"}')).toBeTruthy();
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });
});
