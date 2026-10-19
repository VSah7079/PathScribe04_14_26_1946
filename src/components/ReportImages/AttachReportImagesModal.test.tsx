// @vitest-environment happy-dom
// Batch 609 (PS-44): the Attach images screen.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@/i18n/config';
import type { CaseReportImage } from '@/services';

const attach = vi.fn();
const remove = vi.fn();
const clearProblem = vi.fn();
let state: { images: CaseReportImage[]; busy: boolean; problem: string | null };

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Dr A' } }) }));
vi.mock('@/hooks/useCaseReportImages', () => ({
  useCaseReportImages: () => ({ ...state, attach, remove, clearProblem }),
}));

import { AttachReportImagesModal } from './AttachReportImagesModal';

const image = (over: Partial<CaseReportImage> = {}): CaseReportImage => ({
  id: 'i1', caseId: 'C1', accession: 'S26-0001', imageType: 'Gross Specimen', caption: 'Left breast',
  imageUrl: 'https://imaging.hospital.org/gross/1.png', sourceSystemId: 'imaging.hospital.org', attachedBy: 'Dr A', attachedAt: '2026-10-18T08:00:00Z',
  ...over,
});

const open = (onClose = vi.fn()) => render(<AttachReportImagesModal caseId="C1" accession="S26-0001" facilityId="F1" onClose={onClose} />);

describe('AttachReportImagesModal', () => {
  beforeEach(() => { state = { images: [], busy: false, problem: null }; attach.mockReset(); attach.mockResolvedValue(true); remove.mockReset(); clearProblem.mockReset(); });
  afterEach(cleanup);

  it('says PathScribe stores no images, and that none is linked yet', () => {
    open();
    expect(screen.getByRole('note').textContent).toMatch(/does not store images/i);
    expect(screen.getByText(/no images/i)).toBeTruthy();
  });

  it('has no file chooser: an image is linked, never read from the computer', () => {
    const { container } = open();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it('adds the link with the type and caption on Enter, then clears the link and caption', async () => {
    open();
    const link = screen.getByPlaceholderText(/https:\/\/imaging/i) as HTMLInputElement;
    fireEvent.change(link, { target: { value: 'https://imaging.hospital.org/a.png' } });
    fireEvent.change(screen.getByPlaceholderText(/printed under the image/i), { target: { value: 'Cut surface' } });
    fireEvent.submit(link.closest('form') as HTMLFormElement);
    await waitFor(() => expect(attach).toHaveBeenCalledWith('https://imaging.hospital.org/a.png', 'Gross Specimen', 'Cut surface'));
    await waitFor(() => expect(link.value).toBe(''));
    expect((screen.getByPlaceholderText(/printed under the image/i) as HTMLInputElement).value).toBe('');
  });

  it('keeps what was typed when the link is refused, and does nothing for an empty link', async () => {
    attach.mockResolvedValueOnce(false);
    open();
    const link = screen.getByPlaceholderText(/https:\/\/imaging/i) as HTMLInputElement;
    fireEvent.submit(link.closest('form') as HTMLFormElement);
    expect(attach).not.toHaveBeenCalled();
    fireEvent.change(link, { target: { value: 'http://nope' } });
    fireEvent.submit(link.closest('form') as HTMLFormElement);
    await waitFor(() => expect(attach).toHaveBeenCalledTimes(1));
    expect(link.value).toBe('http://nope');
  });

  it('lists each image with its type, caption and source, and removes one', () => {
    state.images = [image(), image({ id: 'i2', caption: '', imageType: 'Microphotograph' })];
    open();
    expect(screen.getAllByText(/imaging\.hospital\.org/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Left breast/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0]);
    expect(remove).toHaveBeenCalledWith('i1');
  });

  it('shows a problem as an alert and lets it be dismissed; the Add button waits while busy', () => {
    state = { images: [], busy: true, problem: 'invalidLink' };
    open();
    expect(screen.getByRole('alert').textContent).toMatch(/https/);
    expect((screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(clearProblem).toHaveBeenCalled();
  });

  it('closes', () => {
    const onClose = vi.fn();
    open(onClose);
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
