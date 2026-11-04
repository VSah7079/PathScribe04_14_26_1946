// @vitest-environment happy-dom
// Batch 742 (Pete, Case Image & File Attachments, Release 1): the Attachments window lists the four groups, ticks
// rows, inserts into the chosen section, sends a picked file, and warns before a large one.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { AttachmentRow } from '@/services';

const h = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  insert: vi.fn(async () => true), pickFile: vi.fn(), addLink: vi.fn(async () => true), unlink: vi.fn(), takeOut: vi.fn(), open: vi.fn(),
  confirmLargeFile: vi.fn(), cancelLargeFile: vi.fn(), clearProblem: vi.fn(),
}));
vi.mock('@/hooks/useCaseAttachments', () => ({ useCaseAttachments: () => ({ ...h, ...h.state }) }));
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Dr Sarah Johnson' } }) }));
vi.mock('@/utils/uiPreferences', () => ({ getUiPreference: (_k: string, f: unknown) => f, setUiPreference: vi.fn() }));

import { CaseAttachmentsModal } from './CaseAttachmentsModal';
afterEach(() => { cleanup(); vi.clearAllMocks(); h.state = {}; });

const row = (over: Partial<AttachmentRow>): AttachmentRow => ({
  key: 'asset:g1', group: 'gross', kind: 'grossPhoto', origin: { kind: 'caseAsset', assetId: 'g1' }, ownerLabel: 'A', sourceSystemId: 'imaging.hospital.org',
  mimeType: 'image/jpeg', imageUrl: 'https://imaging.hospital.org/g1.jpg', at: '2026-10-30T09:00:00Z', by: 'Connor Whitlock', imageType: 'Gross Specimen', ...over,
});
const ROWS = [row({}), row({ key: 'att:1', group: 'external', kind: 'uploadedFile', origin: { kind: 'attachment', attachmentId: '1' }, attachmentId: '1', fileName: 'Brennick consult.pdf', mimeType: 'application/pdf', imageUrl: '', ownerLabel: undefined })];
const LAYOUT = [{ id: 'gross', label: 'Gross Description' }, { id: 'dx', label: 'Diagnosis' }];

function open(over: Record<string, unknown> = {}, props: Partial<React.ComponentProps<typeof CaseAttachmentsModal>> = {}) {
  h.state = { rows: ROWS, placements: [], reportState: { signed: false, amendmentOpen: false }, busy: false, problem: null, notice: null, pendingLargeFile: null, ...over };
  return render(<CaseAttachmentsModal caseData={null} caseId="C1" accession="S26-4680" facilityId="F1" layoutSections={LAYOUT} inlineSupported activeSectionId="dx" onClose={vi.fn()} {...props} />);
}

describe('CaseAttachmentsModal', () => {
  it('shows the four groups with counts, the file name tagged as patient data, and the slide-viewer note', () => {
    open();
    for (const g of ['gross', 'intraop', 'slide', 'external']) expect(screen.getByLabelText(`caseAttachments.groups.${g}`)).toBeTruthy();
    expect(screen.getByText('caseAttachments.empty.slide')).toBeTruthy();
    expect(screen.getByText('Brennick consult.pdf').getAttribute('data-phi')).toBe('true');
    expect(screen.getByText('S26-4680', { exact: false }).getAttribute('data-phi')).toBe('accession');
  });

  it('inserts the ticked rows into the section being worked in, with the caption typed', () => {
    open();
    fireEvent.click(screen.getByLabelText(/caseAttachments.select/, { selector: 'input[aria-label*="grossPhoto"]' }));
    fireEvent.change(screen.getByPlaceholderText('caseAttachments.captionPlaceholder'), { target: { value: 'Opened colon' } });
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('dx');
    fireEvent.click(screen.getByText('caseAttachments.insert:{"number":1}'));
    expect(h.insert).toHaveBeenCalledWith([ROWS[0]], { 'asset:g1': 'Opened colon' }, { id: 'dx', label: 'Diagnosis' });
  });

  it('offers no section for a report that prints images after its pages', () => {
    open({}, { inlineSupported: false });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('caseAttachments.afterReportPages')).toBeTruthy();
  });

  it('sends a picked file, accepts only PDF, JPG and PNG in the picker, and removes an attachment from the case', () => {
    open();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png');
    const f = new File(['%PDF'], 'a.pdf');
    fireEvent.change(input, { target: { files: [f] } });
    expect(h.pickFile).toHaveBeenCalledWith(f);
    fireEvent.click(screen.getByText('caseAttachments.removeFromCase'));
    expect(h.unlink).toHaveBeenCalledWith('1');
  });

  it('warns before a large file and sends it only on Attach anyway', () => {
    open({ pendingLargeFile: new File([new Uint8Array(10)], 'big.pdf') });
    expect(screen.getByRole('alert').textContent).toContain('caseAttachments.large');
    fireEvent.click(screen.getByText('caseAttachments.attachAnyway'));
    expect(h.confirmLargeFile).toHaveBeenCalled();
  });

  it('on an Assist case: references only, no tick boxes, sections or Insert, and says why', () => {
    open({ reportState: { signed: false, amendmentOpen: false, lisOwnsReport: true } });
    expect(screen.getByText('caseAttachments.assistNote')).toBeTruthy();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText(/caseAttachments.insert:/)).toBeNull();
    expect(screen.queryByLabelText('caseAttachments.inReportTitle')).toBeNull();
    expect(screen.getByText('caseAttachments.attachFile')).toBeTruthy();
    expect(screen.getByText('caseAttachments.removeFromCase')).toBeTruthy();
  });

  it('on a signed report without an amendment: says so and locks placing and taking out', () => {
    open({ reportState: { signed: true, amendmentOpen: false }, placements: [{ id: 'p1', caseId: 'C1', accession: 'S', imageType: 'Other', caption: '', imageUrl: '', sourceSystemId: '', attachedAt: '', attachedBy: '' }] });
    expect(screen.getByText('caseAttachments.signedNote')).toBeTruthy();
    expect((screen.getByText('caseAttachments.takeOut') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).disabled).toBe(true);
  });
});
