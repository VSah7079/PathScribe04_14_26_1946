// src/services/tumorBoardRules/tumorBoardRuleEvaluation.ts
// Batch 491. Pure: resolving the effective rule per board (enterprise →
// facility override, same two-tier pattern as resolveEffectiveCorrelationRule
// in services/cytology/cytologyHistologyCorrelationWindow.ts) and deciding
// which margin shadow attributes trip which rule. No storage, no service
// calls — kept out of the component/orchestrator per CLAUDE.md rule 2.
import type { MarginShadowAttribute } from '../marginExtraction/IMarginExtractionService';
import type { TumorBoardAutoFlagRule, FacilityTumorBoardRuleOverride } from './ITumorBoardRuleService';

export type TumorBoardRuleSource = 'enterprise' | 'facility';

export interface EffectiveTumorBoardRule extends TumorBoardAutoFlagRule {
  source: TumorBoardRuleSource;
}

/** The rule each board uses for one facility — the facility's own override
 *  (if any) replaces the fields it sets; anything it leaves unset falls
 *  back to the enterprise baseline. */
export function resolveEffectiveTumorBoardRules(
  enterpriseRules: readonly TumorBoardAutoFlagRule[],
  facilityOverrides: readonly FacilityTumorBoardRuleOverride[],
): EffectiveTumorBoardRule[] {
  return enterpriseRules.map(rule => {
    const override = facilityOverrides.find(o => o.ruleId === rule.id);
    if (!override || (override.marginThresholdMm === undefined && override.active === undefined && override.board === undefined)) {
      return { ...rule, source: 'enterprise' };
    }
    return {
      ...rule,
      marginThresholdMm: override.marginThresholdMm ?? rule.marginThresholdMm,
      active: override.active ?? rule.active,
      // Batch 610 (#71): a facility may route the rule's cases to another board.
      board: override.board ?? rule.board,
      source: 'facility',
    };
  });
}

export interface MarginRuleMatch {
  rule: EffectiveTumorBoardRule;
  attribute: MarginShadowAttribute;
  triggerReason: string;
}

/** A short, human-readable rendering of which rule fired and on what value
 *  — Pete's own worked example format ("Flagged for MDT: ..., Margin <
 *  1mm"), scoped to the one criterion this engine actually evaluates. */
export function buildMarginTriggerReason(attribute: MarginShadowAttribute, rule: EffectiveTumorBoardRule): string {
  const approxPrefix = attribute.approx === 'lessThan' ? '< ' : attribute.approx === 'greaterThan' ? '> ' : '';
  return `Margin: ${attribute.fieldLabel} ${approxPrefix}${attribute.valueMm}mm (threshold < ${rule.marginThresholdMm}mm)`;
}

/** Every (rule, attribute) pair where an active rule's threshold is
 *  breached — a case may breach more than one board's rule; the caller
 *  decides which single match to actually act on (at most one active
 *  Tumor Board listing per case). Order follows `rules`, so the caller's
 *  own ordering (enterprise baseline order) decides which wins when more
 *  than one matches. */
export function evaluateMarginRules(
  attributes: readonly MarginShadowAttribute[],
  rules: readonly EffectiveTumorBoardRule[],
): MarginRuleMatch[] {
  const matches: MarginRuleMatch[] = [];
  for (const rule of rules) {
    if (!rule.active) continue;
    for (const attribute of attributes) {
      if (attribute.valueMm < rule.marginThresholdMm) {
        matches.push({ rule, attribute, triggerReason: buildMarginTriggerReason(attribute, rule) });
      }
    }
  }
  return matches;
}
