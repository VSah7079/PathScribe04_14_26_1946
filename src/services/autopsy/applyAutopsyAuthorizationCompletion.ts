// src/services/autopsy/applyAutopsyAuthorizationCompletion.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own confirmed "no business logic in the
// UI" requirement — the real, pure merge of a real, validated
// authorization-completion form into a real, EXISTING AutopsyCaseDetails
// record (the one built at temporary-accession time). Only ever
// called after resolveAutopsyAuthorizationCompletionValidation.ts
// confirms the real, required fields are present.
//
// Real, deliberate scope: preserves everything already on file (the
// real verbal order, the real consenting relative's name) — this
// only ever fills in the real, previously-missing written
// authorization/consent-grant fields, never overwrites unrelated
// real data already recorded at intake.
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';
import type { AutopsyAuthorizationCompletionFormState } from './resolveAutopsyAuthorizationCompletionValidation';
import { parseAutopsyOrganCodeList } from '@/types/autopsy/AutopsyOrganCode';

export function applyAutopsyAuthorizationCompletion(
  caseDetails: AutopsyCaseDetails,
  form: AutopsyAuthorizationCompletionFormState,
): AutopsyCaseDetails {
  if (caseDetails.caseAuthority === 'statutory_judicial') {
    return {
      ...caseDetails,
      forensicAuthorization: {
        ...(caseDetails.forensicAuthorization ?? { authorityType: '' }),
        orderReference: form.orderReference.trim(),
        orderDate: form.orderDate,
      },
    };
  }

  if (caseDetails.caseAuthority === 'hospital_consented') {
    return {
      ...caseDetails,
      hospitalConsent: {
        ...(caseDetails.hospitalConsent ?? {
          consentingRelativeName: '',
          consentingRelativeRelationship: '',
          status: 'active',
          excludedOrgans: [],
          retentionPermitted: true,
        }),
        consentGivenAt: form.consentGivenAt,
        consentScope: form.consentScope.split(',').map(s => s.trim()).filter(Boolean),
        // Batch 468: the two structured, machine-enforced fields —
        // see resolveAutopsyConsentScopeViolation.ts. A completion form
        // submit never changes `status`: narrowing/revoking consent
        // after the initial grant has no UI yet (pre-existing gap,
        // disclosed — see services/autopsy/README.md).
        excludedOrgans: parseAutopsyOrganCodeList(form.excludedOrgans),
        retentionPermitted: form.retentionPermitted,
      },
    };
  }

  return caseDetails;
}
