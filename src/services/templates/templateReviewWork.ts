// src/services/templates/templateReviewWork.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431: work in progress on a template under review: the trial answers a
// reviewer fills in while checking a template, and the comments reviewers
// leave on its questions.
//
// Before, the screens kept both in the browser themselves, so a reviewer's
// comments were never seen by the author or the other reviewers. Now they go
// through this service. Mock phase: browser storage under the same keys, so
// nothing is lost. Production (PS-345): saved with the template version on the
// API server, visible to every reviewer. This file is the only place that
// changes then.
//
// The template's lifecycle state (draft, in review, approved...) is NOT kept
// here: it comes from the template service, which records every transition.
// ─────────────────────────────────────────────────────────────────────────────

import { dataStorage } from '../browserData/dataStorage';
export interface TemplateQuestionComment {
  id: string;
  author: string;
  text: string;
  resolved: boolean;
}

type AnswerMap = Record<string, unknown>;

const answersKey = (templateId: string) => `ps_answers_${templateId}`;
const commentsKey = (templateId: string, questionId: string) => `ps_comments_${templateId}_${questionId}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = dataStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch { return fallback; }
}
function write(key: string, value: unknown): void {
  try { dataStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

/** The trial answers saved for a template under review. */
export function getTemplateTrialAnswers<T extends AnswerMap = AnswerMap>(templateId: string): T {
  const saved = read<T | null>(answersKey(templateId), null);
  return (saved && typeof saved === 'object' ? saved : {}) as T;
}

/** Saves the trial answers for a template under review. */
export function saveTemplateTrialAnswers(templateId: string, answers: AnswerMap): void {
  write(answersKey(templateId), answers);
}

/** The comments on one question of a template. */
export function getTemplateQuestionComments(templateId: string, questionId: string): TemplateQuestionComment[] {
  const saved = read<TemplateQuestionComment[] | null>(commentsKey(templateId, questionId), null);
  return Array.isArray(saved) ? saved : [];
}

/** Saves the comments on one question of a template. */
export function saveTemplateQuestionComments(templateId: string, questionId: string, comments: TemplateQuestionComment[]): void {
  write(commentsKey(templateId, questionId), comments);
}

// ── Batch 579 (PS-63 follow-up): adding and resolving comments ─────────────────
// The comment thread on each question used to decide this itself (trimming, the new
// record, the audit entry); it now only renders and calls these.

/** What adding or resolving a comment records in the audit log (literal English: audit records aren't UI). */
export type TemplateCommentAuditEvent = {
  user: string; category: 'user'; action: 'add_comment' | 'resolve_comment' | 'reopen_comment';
  templateId: string; questionId: string; commentId: string; newValue?: string; detail: string;
};

export interface TemplateCommentDeps {
  log: (event: TemplateCommentAuditEvent) => void;
  newId?: () => string;
}

const defaultId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

/**
 * Adds a reviewer's comment to a question and records it. Blank text adds nothing (null). Returns the
 * question's comments as saved.
 */
export function addTemplateQuestionComment(
  input: { templateId: string; questionId: string; author: string; text: string },
  deps: TemplateCommentDeps,
): TemplateQuestionComment[] | null {
  const text = input.text.trim();
  if (!text) return null;
  const comment: TemplateQuestionComment = { id: (deps.newId ?? defaultId)(), author: input.author, text, resolved: false };
  const next = [...getTemplateQuestionComments(input.templateId, input.questionId), comment];
  saveTemplateQuestionComments(input.templateId, input.questionId, next);
  deps.log({
    user: input.author, category: 'user', action: 'add_comment', templateId: input.templateId, questionId: input.questionId,
    commentId: comment.id, newValue: text, detail: `Added comment: ${text}`,
  });
  return next;
}

/** Marks a comment resolved, or reopens it, and records which. Returns the question's comments as saved. */
export function toggleTemplateQuestionComment(
  input: { templateId: string; questionId: string; commentId: string; user: string },
  deps: TemplateCommentDeps,
): TemplateQuestionComment[] {
  const current = getTemplateQuestionComments(input.templateId, input.questionId);
  const target = current.find(c => c.id === input.commentId);
  if (!target) return current;
  const resolved = !target.resolved;
  const next = current.map(c => (c.id === input.commentId ? { ...c, resolved } : c));
  saveTemplateQuestionComments(input.templateId, input.questionId, next);
  deps.log({
    user: input.user, category: 'user', action: resolved ? 'resolve_comment' : 'reopen_comment',
    templateId: input.templateId, questionId: input.questionId, commentId: input.commentId,
    detail: resolved ? 'Comment resolved' : 'Comment reopened',
  });
  return next;
}
