// src/services/tumorBoardRules/criteriaRuleEvaluation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#71). Pure: deciding which admin-added diagnosis / biomarker
// rules a signed case trips. No storage, no service calls.
//
// What is matched. A signed synoptic workup is a list of fields, each with a
// label and an answer. A diagnosis criterion looks at the answers of fields
// whose label names a diagnosis or histologic type (DIAGNOSIS_LABEL); when a
// template has no such field the answers of all of its fields are used. A
// biomarker criterion finds the fields whose label contains the marker name
// (whole word, any case) and checks that an answer contains the result as a
// whole word. Matching is by words on purpose: "ER" must not match "SERIAL",
// "Positive" must not match "Not positive" by accident of a longer word, and
// a free-text answer is read as written, never interpreted.
// ─────────────────────────────────────────────────────────────────────────────
import type { MarginShadowAttribute } from '../marginExtraction/IMarginExtractionService';
import type { TumorBoardName } from '../tumorBoard/ITumorBoardService';
import type { FacilityTumorBoardRuleOverride, TumorBoardCriteriaRule, TumorBoardCriterion } from './ITumorBoardRuleService';

export interface CriteriaFieldLike { id: string; label: string; type: string }

export interface CriteriaAnswerValue {
  fieldId: string;
  fieldLabel: string;
  /** The answer as text (a multi-select's answers joined with "; "). */
  text: string;
}

const DIAGNOSIS_LABEL = /diagnos|histolog|tumou?r type|type of (tumou?r|carcinoma|neoplasm)|neoplasm/i;

/** One signed workup's answers as label + text pairs (empty answers dropped). */
export function flattenAnswersForCriteria(
  fields: readonly CriteriaFieldLike[],
  answers: Record<string, string | string[]>,
): CriteriaAnswerValue[] {
  const out: CriteriaAnswerValue[] = [];
  for (const f of fields) {
    const raw = answers[f.id];
    const text = Array.isArray(raw) ? raw.join('; ') : (raw ?? '');
    if (text.trim() !== '') out.push({ fieldId: f.id, fieldLabel: f.label, text });
  }
  return out;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether `needle` appears in `haystack` as a whole word or phrase (any case). */
export function containsWholeWord(haystack: string, needle: string): boolean {
  const n = needle.trim();
  if (!n) return false;
  // Letters, digits and hyphens count as part of a word, so "ER" is not found in "SERIAL" or "ER-positive-like".
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(n)}($|[^\\p{L}\\p{N}])`, 'iu').test(haystack);
}

/** The text a diagnosis criterion is matched against. */
export function diagnosisTextOf(values: readonly CriteriaAnswerValue[]): string {
  const labelled = values.filter(v => DIAGNOSIS_LABEL.test(v.fieldLabel));
  return (labelled.length > 0 ? labelled : values).map(v => v.text).join(' ; ');
}

export function matchesCriterion(
  criterion: TumorBoardCriterion,
  values: readonly CriteriaAnswerValue[],
  margins: readonly MarginShadowAttribute[],
): boolean {
  if (criterion.kind === 'diagnosis') return diagnosisTextOf(values).toLowerCase().includes(criterion.text.trim().toLowerCase());
  if (criterion.kind === 'biomarker') {
    return values.some(v => containsWholeWord(v.fieldLabel, criterion.marker) && containsWholeWord(v.text, criterion.result));
  }
  return margins.some(m => m.valueMm < criterion.belowMm);
}

export function describeCriterion(c: TumorBoardCriterion): string {
  if (c.kind === 'diagnosis') return `Diagnosis contains "${c.text.trim()}"`;
  if (c.kind === 'biomarker') return `${c.marker.trim()} ${c.result.trim()}`;
  return `Margin < ${c.belowMm}mm`;
}

export type CriteriaRuleSource = 'enterprise' | 'facility';

export interface EffectiveCriteriaRule extends TumorBoardCriteriaRule { source: CriteriaRuleSource }

/** Each rule as one facility sees it: the facility may switch a rule off or route it to another board. */
export function resolveEffectiveCriteriaRules(
  rules: readonly TumorBoardCriteriaRule[],
  facilityOverrides: readonly FacilityTumorBoardRuleOverride[],
): EffectiveCriteriaRule[] {
  return rules.map(rule => {
    const o = facilityOverrides.find(x => x.ruleId === rule.id);
    if (!o || (o.active === undefined && o.board === undefined)) return { ...rule, source: 'enterprise' };
    return { ...rule, active: o.active ?? rule.active, board: o.board ?? rule.board, source: 'facility' };
  });
}

export interface CriteriaRuleMatch {
  rule: EffectiveCriteriaRule;
  board: TumorBoardName;
  triggerReason: string;
}

/** The reason stored on the listing. It names the rule and its criteria, never an answer, so it carries no patient detail. */
export function buildCriteriaTriggerReason(rule: TumorBoardCriteriaRule): string {
  return `Rule "${rule.label}": ${rule.criteria.map(describeCriterion).join(', ')}`;
}

/** Every active rule whose criteria ALL match, in rule order. */
export function evaluateCriteriaRules(
  values: readonly CriteriaAnswerValue[],
  margins: readonly MarginShadowAttribute[],
  rules: readonly EffectiveCriteriaRule[],
): CriteriaRuleMatch[] {
  const matches: CriteriaRuleMatch[] = [];
  for (const rule of rules) {
    if (!rule.active || rule.criteria.length === 0) continue;
    if (rule.criteria.every(c => matchesCriterion(c, values, margins))) {
      matches.push({ rule, board: rule.board, triggerReason: buildCriteriaTriggerReason(rule) });
    }
  }
  return matches;
}
