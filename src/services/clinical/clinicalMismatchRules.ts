// src/services/clinical/clinicalMismatchRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 529 (PS-554, Pete's decisions of Oct 11, 2026): the risk rules for the
// clinical-pathologic mismatch check. System configuration: one rule per kind
// of mismatch for all specimens, plus optional rules for one specimen type
// (a Specimen Dictionary entry), which take precedence for that type.
//
// Each rule: minimumDisplayThreshold (below it, no alert at all; default 60%),
// actionThreshold (at or above it, the rule's action applies) and actionType:
//   block — sign-out waits for a decision (a high-risk mismatch);
//   warn  — an alert on the report, sign-out isn't held;
//   log   — logged to the QA queue, sign-out isn't held.
// A rule with no action threshold (Pete: "Expected malignancy, none found →
// Log to QA") applies its action from the display threshold up.
//
// The engine (evaluateClinicalMismatch), for one suggestion:
//   a rule-based fallback (no AI)     → always low risk and always shown (Batch 651), whatever the threshold;
//   below the display threshold       → suppressed: no alert, nothing logged;
//   display threshold up to the action → low risk: alert, logged to QA;
//   at or above the action threshold  → the rule's action (block is high risk).
// With several specimen types on the case, the most severe outcome wins.
//
// The report page uses this from Batch 530 (Gate A alert, Gate B sign-out);
// until then sign-out works as it did (PS-145). Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { NewAuditLog } from '../auditlog/IAuditService';
import type { ClinicalMismatchKind } from './detectClinicalPathologicMismatch';

export type ClinicalMismatchActionType = 'block' | 'warn' | 'log';
export const CLINICAL_MISMATCH_ACTION_TYPES: readonly ClinicalMismatchActionType[] = ['block', 'warn', 'log'];
export const CLINICAL_MISMATCH_CATEGORIES: readonly ClinicalMismatchKind[] = [
  'unexpected-malignancy', 'cause-of-death', 'site-or-organ', 'expected-malignancy-absent', 'other',
];
export const DEFAULT_MINIMUM_DISPLAY_THRESHOLD = 60;

export interface ClinicalMismatchRule {
  id: string;
  /** A Specimen Dictionary entry id, or null for every specimen type. */
  specimenTypeId: string | null;
  category: ClinicalMismatchKind;
  /** Percent. Below it there is no alert at all. */
  minimumDisplayThreshold: number;
  /** Percent. At or above it the action applies; null = from the display threshold. */
  actionThreshold: number | null;
  actionType: ClinicalMismatchActionType;
}

const all = (category: ClinicalMismatchKind, actionThreshold: number | null, actionType: ClinicalMismatchActionType): ClinicalMismatchRule => ({
  id: `all:${category}`, specimenTypeId: null, category,
  minimumDisplayThreshold: DEFAULT_MINIMUM_DISPLAY_THRESHOLD, actionThreshold, actionType,
});

/** The starting rules (Pete, Oct 11, 2026). */
export const DEFAULT_CLINICAL_MISMATCH_RULES: readonly ClinicalMismatchRule[] = [
  all('unexpected-malignancy', 70, 'block'),
  all('cause-of-death', 70, 'block'),
  all('site-or-organ', 65, 'block'),
  all('expected-malignancy-absent', null, 'log'),
  all('other', 65, 'log'),
];

/** The rule for every specimen type for each kind always exists: missing ones come back from the defaults. */
export function withDefaultRules(stored: readonly ClinicalMismatchRule[] | null | undefined): ClinicalMismatchRule[] {
  const rules = [...(stored ?? [])];
  for (const d of DEFAULT_CLINICAL_MISMATCH_RULES) {
    if (!rules.some(r => r.specimenTypeId === null && r.category === d.category)) rules.push({ ...d });
  }
  return sortRules(rules);
}

