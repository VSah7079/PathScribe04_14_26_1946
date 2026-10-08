// src/services/templates/conditionEdits.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 466c (Pete): the Synoptic Editor builds every visibility condition the
// engine reads (fieldVisibility.ts) — "shown when <question> is <answer>",
// "shown unless <question> is <answer>" (`notAnswerIds`, shown while it is
// unanswered too) and "or also when …" alternatives (`or`) — so none has to
// be written in the template file. Pure edits; the editor only renders them.
// ─────────────────────────────────────────────────────────────────────────────

import type { VisibilityCondition } from './fieldVisibility';

export type ConditionMode = 'is' | 'isNot';

/** "Unless" while `notAnswerIds` is present, even before its answer is chosen (an empty list), so the mode
 *  never flips back on its own. */
export const conditionMode = (c: VisibilityCondition | undefined): ConditionMode => (c?.notAnswerIds !== undefined ? 'isNot' : 'is');

/** The answer the condition names (the "unless" answer in that mode; a single PS-272 `answerIds` entry is read
 *  as the answer). */
export const conditionAnswer = (c: VisibilityCondition | undefined): string =>
  (conditionMode(c) === 'isNot' ? c?.notAnswerIds?.[0] ?? '' : c?.answerId || (c?.answerIds?.length === 1 ? c.answerIds[0] : ''));

/** A condition another question can be read from: its question and answer chosen. */
export const isConditionComplete = (c: VisibilityCondition | undefined): boolean => !!c?.fieldId && !!conditionAnswer(c);

/** The condition without its answer keys, so an edit writes exactly one of them. */
const withoutAnswers = (c: VisibilityCondition): Omit<VisibilityCondition, 'answerId'> => {
  const { answerIds: _a, notAnswerIds: _n, answerId: _i, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
};
const build = (c: VisibilityCondition, mode: ConditionMode, answer: string): VisibilityCondition =>
  (mode === 'isNot' ? { ...withoutAnswers(c), answerId: '', notAnswerIds: answer ? [answer] : [] } : { ...withoutAnswers(c), answerId: answer });

/** Choosing another question starts its answer again (an answer belongs to its question); the mode and the
 *  alternatives stay. */
export const withConditionField = (c: VisibilityCondition, fieldId: string): VisibilityCondition => ({ ...build(c, conditionMode(c), ''), fieldId });

/** Switching between "is" and "unless" carries the chosen answer over. */
export const withConditionMode = (c: VisibilityCondition, mode: ConditionMode): VisibilityCondition => build(c, mode, conditionAnswer(c));

export const withConditionAnswer = (c: VisibilityCondition, answerId: string): VisibilityCondition => build(c, conditionMode(c), answerId);

/** The "or also when …" alternatives: added empty, changed by index, removed (none left: the key goes). */
export function withAlternativeAdded(c: VisibilityCondition): VisibilityCondition {
  return { ...c, or: [...(c.or ?? []), { fieldId: '', answerId: '' }] };
}
export function withAlternative(c: VisibilityCondition, index: number, alt: VisibilityCondition): VisibilityCondition {
  return { ...c, or: (c.or ?? []).map((a, i) => (i === index ? alt : a)) };
}
export function withAlternativeRemoved(c: VisibilityCondition, index: number): VisibilityCondition {
  const or = (c.or ?? []).filter((_, i) => i !== index);
  const { or: _o, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
  return or.length ? { ...rest, or } : rest;
}

/** A condition the picker can't show faithfully: several answers for one question (PS-272 `answerIds`, or more
 *  than one "unless" answer), or an alternative that is itself an "unless", has alternatives or several answers
 *  (the picker's alternatives are "is" only). A single `answerIds` entry is read as the answer and rewritten
 *  as `answerId` on the next edit. */
export function conditionTooComplex(c: VisibilityCondition | undefined): boolean {
  if (!c) return false;
  // Several answers, or an answer in `answerId` and a different one in `answerIds` (the engine reads `answerIds`).
  const many = (x: VisibilityCondition) => (x.answerIds?.length ?? 0) > 1 || (x.notAnswerIds?.length ?? 0) > 1
    || (!!x.answerId && x.answerIds?.length === 1 && x.answerIds[0] !== x.answerId);
  return many(c) || (c.or ?? []).some(a => many(a) || (a.notAnswerIds?.length ?? 0) > 0 || (a.or?.length ?? 0) > 0);
}
