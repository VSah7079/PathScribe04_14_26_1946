// src/services/caseSearch/synopticValueCriteria.ts
// ─────────────────────────────────────────────────
// Batch 613: search on what was answered in a synoptic report ("grade 3", "tumor size over
// 2 cm", "margin status positive"). Pure. A criterion names a protocol, one of its
// questions, an operator and a value. A case matches when one of its reports from that
// protocol has a matching answer; every criterion given must match (they are ANDed).
//
// The questions come from the protocol registry (the field catalogue below is built from
// the protocol templates), so the search page offers exactly the questions a protocol asks
// and the choices it allows. The API server runs the same rules in SQL
// (docs/architecture/CASE_SEARCH_API.md).
// ─────────────────────────────────────────────────

export type SynopticValueOperator =
  | 'is' | 'isNot' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'answered' | 'unanswered';

export interface SynopticValueCriterion {
  templateId: string;
  fieldId: string;
  operator: SynopticValueOperator;
  /** A choice's option id, a number, or text. Empty for 'answered' and 'unanswered'. */
  value: string;
}

/** How a question is answered: one choice, several choices, a number, or text. */
export type SynopticFieldKind = 'choice' | 'multi' | 'number' | 'text';

export interface SynopticFieldInfo {
  id: string;
  /** The protocol's own wording (administrator-entered data, not translated). */
  label: string;
  kind: SynopticFieldKind;
  options: ReadonlyArray<{ id: string; label: string }>;
  /** The unit a number is in (e.g. "cm"): comparisons use the number as entered. */
  unit?: string;
}

/** templateId → fieldId → the question. */
export type SynopticFieldCatalogue = ReadonlyMap<string, ReadonlyMap<string, SynopticFieldInfo>>;

export const SYNOPTIC_VALUE_OPERATORS: readonly SynopticValueOperator[] = [
  'is', 'isNot', 'contains', 'gt', 'gte', 'lt', 'lte', 'answered', 'unanswered',
];

/** The most value filters one search carries. */
export const MAX_SYNOPTIC_VALUE_CRITERIA = 10;

const OPERATORS_BY_KIND: Readonly<Record<SynopticFieldKind, readonly SynopticValueOperator[]>> = {
  choice: ['is', 'isNot', 'answered', 'unanswered'],
  multi: ['is', 'isNot', 'answered', 'unanswered'],
  number: ['is', 'isNot', 'gt', 'gte', 'lt', 'lte', 'answered', 'unanswered'],
  text: ['contains', 'is', 'isNot', 'answered', 'unanswered'],
};

/** The operators that make sense for a question of this kind (pure). */
export function operatorsForKind(kind: SynopticFieldKind): readonly SynopticValueOperator[] {
  return OPERATORS_BY_KIND[kind];
}

export const operatorNeedsValue = (op: SynopticValueOperator): boolean => op !== 'answered' && op !== 'unanswered';

/** The shape of a protocol template this file reads (the editor's EditorTemplate satisfies it). */
export interface CatalogueTemplate {
  id: string;
  sections: ReadonlyArray<{
    fields: ReadonlyArray<{
      id: string; label: string; type: string; unit?: string;
      options?: ReadonlyArray<{ id: string; label: string }>;
    }>;
  }>;
}

const KIND_BY_TYPE: Readonly<Record<string, SynopticFieldKind | undefined>> = {
  dropdown: 'choice', radio: 'choice', checkboxes: 'multi', numeric: 'number', text: 'text', longtext: 'text',
};

/** The questions a set of protocols asks, as the search offers them. Grids and the Mohs map are not searchable. */
export function buildSynopticFieldCatalogue(templates: readonly CatalogueTemplate[]): SynopticFieldCatalogue {
  const out = new Map<string, Map<string, SynopticFieldInfo>>();
  for (const tpl of templates) {
    const fields = new Map<string, SynopticFieldInfo>();
    for (const section of tpl.sections ?? []) {
      for (const f of section.fields ?? []) {
        const kind = KIND_BY_TYPE[f.type];
        if (!kind || !f.id) continue;
        fields.set(f.id, {
          id: f.id, label: f.label || f.id, kind,
          options: (f.options ?? []).map(o => ({ id: o.id, label: o.label })),
          ...(f.unit ? { unit: f.unit } : {}),
        });
      }
    }
    out.set(tpl.id, fields);
  }
  return out;
}

/** The answer as separate values (a multi-choice answer holds several). Blank values are dropped. */
export function answerValues(answer: string | string[] | undefined): string[] {
  const list = Array.isArray(answer) ? answer : answer === undefined ? [] : [answer];
  return list.map(v => String(v ?? '').trim()).filter(Boolean);
}

