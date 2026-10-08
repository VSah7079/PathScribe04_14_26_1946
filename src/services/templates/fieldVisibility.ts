// src/services/templates/fieldVisibility.ts
// ─────────────────────────────────────────────────────────────────────────────
// Whether a synoptic section or field is shown, given the answers so far
// (its `visibleWhen` condition). Batch 437 moved this here from
// components/Config/Protocols/SynopticEditor.tsx, which re-exports it, so
// services (the AI-confidence badge, autopsy required fields) can use it
// without importing a component.
// ─────────────────────────────────────────────────────────────────────────────

export interface VisibilityCondition {
  fieldId: string; answerId: string; answerIds?: string[];
  /** Batch 466b: shown unless the question's answer is one of these (shown while it is unanswered), e.g. the
   *  renal vein margin unless the procedure is a partial nephrectomy. `answerId` is then ''. */
  notAnswerIds?: string[];
  /** Batch 466b: also shown when any of these conditions holds (e.g. a non-standard margin added by hand). */
  or?: VisibilityCondition[];
}

/** Batch 466c: a condition with its question or answer still to choose (the Synoptic Editor saves one as it's being
 *  built). */
export function isConditionSet(c: VisibilityCondition): boolean {
  return !!c.fieldId && (!!c.answerId || (c.answerIds?.length ?? 0) > 0 || (c.notAnswerIds?.length ?? 0) > 0);
}

export function isVisible(condition: VisibilityCondition | undefined, answers: Record<string, string | string[]>): boolean {
  if (!condition) return true;
  // Batch 466c: an unfinished condition is ignored, never a question hidden for good: an unfinished alternative
  // never shows it; an unfinished main condition leaves it to the finished alternatives (shown when there are none).
  const alternatives = (condition.or ?? []).filter(isConditionSet);
  if (alternatives.some(c => isVisible(c, answers))) return true;
  if (!isConditionSet(condition)) return alternatives.length === 0;
  const val = answers[condition.fieldId];
  if (condition.notAnswerIds && condition.notAnswerIds.length > 0) {
    if (!val || (Array.isArray(val) && val.length === 0)) return true;
    return Array.isArray(val) ? !val.some(v => condition.notAnswerIds!.includes(v)) : !condition.notAnswerIds.includes(val);
  }
  if (!val) return false;
  // PS-272's multi-value conditions are checked first; a single answerId
  // condition works as before.
  if (condition.answerIds && condition.answerIds.length > 0) {
    if (Array.isArray(val)) return val.some(v => condition.answerIds!.includes(v));
    return condition.answerIds.includes(val);
  }
  if (Array.isArray(val)) return val.includes(condition.answerId);
  return val === condition.answerId;
}
