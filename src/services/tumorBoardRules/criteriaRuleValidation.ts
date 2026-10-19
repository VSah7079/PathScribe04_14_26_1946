// src/services/tumorBoardRules/criteriaRuleValidation.ts
// Batch 610 (#71). Pure: what makes an admin-added Tumor Board criteria rule
// acceptable. Returns an error key (translated by the screen) or null.
import { TUMOR_BOARD_NAMES } from '../tumorBoard/ITumorBoardService';
import {
  MAX_CRITERIA_PER_RULE,
  type NewTumorBoardCriteriaRule,
  type TumorBoardCriterion,
} from './ITumorBoardRuleService';

export const CRITERION_TEXT_MIN = 2;
export const CRITERION_TEXT_MAX = 60;
export const RULE_LABEL_MAX = 80;

export function validateCriterion(c: TumorBoardCriterion): string | null {
  if (c.kind === 'diagnosis') {
    const n = c.text.trim().length;
    return n < CRITERION_TEXT_MIN || n > CRITERION_TEXT_MAX ? 'criterionTextInvalid' : null;
  }
  if (c.kind === 'biomarker') {
    const m = c.marker.trim().length;
    const r = c.result.trim().length;
    return m < 1 || m > CRITERION_TEXT_MAX || r < 1 || r > CRITERION_TEXT_MAX ? 'criterionBiomarkerInvalid' : null;
  }
  return Number.isFinite(c.belowMm) && c.belowMm > 0 && c.belowMm <= 100 ? null : 'marginThresholdMmInvalid';
}

/** A full rule (create) or the fields present on a change (update). */
export function validateCriteriaRule(rule: Partial<NewTumorBoardCriteriaRule>, requireAll: boolean): string | null {
  if (requireAll || rule.label !== undefined) {
    const n = (rule.label ?? '').trim().length;
    if (n < 1 || n > RULE_LABEL_MAX) return 'ruleLabelInvalid';
  }
  if (requireAll || rule.board !== undefined) {
    if (!rule.board || !(TUMOR_BOARD_NAMES as readonly string[]).includes(rule.board)) return 'boardInvalid';
  }
  if (requireAll || rule.criteria !== undefined) {
    const criteria = rule.criteria ?? [];
    if (criteria.length === 0 || criteria.length > MAX_CRITERIA_PER_RULE) return 'criteriaCountInvalid';
    // A margin-only rule would duplicate the margin rules above it; a criteria rule needs a diagnosis or biomarker.
    if (!criteria.some(c => c.kind !== 'margin')) return 'criteriaNeedDiagnosisOrBiomarker';
    for (const c of criteria) {
      const problem = validateCriterion(c);
      if (problem) return problem;
    }
  }
  return null;
}

/** Trims text fields so what is stored and what is matched agree. */
export function normaliseCriteria(criteria: readonly TumorBoardCriterion[]): TumorBoardCriterion[] {
  return criteria.map(c =>
    c.kind === 'diagnosis' ? { kind: 'diagnosis', text: c.text.trim() }
      : c.kind === 'biomarker' ? { kind: 'biomarker', marker: c.marker.trim(), result: c.result.trim() }
        : { kind: 'margin', belowMm: c.belowMm });
}