/** Display order: by kind as listed, the rule for all specimen types first. */
export function sortRules(rules: readonly ClinicalMismatchRule[]): ClinicalMismatchRule[] {
  const order = (r: ClinicalMismatchRule) => CLINICAL_MISMATCH_CATEGORIES.indexOf(r.category);
  return [...rules].sort((a, b) => order(a) - order(b)
    || (a.specimenTypeId === null ? -1 : b.specimenTypeId === null ? 1 : a.specimenTypeId.localeCompare(b.specimenTypeId)));
}

export type ClinicalMismatchRuleProblem =
  | 'unknownCategory' | 'unknownAction' | 'thresholdRange' | 'actionBelowDisplay' | 'duplicate' | 'cannotRemoveDefault';

const percent = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 100;

/** Why this rule can't be saved alongside the others, or null (pure). */
export function clinicalMismatchRuleProblem(rule: ClinicalMismatchRule, others: readonly ClinicalMismatchRule[]): ClinicalMismatchRuleProblem | null {
  if (!CLINICAL_MISMATCH_CATEGORIES.includes(rule.category)) return 'unknownCategory';
  if (!CLINICAL_MISMATCH_ACTION_TYPES.includes(rule.actionType)) return 'unknownAction';
  if (!percent(rule.minimumDisplayThreshold) || (rule.actionThreshold !== null && !percent(rule.actionThreshold))) return 'thresholdRange';
  if (rule.actionThreshold !== null && rule.actionThreshold < rule.minimumDisplayThreshold) return 'actionBelowDisplay';
  if (others.some(o => o.id !== rule.id && o.category === rule.category && o.specimenTypeId === rule.specimenTypeId)) return 'duplicate';
  return null;
}

/** A rule for all specimen types can be changed, never removed. */
export function clinicalMismatchRuleRemovalProblem(rule: ClinicalMismatchRule): ClinicalMismatchRuleProblem | null {
  return rule.specimenTypeId === null ? 'cannotRemoveDefault' : null;
}

/** A new rule for one specimen type, starting from the all-specimens rule for that kind. */
export function newSpecimenRule(category: ClinicalMismatchKind, specimenTypeId: string, rules: readonly ClinicalMismatchRule[]): ClinicalMismatchRule {
  const base = rules.find(r => r.category === category && r.specimenTypeId === null)
    ?? DEFAULT_CLINICAL_MISMATCH_RULES.find(r => r.category === category)!;
  return { ...base, id: `${specimenTypeId}:${category}`, specimenTypeId };
}

import { capabilitiesFor, regulatoryProfile, type RegulatoryProfile } from '@/services/regulatoryProfile/regulatoryProfile';

// ── The engine ───────────────────────────────────────────────────────────────

export type ClinicalMismatchRisk = 'suppressed' | 'low' | 'high';

export interface ClinicalMismatchOutcome {
  risk: ClinicalMismatchRisk;
  /** Show the inline alert on the report (Gate A). */
  display: boolean;
  /** Sign-out waits for a decision (Gate B). */
  holdsSignOut: boolean;
  /** Logged to the QA queue. */
  logToQa: boolean;
  /** The rule's action, when the confidence reached its action threshold. */
  action: ClinicalMismatchActionType | null;
  /** The rule that decided it (so the pathologist can see why). */
  rule: ClinicalMismatchRule;
}

/** The rules that apply to a kind of mismatch on a case with these specimen types (pure). */
export function applicableRules(category: ClinicalMismatchKind, specimenTypeIds: readonly (string | null | undefined)[], rules: readonly ClinicalMismatchRule[]): ClinicalMismatchRule[] {
  const forKind = withDefaultRules(rules).filter(r => r.category === category);
  const general = forKind.find(r => r.specimenTypeId === null)!;
  const ids = [...new Set(specimenTypeIds.filter((s): s is string => !!s))];
  if (!ids.length) return [general];
  // Each specimen type uses its own rule, or the general one.
  return [...new Map(ids.map(id => {
    const r = forKind.find(x => x.specimenTypeId === id) ?? general;
    return [r.id, r] as const;
  })).values()];
}

