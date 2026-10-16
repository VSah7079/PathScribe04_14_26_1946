// src/services/quality/qaFieldSchemaRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 516 (PS-125): the rules for editing a QA activity's review fields
// (QaActivityType.fields). Pete, Oct 10, 2026 — schema evolution in
// production medical software preserves referential integrity:
//
//   • DO NOT remove or retype an existing field. Past QA records keep their
//     answers under the field's id (QaActivityRecord.fieldValues), and audit
//     trails rely on them.
//   • DO rename a field's label, or make it optional, as workflows evolve.
//   • DO add new fields freely.
//
// The same holds for a choice field's options: an existing option can be
// relabelled but not removed, since past answers store its id. "Existing"
// means saved on the activity before this edit; a field or option added in
// the same edit can still be removed or changed before saving.
//
// Checked by the Configuration Center's editor and again by
// mockQaActivityTypeService (add and update), so no screen can break past
// records. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { QaReviewFieldDefinition, QaReviewFieldType } from '@/types/quality/QaActivityType';

export type QaFieldSchemaProblem =
  | 'noFields'
  | 'blankLabel'
  | 'duplicateId'
  | 'choiceWithoutOptions'
  | 'blankOptionLabel'
  | 'fieldRemoved'
  | 'fieldRetyped'
  | 'optionRemoved';

const PROBLEMS: readonly QaFieldSchemaProblem[] = ['noFields', 'blankLabel', 'duplicateId', 'choiceWithoutOptions', 'blankOptionLabel', 'fieldRemoved', 'fieldRetyped', 'optionRemoved'];
/** Whether a service error is one of these problems (the screen then names it). */
export const isQaFieldSchemaProblem = (error: string): error is QaFieldSchemaProblem => (PROBLEMS as readonly string[]).includes(error);

export const CHOICE_FIELD_TYPES: readonly QaReviewFieldType[] = ['dropdown', 'radio', 'checkboxes'];
export const isChoiceField = (type: QaReviewFieldType) => CHOICE_FIELD_TYPES.includes(type);

/**
 * The first problem with `next`, or null when it can be saved. `saved` is the
 * activity's fields as stored before this edit (null for a new activity).
 */
export function qaFieldSchemaProblem(
  saved: readonly QaReviewFieldDefinition[] | null,
  next: readonly QaReviewFieldDefinition[],
): QaFieldSchemaProblem | null {
  if (next.length === 0) return 'noFields';
  const ids = new Set<string>();
  for (const f of next) {
    if (!f.label.trim()) return 'blankLabel';
    if (ids.has(f.id)) return 'duplicateId';
    ids.add(f.id);
    if (isChoiceField(f.type)) {
      if (f.options.length === 0) return 'choiceWithoutOptions';
      if (f.options.some(o => !o.label.trim())) return 'blankOptionLabel';
    }
  }
  for (const before of saved ?? []) {
    const after = next.find(f => f.id === before.id);
    if (!after) return 'fieldRemoved';
    if (after.type !== before.type) return 'fieldRetyped';
    if (isChoiceField(before.type) && before.options.some(o => !after.options.some(a => a.id === o.id))) return 'optionRemoved';
  }
  return null;
}

/** Whether a field was saved before this edit (it can then be relabelled or made optional, never removed or retyped). */
export function isSavedField(saved: readonly QaReviewFieldDefinition[] | null, fieldId: string): boolean {
  return !!saved?.some(f => f.id === fieldId);
}

/** Whether an option was saved before this edit. */
export function isSavedOption(saved: readonly QaReviewFieldDefinition[] | null, fieldId: string, optionId: string): boolean {
  return !!saved?.find(f => f.id === fieldId)?.options.some(o => o.id === optionId);
}

/** A new, stable id from the label, unique among `taken` ("Second reviewer" → "second_reviewer", then "second_reviewer_2"). Never reused, never renamed. */
export function newQaFieldId(label: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = label.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** Moves the field at `index` up (-1) or down (+1); order carries no stored meaning, so any field may move. */
export function moveQaField<T>(fields: readonly T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (to < 0 || to >= fields.length) return [...fields];
  const out = [...fields];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}
