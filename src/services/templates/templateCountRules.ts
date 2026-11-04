// src/services/templates/templateCountRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 466b (Pete): the Synoptic Editor's count settings, as pure helpers —
// a numeric question's number type (decimal, or whole number), the question
// it can't exceed (Max_Value_Ref) and where its value comes from (entered by
// hand, or the total of a grid column); a grid's numeric columns, each a whole
// number or not and the column it can't exceed. The synoptic engine reads
// them from the template (partGrid.ts, synopticEntryChecks.ts).
// ─────────────────────────────────────────────────────────────────────────────

import type { PartGridColumn, SumOfSpec } from './partGrid';

type Field = { id: string; label: string; type: string; columns?: PartGridColumn[]; wholeNumber?: boolean; notMoreThan?: string; sumOf?: SumOfSpec; nodeCount?: boolean; atLeastSumOf?: string[] };
type TemplateLike = { sections: { fields: Field[] }[] };
const fieldsOf = (t: TemplateLike) => t.sections.flatMap(s => s.fields);
/** What a count setting changes on a question. */
export type CountPatch = { sumOf?: SumOfSpec; columns?: PartGridColumn[] };

/** Batch 519 (PS-494): a question that holds a count — numeric, or a free-text node count. */
const isCountField = (f: Field) => f.type === 'numeric' || (f.type === 'text' && f.nodeCount === true);

/** The count questions another count can be limited by (not itself): numeric questions and, since Batch 519,
 *  free-text node counts. */
export const numericFieldChoices = (template: TemplateLike, fieldId: string) =>
  fieldsOf(template).filter(f => isCountField(f) && f.id !== fieldId).map(f => ({ id: f.id, label: f.label }));

/** Batch 519 (PS-494): marks or unmarks a text question as a node count; unmarking drops its count limits. */
export function withNodeCount<F extends Field>(field: F, on: boolean): F {
  if (on) return { ...field, nodeCount: true };
  const { nodeCount: _n, notMoreThan: _m, atLeastSumOf: _s, ...rest } = field;
  return rest as F;
}

/** Batch 519 (PS-494): adds or removes a count from the ones this total must cover (`atLeastSumOf`). */
export function withSumPartToggled<F extends Field>(field: F, partId: string): F {
  const now = field.atLeastSumOf ?? [];
  const next = now.includes(partId) ? now.filter(x => x !== partId) : [...now, partId];
  const { atLeastSumOf: _s, ...rest } = field;
  return (next.length ? { ...rest, atLeastSumOf: next } : rest) as F;
}

/** The grids with numeric columns, and those columns (what a total can come from). */
export const gridSumChoices = (template: TemplateLike) =>
  fieldsOf(template).filter(f => f.type === 'partGrid')
    .map(f => ({ id: f.id, label: f.label, columns: (f.columns ?? []).filter(c => c.type === 'numeric').map(c => ({ id: c.id, label: c.label })) }))
    .filter(g => g.columns.length > 0);

/** Batch 466c: 'gridSumChecked' — entered by hand and checked against the grid's total (`sumOf.override`). */
export type ValueSource = 'manual' | 'gridSum' | 'gridSumChecked';
export const valueSourceOf = (field: Field): ValueSource => (!field.sumOf ? 'manual' : field.sumOf.override ? 'gridSumChecked' : 'gridSum');

/** The patch for a new value source: by hand (no total), the total of a grid column (calculated), or entered by
 *  hand and checked against it — keeping the grid and column already chosen. */
export function withValueSource(field: Field, source: ValueSource, template: TemplateLike): CountPatch {
  if (source === 'manual') return { sumOf: undefined };
  const g = gridSumChoices(template)[0];
  const sumOf = field.sumOf ?? (g ? { fieldId: g.id, columnId: g.columns[0].id } : undefined);
  if (!sumOf) return {};
  const { override: _o, ...rest } = sumOf;
  return { sumOf: source === 'gridSumChecked' ? { ...rest, override: true } : rest };
}
/** The patch for the grid (its first numeric column) or the column a total comes from. */
export function withSumGrid(field: Field, gridId: string, template: TemplateLike): CountPatch {
  const g = gridSumChoices(template).find(x => x.id === gridId);
  return g ? { sumOf: { ...field.sumOf, fieldId: g.id, columnId: g.columns[0].id } } : {};
}
export const withSumColumn = (field: Field, columnId: string): CountPatch =>
  (field.sumOf ? { sumOf: { ...field.sumOf, columnId } } : {});

/** A grid's numeric columns, for its count rules. */
export const numericColumns = (field: Field) => (field.columns ?? []).filter(c => c.type === 'numeric');

/** The patch for one grid column's count rule; a column can't be limited by itself. */
export function withColumnRule(field: Field, columnId: string, rule: { wholeNumber?: boolean; notMoreThan?: string }): CountPatch {
  return {
    columns: (field.columns ?? []).map(c => {
      if (c.id !== columnId) return c;
      const next: PartGridColumn = { ...c };
      if (rule.wholeNumber !== undefined) { if (rule.wholeNumber) next.wholeNumber = true; else delete next.wholeNumber; }
      if (rule.notMoreThan !== undefined) { if (rule.notMoreThan && rule.notMoreThan !== c.id) next.notMoreThan = rule.notMoreThan; else delete next.notMoreThan; }
      return next;
    }),
  };
}
