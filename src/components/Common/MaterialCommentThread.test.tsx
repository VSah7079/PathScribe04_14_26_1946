// @vitest-environment happy-dom
// Batch 611 (#10)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import MaterialCommentThread from './MaterialCommentThread';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
  Trans: ({ values }: { values: { author: string } }) => <span>{values.author}</span>,
}));

const c = { id: 'c1', authorId: 'u1', authorName: 'Dr. Reed', text: '<b>recut</b>', createdAt: '2026-10-18T10:00:00Z' };

afterEach(cleanup);

describe('MaterialCommentThread', () => {
  it('says so when there are no comments', () => {
    render(<MaterialCommentThread comments={undefined} onAdd={() => {}} idPrefix="m" />);
    expect(screen.getByText('materialComments.empty')).toBeTruthy();
  });
  it('shows comments as plain text, never markup', () => {
    render(<MaterialCommentThread comments={[c]} onAdd={() => {}} idPrefix="m" />);
    expect(screen.getByText('<b>recut</b>')).toBeTruthy();
    expect(screen.getByText('Dr. Reed')).toBeTruthy();
  });
  it('adds with the button or Enter, then clears; blank text is not sent', () => {
    const onAdd = vi.fn();
    render(<MaterialCommentThread comments={[]} onAdd={onAdd} idPrefix="m" />);
    const box = screen.getByPlaceholderText('materialComments.placeholder') as HTMLInputElement;
    const btn = screen.getByText('materialComments.add') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(box, { target: { value: 'one' } });
    fireEvent.click(btn);
    expect(onAdd).toHaveBeenLastCalledWith('one');
    expect(box.value).toBe('');
    fireEvent.change(box, { target: { value: 'two' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onAdd).toHaveBeenLastCalledWith('two');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onAdd).toHaveBeenCalledTimes(2);
  });
  it('shows no composer when adding is not allowed', () => {
    render(<MaterialCommentThread comments={[c]} onAdd={() => {}} idPrefix="m" canAdd={false} />);
    expect(screen.queryByPlaceholderText('materialComments.placeholder')).toBeNull();
  });
});
