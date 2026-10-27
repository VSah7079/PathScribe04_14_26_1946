// src/services/abnormalDetection/resolveFindingCoding.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 623 (PS-130): which code(s) a matched abnormal-result rule attaches to its finding.
//   1. The rule's own real codes (licensedCoding), but only those whose code system has a
//      licence that is on and unexpired (terminologyLicence/).
//   2. Otherwise the rule's own test codes, else the severity's default test codes
//      (resolveSyntheticCoding.ts). Test codes carry "TEST-" inside the code string itself,
//      so they can never be mistaken for a real code.
// A rule with a real SNOMED CT code but no ICD-O-3 licence therefore gets the SNOMED CT code
// only; it never mixes a real code with a test code for the same system.
// ─────────────────────────────────────────────────────────────────────────────

import type { LicensedTerminologySystem } from '@app-types/config/EnterpriseConfig';
import { LICENCE_FOR_CODE_SYSTEM } from '../terminologyLicence/terminologyLicence';
import type { AbnormalSeverity, AbnormalTriggerRule, CodingTerm } from './IAbnormalTriggerRuleService';
import { resolveSyntheticCoding } from './resolveSyntheticCoding';

export function resolveFindingCoding(
  rule: Pick<AbnormalTriggerRule, 'licensedCoding' | 'syntheticCoding'>,
  severity: AbnormalSeverity,
  activeLicences: readonly LicensedTerminologySystem[] = [],
): CodingTerm[] {
  const licensed = (rule.licensedCoding ?? []).filter(term => activeLicences.includes(LICENCE_FOR_CODE_SYSTEM[term.system]));
  if (licensed.length > 0) return licensed;
  return rule.syntheticCoding ?? resolveSyntheticCoding(severity);
}
