// src/services/abnormalDetection/triggerCodeQueries.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-138. When a discrete trigger rule (PS-129) matches, the Code Manager offers
// a ready-made search for the matched finding. Nothing is searched here and no
// code is chosen here: the pathologist opens the Code Manager, picks a finding,
// and the live search (services/terminologySearch) returns real candidates.
// Only the candidate the pathologist selects is applied to the case.
// ─────────────────────────────────────────────────────────────────────────────
import type { ResolvedAnswer } from '@/orchestrator/contextBuilder';
import type { AbnormalSeverity, AbnormalTriggerRule } from './IAbnormalTriggerRuleService';
import { evaluateAbnormalTriggerRules } from './evaluateAbnormalTriggerRules';

export interface TriggerCodeQuery {
  ruleId: string;
  specimenId: string;
  fieldLabel: string;
  /** The matched field and value together; the user can edit it in the search box before searching. */
  matchedValue: string;
  /** What the live search is run with. */
  query: string;
  severity: AbnormalSeverity;
}

/** One entry per matched rule and per matched value (a multi-select can match on more than one),
 *  without repeats. */
export function triggerCodeQueries(
  specimenId: string,
  resolvedAnswers: ResolvedAnswer[],
  activeRules: AbnormalTriggerRule[],
): TriggerCodeQuery[] {
  const out: TriggerCodeQuery[] = [];
  const seen = new Set<string>();
  for (const match of evaluateAbnormalTriggerRules(specimenId, resolvedAnswers, activeRules)) {
    const rule = activeRules.find(r => r.id === match.ruleId);
    const answer = rule && resolvedAnswers.find(a => a.fieldLabel.trim().toLowerCase() === rule.fieldLabel.trim().toLowerCase());
    if (!rule || !answer) continue;
    const wanted = rule.triggerValues.map(v => v.trim().toLowerCase());
    for (const part of answer.displayValue.split(',').map(s => s.trim()).filter(Boolean)) {
      if (!wanted.includes(part.toLowerCase())) continue;
      const key = `${rule.id}|${part.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ruleId: rule.id, specimenId, fieldLabel: rule.fieldLabel, matchedValue: part, query: `${rule.fieldLabel} ${part}`, severity: match.severity });
    }
  }
  return out;
}
