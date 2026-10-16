// src/services/templates/conditionEdits.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 519 (PS-493): several answers per question ("is any of" / "unless any of") and "unless" on an
// "or also when" alternative are built here too; only nested alternatives stay read-only.
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

/** Batch 519 (PS-493): the answers the condition names — the "unless" answers in that mode; otherwise the PS-272
 *  `answerIds` when present, else the single `answerId`. */
export const conditionAnswers = (c: VisibilityCondition | undefined): string[] => {
  if (!c) return [];
  if (conditionMode(c) === 'isNot') return [...(c.notAnswerIds ?? [])];
  if ((c.answerIds?.length ?? 0) > 0) return [...c.answerIds!];
  return c.answerId ? [c.answerId] : [];
};

/** The first answer (kept for the single-answer callers). */
export const conditionAnswer = (c: VisibilityCondition | undefined): string => conditionAnswers(c)[0] ?? '';

/** A condition another question can be read from: its question and at least one answer chosen. */
export const isConditionComplete = (c: VisibilityCondition | undefined): boolean => !!c?.fieldId && conditionAnswers(c).length > 0;

/** The condition without its answer keys, so an edit writes exactly one of them. */
const withoutAnswers = (c: VisibilityCondition): Omit<VisibilityCondition, 'answerId'> => {
  const { answerIds: _a, notAnswerIds: _n, answerId: _i, ...rest } = c;
  return rest;
};
/** One answer is written as `answerId` (the form every shipped template uses); several as `answerIds`
 *  ("is any of"); the "unless" answers always as `notAnswerIds`. */
const build = (c: VisibilityCondition, mode: ConditionMode, answers: readonly string[]): VisibilityCondition => {
  const unique = [...new Set(answers.filter(Boolean))];
  if (mode === 'isNot') return { ...withoutAnswers(c), answerId: '', notAnswerIds: unique };
  return unique.length > 1 ? { ...withoutAnswers(c), answerId: '', answerIds: unique } : { ...withoutAnswers(c), answerId: unique[0] ?? '' };
};

/** Choosing another question starts its answers again (an answer belongs to its question); the mode and the
 *  alternatives stay. */
export const withConditionField = (c: VisibilityCondition, fieldId: string): VisibilityCondition => ({ ...build(c, conditionMode(c), []), fieldId });

/** Switching between "is" and "unless" carries the chosen answers over. */
export const withConditionMode = (c: VisibilityCondition, mode: ConditionMode): VisibilityCondition => build(c, mode, conditionAnswers(c));

/** Replaces the answers with one. */
export const withConditionAnswer = (c: VisibilityCondition, answerId: string): VisibilityCondition => build(c, conditionMode(c), answerId ? [answerId] : []);

/** Replaces the answers (PS-493: several answers per question — "is any of" / "unless any of"). */
export const withConditionAnswers = (c: VisibilityCondition, answerIds: readonly string[]): VisibilityCondition => build(c, conditionMode(c), answerIds);

/** Adds or removes one answer. */
export const withConditionAnswerToggled = (c: VisibilityCondition, answerId: string): VisibilityCondition => {
  const now = conditionAnswers(c);
  return build(c, conditionMode(c), now.includes(answerId) ? now.filter(a => a !== answerId) : [...now, answerId]);
};

/** The "or also when …" alternatives: added empty, changed by index, removed (none left: the key goes). */
export function withAlternativeAdded(c: VisibilityCondition): VisibilityCondition {
  return { ...c, or: [...(c.or ?? []), { fieldId: '', answerId: '' }] };
}
export function withAlternative(c: VisibilityCondition, index: number, alt: VisibilityCondition): VisibilityCondition {
  return { ...c, or: (c.or ?? []).map((a, i) => (i === index ? alt : a)) };
}
export function withAlternativeRemoved(c: VisibilityCondition, index: number): VisibilityCondition {
  const or = (c.or ?? []).filter((_, i) => i !== index);
  const { or: _o, ...rest } = c;
  return or.length ? { ...rest, or } : rest;
}

/** A condition the picker can't show faithfully (Batch 519, PS-493, narrowed): an alternative that has its own
 *  alternatives (nested "or" stays read-only — Pete's accepted default, Oct 10), or answer keys that disagree (an
 *  `answerId` beside different `answerIds`, or "is" and "unless" answers on one condition). Several answers, and
 *  "unless" on an alternative, are now edited in the picker. A single `answerIds` entry is read as the answer and
 *  rewritten as `answerId` on the next edit. */
export function conditionTooComplex(c: VisibilityCondition | undefined): boolean {
  if (!c) return false;
  const mixed = (x: VisibilityCondition) =>
    (!!x.answerId && (x.answerIds?.length ?? 0) > 0 && !(x.answerIds!.length === 1 && x.answerIds![0] === x.answerId))
    || ((x.notAnswerIds?.length ?? 0) > 0 && (!!x.answerId || (x.answerIds?.length ?? 0) > 0));
  return mixed(c) || (c.or ?? []).some(a => mixed(a) || (a.or?.length ?? 0) > 0);
}
