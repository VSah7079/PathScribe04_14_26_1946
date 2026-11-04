// src/services/autopsy/resolveAutopsyGrossExaminationGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per Jira PS-261 / RFP-APLIS-2026-GLOBAL §3.1.C, §2.1
// ("Case-Type Distinction") and §2.5.1 ("consent/authority
// documentation") — automated hard-stops preventing gross examination
// until required legal documents or consent are logged and verified.
// (Earlier revisions of this file cited "RFP §III.2" — that
// sub-section numbering doesn't appear in URB-2026-09, Pete's actual
// requirements text on PS-261; corrected here per the project's
// verify-don't-trust rule.) Mirrors resolveCytologySignOutGate.ts's
// own established { allowed, blockedReasons } shape rather than
// inventing a new one.
//
// Batch 468: HospitalConsentRecord now carries a real, structured
// `status: 'active' | 'narrowed' | 'revoked'` (see
// AutopsyCaseDetails.ts), replacing the old conflated
// `revokedOrNarrowedAt` timestamp this gate used to block on
// regardless of which of the two it actually meant. Only 'revoked'
// hard-blocks here; 'narrowed' consent is allowed through this gate
// and instead constrains what's examined/retained at the
// specimen/retention-tier level — see
// resolveAutopsyConsentScopeViolation.ts.
//
// Batch 479: blockedReasons used to be hardcoded, untranslated
// English sentences — disclosed as a known gap when Batch 478 made
// this gate a real hard stop. Switched to reason codes, mirroring
// resolveCytologySignOutGate.ts's own CytologySignOutBlockReason
// pattern, so callers translate via
// t('autopsySignOut.blockedReasons.<code>') instead of displaying
// raw English. The audit trail (AutopsyGateOverrideEvent.blockedReasons,
// written by signAutopsyReport.ts) stores these same codes — audit
// `detail` text stays literal English per CLAUDE.md, but the codes
// themselves are a stable, compact record, not prose.
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

export type AutopsyGrossExaminationBlockReason =
  | 'missing_judicial_authorization'
  | 'missing_hospital_consent'
  | 'consent_revoked';

export interface AutopsyGrossExaminationGateResult {
  allowed: boolean;
  blockedReasons: AutopsyGrossExaminationBlockReason[];
}

export function resolveAutopsyGrossExaminationGate(
  caseDetails: AutopsyCaseDetails,
): AutopsyGrossExaminationGateResult {
  const blockedReasons: AutopsyGrossExaminationBlockReason[] = [];

  // 1. Medicolegal/Forensic path — real, per RFP §III.2: "Formal
  //    judicial requisition, court order, or Coroner/Fiscal/
  //    Prosecutor direction." A real order REFERENCE (never just a
  //    free-text justification standing in for one — see
  //    ForensicAuthorization's own doc comment) and a real order
  //    DATE are both required; either missing means no real,
  //    verifiable legal mandate is on record yet.
  if (caseDetails.caseAuthority === 'statutory_judicial') {
    const auth = caseDetails.forensicAuthorization;
    const hasValidOrderRef = Boolean(auth?.orderReference && auth.orderReference.trim().length > 0);
    const hasValidOrderDate = Boolean(auth?.orderDate);
    if (!auth || !hasValidOrderRef || !hasValidOrderDate) {
      blockedReasons.push('missing_judicial_authorization');
    }
  }

  // 2. Hospital-consented path — real, per PS-261 §2.5.1: "consent/
  //    authority documentation." A real consentGivenAt timestamp is
  //    required; a real status of 'revoked' hard-blocks. 'narrowed'
  //    is allowed through — its organ/retention constraints are
  //    enforced elsewhere (resolveAutopsyConsentScopeViolation.ts),
  //    not here.
  if (caseDetails.caseAuthority === 'hospital_consented') {
    const consent = caseDetails.hospitalConsent;
    if (!consent || !consent.consentGivenAt) {
      blockedReasons.push('missing_hospital_consent');
    } else if (consent.status === 'revoked') {
      blockedReasons.push('consent_revoked');
    }
  }

  return {
    allowed: blockedReasons.length === 0,
    blockedReasons,
  };
}
