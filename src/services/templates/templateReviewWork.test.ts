// @vitest-environment happy-dom
// src/services/templates/templateReviewWork.test.ts
// Batch 579 (PS-63 follow-up): reviewers' comments on a template's questions are added, resolved and
// reopened here, saved and audited (the comment thread only renders and calls these).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addTemplateQuestionComment, getTemplateQuestionComments, toggleTemplateQuestionComment, type TemplateCommentDeps, type TemplateCommentAuditEvent,
} from './templateReviewWork';

const deps = () => {
  let n = 0;
  const log = vi.fn<(e: TemplateCommentAuditEvent) => void>();
  const d: TemplateCommentDeps = { log, newId: () => `c${++n}` };
  return Object.assign(d, { log });
};

beforeEach(() => { localStorage.clear(); });

describe('template question comments (Batch 579)', () => {
  it('adds a trimmed comment, saves it and records it in the audit log', () => {
    const d = deps();
    const next = addTemplateQuestionComment({ templateId: 't1', questionId: 'q1', author: 'Dr Lee', text: '  Needs a unit  ' }, d);
    expect(next).toEqual([{ id: 'c1', author: 'Dr Lee', text: 'Needs a unit', resolved: false }]);
    expect(getTemplateQuestionComments('t1', 'q1')).toEqual(next);
    expect(d.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'add_comment', user: 'Dr Lee', templateId: 't1', questionId: 'q1', commentId: 'c1', detail: 'Added comment: Needs a unit',
    }));
  });

  it('blank text adds nothing and records nothing', () => {
    const d = deps();
    expect(addTemplateQuestionComment({ templateId: 't1', questionId: 'q1', author: 'Dr Lee', text: '   ' }, d)).toBeNull();
    expect(getTemplateQuestionComments('t1', 'q1')).toEqual([]);
    expect(d.log).not.toHaveBeenCalled();
  });

  it('adds to what is already saved (another reviewer\'s comment is kept)', () => {
    const d = deps();
    addTemplateQuestionComment({ templateId: 't1', questionId: 'q1', author: 'Dr Lee', text: 'First' }, d);
    const next = addTemplateQuestionComment({ templateId: 't1', questionId: 'q1', author: 'Dr Kim', text: 'Second' }, d);
    expect(next?.map(c => c.text)).toEqual(['First', 'Second']);
  });

  it('resolves and reopens a comment, recording each', () => {
    const d = deps();
    addTemplateQuestionComment({ templateId: 't1', questionId: 'q1', author: 'Dr Lee', text: 'Fix' }, d);
    const resolved = toggleTemplateQuestionComment({ templateId: 't1', questionId: 'q1', commentId: 'c1', user: 'Dr Kim' }, d);
    expect(resolved[0].resolved).toBe(true);
    expect(d.log).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'resolve_comment', user: 'Dr Kim', detail: 'Comment resolved' }));
    const reopened = toggleTemplateQuestionComment({ templateId: 't1', questionId: 'q1', commentId: 'c1', user: 'Dr Kim' }, d);
    expect(reopened[0].resolved).toBe(false);
    expect(d.log).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'reopen_comment', detail: 'Comment reopened' }));
  });

  it('an unknown comment changes nothing and records nothing', () => {
    const d = deps();
    expect(toggleTemplateQuestionComment({ templateId: 't1', questionId: 'q1', commentId: 'nope', user: 'Dr Kim' }, d)).toEqual([]);
    expect(d.log).not.toHaveBeenCalled();
  });
});
