// src/services/autopsy/recordAutopsyOrganRetentionTier.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 499: the organ-retention tier (and its optional reason) is saved
// here. Before this, the report page's handleOrganRetentionTierChange wrote
// it straight to the case with no permission check — disclosed as open since
// Batch 472. Standing rule 7: a protected action checks its capability in the
// service that does the work.
//
// Same orchestration as recordAutopsyOrganRetentionDetail.ts: capability
// check, fetch, re-check on the freshest copy, persist via
// updateCaseWithRetry (version-safe, PS-71), audit-log write.
//
// Rules carried over from the page:
//   • only where retention tracking applies (resolveHtaApplicability: UK
//     HTA 2004/2006, NZ Coroners Act 2006);
//   • a hospital-consented case's tier can never exceed what the NOK
//     consent on file permits (resolveRetentionTierConsentCheck, Batch 468).
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { resolveHtaApplicability } from './resolveHtaApplicability';
import { resolveRetentionTierConsentCheck } from './resolveAutopsyConsentScopeViolation';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

export type OrganRetentionTierValue = AutopsyCaseDetails['organRetentionTier'];

export type RecordAutopsyOrganRetentionTierReasonCode =
  | 'notPermitted' | 'caseNotFound' | 'notApplicable' | 'consentRevoked' | 'retentionNotPermitted' | 'conflict';

export interface RecordAutopsyOrganRetentionTierResult {
  ok: boolean;
  error?: string;
  reasonCode?: RecordAutopsyOrganRetentionTierReasonCode;
  notPermitted?: boolean;
  /** The autopsy details as saved, on success. */
  autopsy?: AutopsyCaseDetails;
}

/** Why this tier can't be set on these details, or null when it can (pure). */
export function organRetentionTierRefusal(details: AutopsyCaseDetails, tier: OrganRetentionTierValue): 'notApplicable' | 'consentRevoked' | 'retentionNotPermitted' | null {
  if (!resolveHtaApplicability(details.jurisdiction)) return 'notApplicable';
  if (details.caseAuthority === 'hospital_consented') {
    const check = resolveRetentionTierConsentCheck(details.hospitalConsent, tier);
    if (!check.allowed) return check.refusal ?? 'retentionNotPermitted';
  }
  return null;
}

const MESSAGES: Record<RecordAutopsyOrganRetentionTierReasonCode, string> = {
  notPermitted: 'Recording the organ retention tier needs the autopsy:retention-tier:record permission',
  caseNotFound: 'Case not found.',
  notApplicable: 'Organ retention tracking does not apply to this case’s jurisdiction.',
  consentRevoked: 'Consent has been revoked; no retention can be recorded.',
  retentionNotPermitted: 'The consent on file does not permit retention.',
  conflict: 'The case changed while the retention tier was being saved; reopen it and try again.',
};
const refuse = (reasonCode: RecordAutopsyOrganRetentionTierReasonCode): RecordAutopsyOrganRetentionTierResult =>
  ({ ok: false, error: MESSAGES[reasonCode], reasonCode, ...(reasonCode === 'notPermitted' ? { notPermitted: true } : {}) });

/**
 * Saves the tier and its reason. `reason` undefined keeps the reason already on file;
 * an empty string clears it.
 */
export async function recordAutopsyOrganRetentionTier(
  caseId: string,
  tier: OrganRetentionTierValue,
  reason: string | undefined,
  actingUserName: string,
): Promise<RecordAutopsyOrganRetentionTierResult> {
  const decision = await authorizationService.enforce('autopsy:retention-tier:record', { caseId });
  if (!decision.allowed) return refuse('notPermitted');

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData?.autopsy) return refuse('caseNotFound');
  const first = organRetentionTierRefusal(caseData.autopsy, tier);
  if (first) return refuse(first);

  let refusal = null as RecordAutopsyOrganRetentionTierReasonCode | null;
  let saved = undefined as AutopsyCaseDetails | undefined;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy) { refusal = 'caseNotFound'; return null; }
    const r = organRetentionTierRefusal(current.autopsy, tier);
    if (r) { refusal = r; return null; }
    const nextReason = reason !== undefined ? reason : current.autopsy.organRetentionTierReason;
    saved = { ...current.autopsy, organRetentionTier: tier, organRetentionTierReason: nextReason || undefined };
    return { autopsy: saved };
  }, caseRouter);

  if (write.ok === true) {
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_ORGAN_RETENTION_TIER_RECORDED',
      detail: `${tier ?? 'not recorded'}${saved?.organRetentionTierReason ? ` — ${saved.organRetentionTierReason}` : ''}`,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true, autopsy: saved };
  }
  if (refusal) return refuse(refusal);
  if (write.reason === 'conflict') return refuse('conflict');
  return refuse('caseNotFound');
}
