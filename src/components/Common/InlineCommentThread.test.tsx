// @vitest-environment happy-dom
// Batch 579 (PS-63 follow-up): the template reviewer's comment thread renders and calls the review service.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key) }),
}));
vi.mock('../../audit/auditLogger', () => ({ logEvent: vi.fn() }));

import { InlineCommentThread } from './InlineCommentThread';

beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);

describe('InlineCommentThread (Batch 579)', () => {
  it('the comment box is labelled with its question; Add is unavailable until something is typed', () => {
    render(<InlineCommentThread templateId="t1" questionId="q1" questionLabel="Tumour size" currentUser="Dr Lee" />);
    const box = screen.getByLabelText('inlineCommentThread.addCommentLabel {"question":"Tumour size"}');
    const add = screen.getByText('inlineCommentThread.addButton') as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(box, { target: { value: 'Add the unit' } });
    expect(add.disabled).toBe(false);
  });

  it('adds with the button or Enter, then resolves and reopens', () => {
    const log = vi.fn();
    let n = 0;
    render(<InlineCommentThread templateId="t1" questionId="q1" questionLabel="Tumour size" currentUser="Dr Lee" deps={{ log, newId: () => `c${++n}` }} />);
    const box = screen.getByLabelText(/inlineCommentThread.addCommentLabel/) as HTMLInputElement;
    fireEvent.change(box, { target: { value: 'First' } });
    fireEvent.click(screen.getByText('inlineCommentThread.addButton'));
    fireEvent.change(box, { target: { value: 'Second' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual([
      expect.stringContaining('First'), expect.stringContaining('Second'),
    ]);
    expect(box.value).toBe('');
    fireEvent.click(screen.getAllByText('inlineCommentThread.resolveButton')[0]);
    expect(screen.getByText('inlineCommentThread.resolvedBadge')).toBeTruthy();
    fireEvent.click(screen.getByText('inlineCommentThread.reopenButton'));
    expect(screen.queryByText('inlineCommentThread.resolvedBadge')).toBeNull();
    expect(log.mock.calls.map(c => c[0].action)).toEqual(['add_comment', 'add_comment', 'resolve_comment', 'reopen_comment']);
  });
});
