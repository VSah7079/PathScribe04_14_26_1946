// @vitest-environment happy-dom
// Batch 588: the Delete this block control: a reason is chosen, "Other" needs a note, a deleted block shows its record.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, string>) => (o ? `${key}|${Object.values(o).join('|')}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => true, decide: () => ({ allowed: true }) }) }));

import { DeleteBlockControl } from './DeleteBlockControl';
import type { HistologyBlock } from '@/types/case/Specimen';

const block = (over: Partial<HistologyBlock> = {}): HistologyBlock => ({ id: 'B1', label: '1', status: 'Grossed', stains: [], ...over } as HistologyBlock);
afterEach(cleanup);

describe('DeleteBlockControl', () => {
  it('opens a reason form, enables Delete once a reason is chosen, and sends the code and note', () => {
    const onDelete = vi.fn();
    render(<DeleteBlockControl block={block()} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('blockDeletion.control.deleteButton'));
    const confirm = screen.getByText('blockDeletion.control.confirmButton') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false); // the first reason is pre-selected
    fireEvent.change(screen.getByLabelText('blockDeletion.control.noteLabel'), { target: { value: 'two cassettes made' } });
    fireEvent.click(confirm);
    expect(onDelete).toHaveBeenCalledWith('enteredInError', 'two cassettes made');
  });
  it('"Other" needs a note before Delete is enabled', () => {
    render(<DeleteBlockControl block={block()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText('blockDeletion.control.deleteButton'));
    fireEvent.change(screen.getByLabelText('blockDeletion.control.reasonFieldLabel'), { target: { value: 'other' } });
    const confirm = screen.getByText('blockDeletion.control.confirmButton') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('blockDeletion.control.noteLabel'), { target: { value: 'because' } });
    expect(confirm.disabled).toBe(false);
  });
  it('Never mind closes the form without deleting', () => {
    const onDelete = vi.fn();
    render(<DeleteBlockControl block={block()} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('blockDeletion.control.deleteButton'));
    fireEvent.click(screen.getByText('blockStainEditorModal.nevermindButton'));
    expect(screen.getByText('blockDeletion.control.deleteButton')).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });
  it('a deleted block shows its record, not a button', () => {
    render(<DeleteBlockControl block={block({ status: 'Deleted', deletion: { reasonCode: 'duplicate', deletedBy: 'u1', deletedByName: 'Tech One', deletedAt: '2026-10-16T15:00:00Z', tier: 'in_process', releasedCodes: ['88305'] } })} onDelete={vi.fn()} />);
    expect(screen.getByText('blockDeletion.control.deletedTitle')).toBeTruthy();
    expect(screen.getByText(/blockDeletion.control.releasedLine\|88305/)).toBeTruthy();
    expect(screen.queryByText('blockDeletion.control.deleteButton')).toBeNull();
  });
  it('a cancelled block offers no delete', () => {
    render(<DeleteBlockControl block={block({ status: 'Cancelled' })} onDelete={vi.fn()} />);
    expect(screen.queryByText('blockDeletion.control.deleteButton')).toBeNull();
  });
  it('after sign-out it says Delete this block (signed out) and sends the same reason', () => {
    const onDelete = vi.fn();
    render(<DeleteBlockControl block={block({ status: 'Embedded' })} tier="signed_out" onDelete={onDelete} />);
    expect(screen.queryByText('blockDeletion.control.deleteButton')).toBeNull();
    fireEvent.click(screen.getByText('blockDeletion.control.invalidateButton'));
    fireEvent.click(screen.getByText('blockDeletion.control.invalidateConfirmButton'));
    expect(onDelete).toHaveBeenCalledWith('enteredInError', '');
  });
  it('an invalidated block shows its record, not a button', () => {
    render(<DeleteBlockControl block={block({ status: 'Invalidated', deletion: { reasonCode: 'enteredInError', deletedBy: 'u1', deletedByName: 'Lab Director', deletedAt: '2026-10-18T09:00:00Z', tier: 'signed_out', releasedCodes: [] } })} tier="signed_out" onDelete={vi.fn()} />);
    expect(screen.getByText('blockDeletion.control.invalidatedTitle')).toBeTruthy();
    expect(screen.queryByText('blockDeletion.control.invalidateButton')).toBeNull();
  });
});
