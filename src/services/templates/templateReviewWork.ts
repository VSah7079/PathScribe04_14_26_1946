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
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch { return fallback; }
}
function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
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