function outcomeFor(confidence: number, rule: ClinicalMismatchRule): ClinicalMismatchOutcome {
  if (confidence < rule.minimumDisplayThreshold) {
    return { risk: 'suppressed', display: false, holdsSignOut: false, logToQa: false, action: null, rule };
  }
  const actionAt = rule.actionThreshold ?? rule.minimumDisplayThreshold;
  if (confidence < actionAt) {
    return { risk: 'low', display: true, holdsSignOut: false, logToQa: true, action: null, rule };
  }
  const high = rule.actionType === 'block';
  return { risk: high ? 'high' : 'low', display: true, holdsSignOut: high, logToQa: true, action: rule.actionType, rule };
}

const SEVERITY = (o: ClinicalMismatchOutcome) =>
  (o.holdsSignOut ? 100 : 0) + (o.display ? 10 : 0) + (o.action === 'warn' ? 2 : o.action === 'log' ? 1 : 0);

/**
 * What a mismatch suggestion leads to (pure). Confidence is a percent (0–100).
 * With several specimen types, the most severe outcome wins.
 */
export function evaluateClinicalMismatch(
  suggestion: { kind: ClinicalMismatchKind; confidence: number; source?: 'ai' | 'rule' | 'pathologist' },
  specimenTypeIds: readonly (string | null | undefined)[],
  rules: readonly ClinicalMismatchRule[],
  profile: RegulatoryProfile = regulatoryProfile(),
): ClinicalMismatchOutcome {
  // Batch 679: in the documentation profile the model's score decides nothing. Any suggestion the check returns is
  // shown as a plain flag with its reason, always low risk: logged to QA, never holds sign-out. The thresholds and
  // Block rules below stay in the code and apply again under the clinical_support profile.
  if (!capabilitiesFor(profile).scoreDrivenActions) {
    const rule = applicableRules(suggestion.kind, specimenTypeIds, rules)[0];
    return { risk: 'low', display: true, holdsSignOut: false, logToQa: true, action: null, rule };
  }
  // Batch 651: the rule-based fallback (confidence 50, "a prompt to look, not a finding") is below the default AI display
  // threshold (60), so it never showed. The AI threshold is about how sure a model is; a rule-based result has no model, so
  // it is shown regardless of that threshold, labelled rule-based, always LOW risk: it logs to QA and never holds sign-out.
  if (suggestion.source === 'rule') {
    const rule = applicableRules(suggestion.kind, specimenTypeIds, rules)[0];
    return { risk: 'low', display: true, holdsSignOut: false, logToQa: true, action: null, rule };
  }
  const outcomes = applicableRules(suggestion.kind, specimenTypeIds, rules).map(r => outcomeFor(suggestion.confidence, r));
  return outcomes.reduce((worst, o) => (SEVERITY(o) > SEVERITY(worst) ? o : worst));
}

// ── Audit ────────────────────────────────────────────────────────────────────

const describe = (r: ClinicalMismatchRule) =>
  `display from ${r.minimumDisplayThreshold}%, ${r.actionType} ${r.actionThreshold === null ? 'from display' : `at ${r.actionThreshold}%`}`;

/** The audit entry for a change to one rule, or null when nothing changed. Literal English. */
export function clinicalMismatchRuleChangeAudit(
  before: ClinicalMismatchRule | null,
  after: ClinicalMismatchRule | null,
  specimenName: string | null,
  actorName: string,
): NewAuditLog | null {
  const rule = after ?? before;
  if (!rule) return null;
  const was = before ? describe(before) : null;
  const now = after ? describe(after) : null;
  if (was === now) return null;
  const scope = `"${rule.category}" for ${rule.specimenTypeId === null ? 'all specimen types' : `specimen type ${specimenName ?? rule.specimenTypeId}`}`;
  const detail = !before ? `Rule ${scope} added: ${now}.`
    : !after ? `Rule ${scope} removed (was ${was}).`
    : `Rule ${scope} changed: ${was} → ${now}.`;
  return { type: 'user', event: 'CLINICAL_MISMATCH_RULE_CHANGED', detail, user: actorName, caseId: null, confidence: null };
}
