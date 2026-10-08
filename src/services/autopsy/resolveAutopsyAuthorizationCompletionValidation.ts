// src/services/autopsy/resolveAutopsyAuthorizationCompletionValidation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own confirmed "no business logic in the
// UI" requirement — the real, pure validation
// AutopsyAuthorizationCompletionForm.tsx only calls and renders.
// Validates exactly the fields resolveAutopsyGrossExaminationGate.ts
// itself requires — never a second, divergent definition of what
// "complete" means.
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyCaseAuthority } from '@/types/autopsy/AutopsyCaseDetails';
import { REPORT_DEFAULT_REQUIREMENTS, autopsyAuthorizationMissing } from '../fieldRequirements/reportPageChecks';
import type { ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';

export interface AutopsyAuthorizationCompletionFormState {
  orderReference: string;
  orderDate: string;
  consentGivenAt: string;
  consentScope: string;
  /** Batch 468 — comma-separated AutopsyOrganCode tokens the NOK's
   *  consent excludes from examination/retention. Optional: an empty
   *  string means no organ-level exclusion. Not a Field Requirement
   *  (unlike consentScope) — scope can be unconstrained. */
  excludedOrgans: string;
  /** Batch 468 — whether the NOK's consent permits retaining tissue/
   *  organs beyond the diagnostic gross exam itself. Defaults true
   *  (unconstrained) in the form. */
  retentionPermitted: boolean;
}

export interface AutopsyAuthorizationCompletionValidationResult {
  valid: boolean;
  /** Field Requirement ids (autopsyOrderReference, autopsyOrderDate, autopsyConsentGivenAt, autopsyConsentScope). */
  missingFieldIds: string[];
}

// Batch 383 (PS-359): the requirements come from the organisation's Field
// Requirements. Their defaults are exactly what this checked before (the
// written order and its date, or the consent time); the consent scope is an
// optional switch.
export function resolveAutopsyAuthorizationCompletionValidation(
  caseAuthority: AutopsyCaseAuthority,
  form: AutopsyAuthorizationCompletionFormState,
  requirements: readonly ResolvedFieldRequirement[] = REPORT_DEFAULT_REQUIREMENTS,
): AutopsyAuthorizationCompletionValidationResult {
  const missingFieldIds = autopsyAuthorizationMissing(caseAuthority, form, requirements);
  return { valid: missingFieldIds.length === 0, missingFieldIds };
}
