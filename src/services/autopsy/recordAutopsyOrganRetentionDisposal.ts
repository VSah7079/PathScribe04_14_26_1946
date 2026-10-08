// src/services/autopsy/recordAutopsyOrganRetentionDisposal.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 469 (PS-261 §2.4.2) — the real write site
// OrganRetentionDisposalRecord never had (confirmed by a repo-wide
// search: the type existed since the module's first phase, with zero
// callers). Same orchestration shape as recordAutopsyCustodyTransfer.ts
// and recordAutopsyConsentStatusChange.ts: capability check, fetch,
// re-check on the freshest copy, persist via updateCaseWithRetry
// (version-safe, PS-71), real audit-log write.
//
// Gated the same way the retention TIER control itself already is
// (resolveHtaApplicability.ts) — only meaningful for an HTA-governed
// jurisdiction — and only once a tier beyond "no retention" is on
// file: disposing of something never retained isn't a real event.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { resolveHtaApplicability } from './resolveHtaApplicability';
import type { OrganRetentionDisposalRecord } from '@/types/autopsy/AutopsyCaseDetails';

export interface RecordAutopsyOrganRetentionDisposalInput {
  disposalMethod: OrganRetentionDisposalRecord['disposalMethod'];
  certificateReference: string;
  disposalTimestamp?: string;
}

export type RecordAutopsyOrganRetentionDisposalReasonCode =
  | 'notPermitted' | 'caseNotFound' | 'notApplicable' | 'noRetention' | 'conflict';

export interface RecordAutopsyOrganRetentionDisposalResult {
  ok: boolean;
  error?: string;
  reasonCode?: RecordAutopsyOrganRetentionDisposalReasonCode;
  notPermitted?: boolean;
}

export async function recordAutopsyOrganRetentionDisposal(
  caseId: string,
  input: RecordAutopsyOrganRetentionDisposalInput,
  actingUserName: string,
): Promise<RecordAutopsyOrganRetentionDisposalResult> {
  const decision = await authorizationService.enforce('autopsy:retention-disposal:record', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Recording organ retention disposal needs the autopsy:retention-disposal:record permission', notPermitted: true, reasonCode: 'notPermitted' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };
  if (!resolveHtaApplicability(caseData.autopsy.jurisdiction)) {
    return { ok: false, error: 'Organ retention tracking does not apply to this case’s jurisdiction.', reasonCode: 'notApplicable' };
  }
  const tier = caseData.autopsy.organRetentionTier;
  if (!tier || tier === 'tier_0_no_retention') {
    return { ok: false, error: 'No organ retention is on record for this case to dispose of.', reasonCode: 'noRetention' };
  }

  const record: OrganRetentionDisposalRecord = {
    disposalMethod: input.disposalMethod,
    disposalTimestamp: input.disposalTimestamp ?? new Date().toISOString(),
    certificateReference: input.certificateReference,
    recordedByName: actingUserName,
  };

  let notEligible = false;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy) { notEligible = true; return null; }
    if (!resolveHtaApplicability(current.autopsy.jurisdiction)) { notEligible = true; return null; }
    const t = current.autopsy.organRetentionTier;
    if (!t || t === 'tier_0_no_retention') { notEligible = true; return null; }
    return { autopsy: { ...current.autopsy, organRetentionDisposal: record } };
  }, caseRouter);

  if (write.ok === true) {
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_ORGAN_RETENTION_DISPOSAL_RECORDED',
      detail: `${input.disposalMethod} (certificate ${input.certificateReference})`,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (notEligible) return { ok: false, error: 'No organ retention is on record for this case to dispose of.', reasonCode: 'noRetention' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the disposal record was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
