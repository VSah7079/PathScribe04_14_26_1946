// src/services/clinical/clinicalMismatchRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 529 (PS-554): the mismatch risk rules, kept as system configuration
// (Configuration → System → Clinical Mismatch Rules). Rules are in
// clinicalMismatchRules.ts.
//
//   list()           needs config:clinical-mismatch-rules:view (Pathologist,
//                    QA Reviewer and Lab Director by default, so a pathologist
//                    can see why a case was held);
//   save() / remove() need config:clinical-mismatch-rules:manage (no built-in
//                    role: each hospital grants it to its own role). Each
//                    change is audited (CLINICAL_MISMATCH_RULE_CHANGED);
//   rulesForCheck()  the rules the mismatch check applies. A system read, not
//                    a person's: the check runs for whoever signs out.
//
// In production the API server holds the rules and makes the same checks
// (docs/architecture/AUTHORIZATION_API.md). Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import {
  clinicalMismatchRuleChangeAudit, clinicalMismatchRuleProblem, clinicalMismatchRuleRemovalProblem,
  sortRules, withDefaultRules, type ClinicalMismatchRule, type ClinicalMismatchRuleProblem,
} from './clinicalMismatchRules';

export const CLINICAL_MISMATCH_RULES_VIEW = 'config:clinical-mismatch-rules:view';
export const CLINICAL_MISMATCH_RULES_MANAGE = 'config:clinical-mismatch-rules:manage';
export const CLINICAL_MISMATCH_RULES_STORAGE_KEY = 'pathscribe_clinical_mismatch_rules';
/** Batch 609 (#31): whether a Block rule holds the release of an amendment, correction or addendum. */
export const CLINICAL_MISMATCH_REVISION_HOLD_STORAGE_KEY = 'pathscribe_clinical_mismatch_revision_hold';

export type ClinicalMismatchRuleError = 'CONFIG_NOT_PERMITTED' | 'NOT_FOUND' | ClinicalMismatchRuleProblem;

export interface IClinicalMismatchRuleService {
  list(): Promise<ServiceResult<ClinicalMismatchRule[]>>;
  /** Adds the rule, or replaces the one with its id. */
  save(rule: ClinicalMismatchRule): Promise<ServiceResult<ClinicalMismatchRule[]>>;
  remove(ruleId: string): Promise<ServiceResult<ClinicalMismatchRule[]>>;
  rulesForCheck(): Promise<ClinicalMismatchRule[]>;
  /**
   * Batch 609 (#31): the setting for amendments, corrections and addenda. On
   * (the default), a high-risk mismatch (a Block rule reached) holds the
   * release until the pathologist decides, as at first sign-out. Off, the
   * report alert is still shown and the mismatch is logged to the QA
   * dashboard, but the release is not held. A system read, like rulesForCheck.
   */
  revisionHoldsRelease(): Promise<boolean>;
  /** Needs config:clinical-mismatch-rules:manage; audited (CLINICAL_MISMATCH_RULE_CHANGED). */
  saveRevisionHoldsRelease(holds: boolean): Promise<ServiceResult<boolean>>;
}

export interface ClinicalMismatchRuleDeps {
  read(): ClinicalMismatchRule[] | null;
  write(rules: ClinicalMismatchRule[]): void;
  /** Batch 609: the amendment setting; absent or null means the default (holds). */
  readRevisionHold?(): boolean | null;
  writeRevisionHold?(holds: boolean): void;
  enforce(capability: string): Promise<{ allowed: boolean }>;
  audit(entry: NewAuditLog): Promise<unknown>;
  actorName(): string;
  /** The Specimen Dictionary entry's name, for the audit entry. */
  specimenName(id: string): Promise<string | null>;
  /** Tells the Configuration page about a refusal (names the permission). */
  refused?(capability: string): void;
}

const fail = <T>(error: ClinicalMismatchRuleError): ServiceResult<T> => ({ ok: false, error });

export function createClinicalMismatchRuleService(deps: ClinicalMismatchRuleDeps): IClinicalMismatchRuleService {
  const current = () => withDefaultRules(deps.read());
  const permitted = (decision: { allowed: boolean }, capability: string) => {
    if (!decision.allowed) deps.refused?.(capability);
    return decision.allowed;
  };
  const audit = async (before: ClinicalMismatchRule | null, after: ClinicalMismatchRule | null) => {
    const rule = after ?? before!;
    const name = rule.specimenTypeId ? await deps.specimenName(rule.specimenTypeId).catch(() => null) : null;
    const entry = clinicalMismatchRuleChangeAudit(before, after, name, deps.actorName());
    if (entry) await deps.audit(entry).catch(() => {});
  };

  return {
    async list() {
      if (!permitted(await deps.enforce('config:clinical-mismatch-rules:view'), CLINICAL_MISMATCH_RULES_VIEW)) return fail('CONFIG_NOT_PERMITTED');
      return { ok: true, data: current() };
    },
    async save(rule) {
      if (!permitted(await deps.enforce('config:clinical-mismatch-rules:manage'), CLINICAL_MISMATCH_RULES_MANAGE)) return fail('CONFIG_NOT_PERMITTED');
      const rules = current();
      const problem = clinicalMismatchRuleProblem(rule, rules);
      if (problem) return fail(problem);
      const before = rules.find(r => r.id === rule.id) ?? null;
      // The rule for all specimen types of a kind keeps its scope.
      if (before && (before.category !== rule.category || before.specimenTypeId !== rule.specimenTypeId)) return fail('duplicate');
      const next = sortRules([...rules.filter(r => r.id !== rule.id), { ...rule }]);
      deps.write(next);
      await audit(before, rule);
      return { ok: true, data: next };
    },
    async remove(ruleId) {
      if (!permitted(await deps.enforce('config:clinical-mismatch-rules:manage'), CLINICAL_MISMATCH_RULES_MANAGE)) return fail('CONFIG_NOT_PERMITTED');
      const rules = current();
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) return fail('NOT_FOUND');
      const problem = clinicalMismatchRuleRemovalProblem(rule);
      if (problem) return fail(problem);
      const next = rules.filter(r => r.id !== ruleId);
      deps.write(next);
      await audit(rule, null);
      return { ok: true, data: next };
    },
    async rulesForCheck() { return current(); },
    async revisionHoldsRelease() { return deps.readRevisionHold?.() ?? true; },
    async saveRevisionHoldsRelease(holds) {
      if (!permitted(await deps.enforce('config:clinical-mismatch-rules:manage'), CLINICAL_MISMATCH_RULES_MANAGE)) return fail('CONFIG_NOT_PERMITTED');
      const before = deps.readRevisionHold?.() ?? true;
      deps.writeRevisionHold?.(holds);
      if (before !== holds) {
        await deps.audit({
          type: 'user', event: 'CLINICAL_MISMATCH_RULE_CHANGED', user: deps.actorName(), caseId: null, confidence: null,
          detail: `Clinical mismatch check for amendments, corrections and addenda: a high-risk mismatch ${before ? 'holds' : 'does not hold'} the release → ${holds ? 'holds' : 'does not hold'} the release.`,
        }).catch(() => {});
      }
      return { ok: true, data: holds };
    },
  };
}
