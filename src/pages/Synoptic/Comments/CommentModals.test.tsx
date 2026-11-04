// @vitest-environment happy-dom
//
// src/pages/Synoptic/Comments/CommentModals.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-312): the Case and Specimen comment modals.
//   • The footer button says "Close" (not "Save") and only closes, like the
//     header ✕: a draft left in the composer is not posted.
//   • "Post Comment" is disabled while the draft is empty, and enabled once
//     there is text.
// Real English locale. The rich-text editor is replaced by a plain textarea
// (the empty-draft rule itself, commentMissing, is tested in
// services/fieldRequirements/reportPageChecks.test.ts).
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../../../components/Editor/PathScribeEditor', () => ({
  default: ({ content, onChange }: { content: string; onChange: (v: string) => void }) => (
    <textarea aria-label="composer" value={content} onChange={e => onChange(e.target.value)} />
  ),
}));

import { CaseCommentModal } from './CaseCommentModal';
import { ReportCommentModal } from './ReportCommentModal';

beforeAll(async () => { await i18n.changeLanguage('en'); });
afterEach(() => cleanup());

const common = { comments: [], currentUserId: 'PATH-001', currentUserName: 'Dr Test' };
const modals = {
  case: (onAddComment = vi.fn(), onClose = vi.fn()) => {
    render(<CaseCommentModal accession="S26-312" {...common} onAddComment={onAddComment} onClose={onClose} />);
    return { onAddComment, onClose };
  },
  specimen: (onAddComment = vi.fn(), onClose = vi.fn()) => {
    render(<ReportCommentModal specimenName="Left Breast › Invasive Carcinoma" specimenId="sp-a" isFinalized={false} {...common} onAddComment={onAddComment} onClose={onClose} />);
    return { onAddComment, onClose };
  },
};
const footerButton = () => document.querySelector('.ps-cmnt-footer button') as HTMLButtonElement;
const postButton = () => screen.getByRole('button', { name: 'Post Comment' }) as HTMLButtonElement;
const type = (text: string) => fireEvent.change(screen.getByLabelText('composer'), { target: { value: text } });

describe.each(Object.entries(modals))('PS-312 %s comment modal', (_kind, open) => {
  it('the footer button is labelled "Close", not "Save", and only closes the modal (a typed draft is not posted)', () => {
    const { onAddComment, onClose } = open();
    expect(footerButton().textContent).toBe('Close');
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    type('<p>An unposted draft</p>');
    fireEvent.click(footerButton());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAddComment).not.toHaveBeenCalled();
  });

  it('the header ✕ does exactly the same as the footer Close', () => {
    const { onAddComment, onClose } = open();
    type('<p>An unposted draft</p>');
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAddComment).not.toHaveBeenCalled();
  });

  it('"Post Comment" is disabled while the draft is empty (including an empty editor paragraph or spaces) and enabled once there is text', () => {
    const { onAddComment } = open();
    expect(postButton().disabled).toBe(true);
    type('<p></p>');
    expect(postButton().disabled).toBe(true);
    type('<p>&nbsp; </p>');
    expect(postButton().disabled).toBe(true);
    fireEvent.click(postButton());
    expect(onAddComment).not.toHaveBeenCalled();

    type('<p>Margins reviewed.</p>');
    expect(postButton().disabled).toBe(false);
    fireEvent.click(postButton());
    expect(onAddComment).toHaveBeenCalledWith('<p>Margins reviewed.</p>');
    // The composer clears after posting, so Post is disabled again.
    expect(postButton().disabled).toBe(true);
  });
});
