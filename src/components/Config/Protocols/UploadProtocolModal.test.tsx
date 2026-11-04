// @vitest-environment happy-dom
// Batch 609 (#39): the Upload Protocol window reads the file, shows a clear format result labelled unverified
// against CAP/RCPath, and imports a PathScribe protocol file as a draft.
import '@/i18n/config';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const saveDraft = vi.fn(async (t: { id: string }) => ({ id: t.id, status: 'draft', updatedAt: 'now' }));
vi.mock('../../../services/templates/templateService', () => ({ saveDraft: (t: { id: string }) => saveDraft(t) }));

import { UploadProtocolModal } from './protocolShared';

const protocol = (name = 'Upload test protocol') => JSON.stringify({
  name, id: 'x', source: 'CAP', version: '1.0.0', category: 'BREAST',
  sections: [{ id: 's', title: 'Tumour', collapsed: false, fields: [{ id: 'f', label: 'Grade', type: 'dropdown', required: false, snomed: '', icd: '', options: [] }] }],
});
const choose = (name: string, body: string) => {
  const input = document.getElementById('ps-upload-input') as HTMLInputElement;
  const file = new File([body], name);
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
};
afterEach(() => { cleanup(); saveDraft.mockClear(); });

describe('UploadProtocolModal', () => {
  it('nothing can be imported until a file is chosen', () => {
    render(<UploadProtocolModal onClose={() => {}} />);
    expect((screen.getByRole('button', { name: /Import as draft/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a valid protocol file shows the format result with the unverified label, and imports as a draft with a new id', async () => {
    render(<UploadProtocolModal onClose={() => {}} />);
    choose('protocol.json', protocol());
    expect(await screen.findByText('Format checked: no problems found')).toBeTruthy();
    expect(screen.getByText(/Unverified against CAP or RCPath/)).toBeTruthy();
    expect(screen.getByText(/1 sections and 1 questions/)).toBeTruthy();
    const btn = screen.getByRole('button', { name: /Import as draft/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    const saved = saveDraft.mock.calls[0][0] as unknown as { id: string; source: string; name: string };
    expect(saved.id).toMatch(/^tmpl-upload-/);
    expect(saved).toMatchObject({ source: 'CAP', name: 'Upload test protocol' });
    expect(await screen.findByText(/was saved as a draft/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('a file with problems says where, and cannot be imported', async () => {
    render(<UploadProtocolModal onClose={() => {}} />);
    choose('bad.json', JSON.stringify({ name: 'Bad', sections: [{ id: 's', title: '', fields: [] }] }));
    expect(await screen.findByText('Format checked: problems found')).toBeTruthy();
    expect(screen.getByText('Section 1 has no title.')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Import as draft/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('an XML form is checked and reported as unverified, but cannot be imported yet', async () => {
    render(<UploadProtocolModal onClose={() => {}} />);
    choose('form.xml', '<SDCPackage><FormDesign><Section><Question/></Section></FormDesign></SDCPackage>');
    expect(await screen.findByText('Format checked: no problems found')).toBeTruthy();
    expect(screen.getByText(/CAP eCC \(SDC\) form with 1 sections and 1 questions/)).toBeTruthy();
    expect(screen.getByText(/can be checked here but not imported yet/)).toBeTruthy();
    expect(screen.getByText(/Unverified against CAP or RCPath/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Import as draft/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('a name already in the library is not imported over', async () => {
    const { PROTOCOL_REGISTRY } = await import('./protocolShared');
    const existing = PROTOCOL_REGISTRY.find(p => p.status !== 'archived')!;
    render(<UploadProtocolModal onClose={() => {}} />);
    choose('dup.json', protocol(existing.name));
    await screen.findByText('Format checked: no problems found');
    fireEvent.click(screen.getByRole('button', { name: /Import as draft/ }));
    expect(await screen.findByText(/A protocol with this name already exists/)).toBeTruthy();
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('a refused save says why', async () => {
    saveDraft.mockRejectedValueOnce({ code: 'NOT_TEMPLATE_AUTHOR' });
    render(<UploadProtocolModal onClose={() => {}} />);
    choose('p.json', protocol('Another upload'));
    await screen.findByText('Format checked: no problems found');
    fireEvent.click(screen.getByRole('button', { name: /Import as draft/ }));
    expect(await screen.findByText(/Drafting protocols needs the Template Author role/)).toBeTruthy();
  });
});