/** The number at the start of an answer ("2.3 cm" is 2.3; "1,5" is 1.5), or null. */
export function leadingNumber(text: string): number | null {
  const m = /^\s*(-?\d+(?:[.,]\d+)?)/.exec(text);
  if (!m) return null;
  const n = Number.parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const lower = (s: string) => s.trim().toLowerCase();

/** What an answer reads as, for display and for matching: a choice's label, else the text itself (pure). */
export function answerDisplay(value: string, field: SynopticFieldInfo | undefined): string {
  if (!field || field.kind === 'number' || field.kind === 'text') return value;
  return field.options.find(o => o.id === value)?.label ?? value;
}

/** Whether one answer satisfies a criterion (pure). `field` may be unknown; raw text is compared then. */
export function answerMatches(
  answer: string | string[] | undefined, c: SynopticValueCriterion, field: SynopticFieldInfo | undefined,
): boolean {
  const values = answerValues(answer);
  if (c.operator === 'answered') return values.length > 0;
  if (c.operator === 'unanswered') return values.length === 0;
  const want = c.value.trim();
  if (!want) return false;

  const sameValue = (v: string): boolean => {
    if (lower(v) === lower(want)) return true;
    if (field && (field.kind === 'choice' || field.kind === 'multi')) return lower(answerDisplay(v, field)) === lower(want);
    if (field?.kind === 'number' || (!field && leadingNumber(want) !== null)) {
      const a = leadingNumber(v); const b = leadingNumber(want);
      return a !== null && b !== null && a === b;
    }
    return false;
  };

  switch (c.operator) {
    case 'is': return values.some(sameValue);
    case 'isNot': return values.length > 0 && !values.some(sameValue);
    case 'contains': return values.some(v => lower(v).includes(lower(want)) || lower(answerDisplay(v, field)).includes(lower(want)));
    case 'gt': case 'gte': case 'lt': case 'lte': {
      const b = leadingNumber(want);
      if (b === null) return false;
      return values.some(v => {
        const a = leadingNumber(v);
        if (a === null) return false;
        return c.operator === 'gt' ? a > b : c.operator === 'gte' ? a >= b : c.operator === 'lt' ? a < b : a <= b;
      });
    }
    default: return false;
  }
}

/** The part of a case this reads: its synoptic reports and their answers. */
export interface CaseWithSynopticAnswers {
  synopticReports?: ReadonlyArray<{ templateId: string; answers?: Record<string, string | string[]> }>;
}

/** Whether a case satisfies one criterion: a report from that protocol has a matching answer (pure). */
export function caseMatchesSynopticValue(
  c: CaseWithSynopticAnswers, criterion: SynopticValueCriterion, catalogue: SynopticFieldCatalogue | undefined,
): boolean {
  const field = catalogue?.get(criterion.templateId)?.get(criterion.fieldId);
  return (c.synopticReports ?? [])
    .filter(r => r.templateId === criterion.templateId)
    .some(r => answerMatches(r.answers?.[criterion.fieldId], criterion, field));
}

/** Whether a case satisfies every criterion (pure). No criteria: always. */
export function caseMatchesSynopticValues(
  c: CaseWithSynopticAnswers, criteria: readonly SynopticValueCriterion[] | undefined, catalogue: SynopticFieldCatalogue | undefined,
): boolean {
  return (criteria ?? []).every(k => caseMatchesSynopticValue(c, k, catalogue));
}

/** A criterion that can be searched on: a protocol, a question, an operator, and a value where one is needed. */
export function criterionIsComplete(k: SynopticValueCriterion): boolean {
  return !!k.templateId && !!k.fieldId && SYNOPTIC_VALUE_OPERATORS.includes(k.operator)
    && (!operatorNeedsValue(k.operator) || k.value.trim() !== '');
}

/** The criteria a search carries: complete ones only, at most MAX_SYNOPTIC_VALUE_CRITERIA, without exact duplicates. */
export function usableCriteria(list: readonly SynopticValueCriterion[] | undefined): SynopticValueCriterion[] {
  const seen = new Set<string>();
  const out: SynopticValueCriterion[] = [];
  for (const k of list ?? []) {
    if (!criterionIsComplete(k)) continue;
    const key = [k.templateId, k.fieldId, k.operator, k.value.trim().toLowerCase()].join('\u0001');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ templateId: k.templateId, fieldId: k.fieldId, operator: k.operator, value: operatorNeedsValue(k.operator) ? k.value.trim() : '' });
    if (out.length >= MAX_SYNOPTIC_VALUE_CRITERIA) break;
  }
  return out;
}

/** A stored criterion list (a saved search) read back safely, whatever version saved it. */
export function normalizeCriteria(value: unknown): SynopticValueCriterion[] {
  if (!Array.isArray(value)) return [];
  return usableCriteria(value.map(v => {
    const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    return {
      templateId: typeof r.templateId === 'string' ? r.templateId : '',
      fieldId: typeof r.fieldId === 'string' ? r.fieldId : '',
      operator: SYNOPTIC_VALUE_OPERATORS.includes(r.operator as SynopticValueOperator) ? r.operator as SynopticValueOperator : 'is',
      value: typeof r.value === 'string' ? r.value : '',
    };
  }));
}
