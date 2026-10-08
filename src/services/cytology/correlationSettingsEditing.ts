// src/services/cytology/correlationSettingsEditing.ts
// Batch 452 (PS-156): the decisions behind the Correlation Window settings
// screen (components/Config/Cytology/CytologyHistologyCorrelationSection.tsx):
// reading the days box, which jurisdictions can still get a rule, and the
// patch a change produces. Pure.
import type { CorrelationWindowAnchor, CytologyHistologyCorrelationRule, CytologyHistologyCorrelationSettingsConfig } from './ICytologyHistologyCorrelationSettingsService';
import { validateCorrelationRule, type CorrelationRuleProblem } from './cytologyHistologyCorrelationWindow';

/** The days box as a number, or NaN when it isn't a whole number. */
export function parseWindowDays(text: string): number {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
}

export interface RuleDraft { days: string; anchor: CorrelationWindowAnchor }

export function draftOf(rule: CytologyHistologyCorrelationRule): RuleDraft {
  return { days: String(rule.windowDays), anchor: rule.anchor };
}

/** The rule a draft describes, or the problems that stop it being saved. */
export function ruleFromDraft(draft: RuleDraft): { rule: CytologyHistologyCorrelationRule; problems: CorrelationRuleProblem[] } {
  const rule = { windowDays: parseWindowDays(draft.days), anchor: draft.anchor };
  return { rule, problems: validateCorrelationRule(rule) };
}

/** Jurisdictions that don't have a rule yet, in the given order. */
export function jurisdictionsWithoutRule(all: readonly string[], config: Pick<CytologyHistologyCorrelationSettingsConfig, 'jurisdictionRules'>): string[] {
  return all.filter(code => !config.jurisdictionRules[code]);
}

export function withJurisdictionRule(rules: CytologyHistologyCorrelationSettingsConfig['jurisdictionRules'], code: string, rule: CytologyHistologyCorrelationRule) {
  return { ...rules, [code]: { ...rule } };
}

export function withoutJurisdictionRule(rules: CytologyHistologyCorrelationSettingsConfig['jurisdictionRules'], code: string) {
  const { [code]: _removed, ...rest } = rules;
  return rest;
}
