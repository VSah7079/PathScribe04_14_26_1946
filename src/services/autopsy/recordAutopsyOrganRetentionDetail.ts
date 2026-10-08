// src/services/autopsy/recordAutopsyOrganRetentionDetail.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 471 (PS-261 follow-up) — the write site OrganRetentionRecord
// itself had been waiting on: Batch 469 built disposal recording
// (recordAutopsyOrganRetentionDisposal.ts) but nothing recorded who
// actually holds retained organs/tissue, or where, while retention is
// ongoing — `organRetentionTier` was a bare tier selection with no
// recipient or location naming what it actually means in practice.
// Flagged in services/autopsy/README.md's own "Real, deliberate scope
// not yet built" section after Batch 469.
//
// Same orchestration shape as recordAutopsyOrganRetentionDisposal.ts:
// capability check, fetch, re-check on the freshest copy, persist via
// updateCaseWithRetry (version-safe, PS-71), real audit-log write.
//
// Same gate as the disposal write site and the tier control itself:
// resolveHtaApplicability.ts (only UK HTA 2004/2006, NZ Coroners Act
// 2006), and only once a tier beyond 'tier_0_no_retention' is on file
// — recording where nothing is retained isn't a real event.
//
// Deliberately a single current record, not an append-only log (same
// honest bound OrganRetentionRecord's own doc comment names): each
// call overwrites the last, with its own audit entry. A real custody
// chain for retained material moving between locations over time is a
// further, separate extension, not attempted here.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { resolveHtaApplicability } from './resolveHtaApplicability';
import type { OrganRetentionRecord } from '@/types/autopsy/AutopsyCaseDetails';

export interface RecordAutopsyOrganRetentionDetailInput {
  recipientName: string;
  location: string;
  reason?: string;
}

export type RecordAutopsyOrganRetentionDetailReasonCode =
  | 'notPermitted' | 'caseNotFound' | 'notApplicable' | 'noRetention' | 'conflict';

export interface RecordAutopsyOrganRetentionDetailResult {
  ok: boolean;
  error?: string;
  reasonCode?: RecordAutopsyOrganRetentionDetailReasonCode;
  notPermitted?: boolean;
}

export async function recordAutopsyOrganRetentionDetail(
  caseId: string,
  input: RecordAutopsyOrganRetentionDetailInput,
  actingUserName: string,
): Promise<RecordAutopsyOrganRetentionDetailResult> {
  const decision = await authorizationService.enforce('autopsy:retention-detail:record', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Recording organ retention detail needs the autopsy:retention-detail:record permission', notPermitted: true, reasonCode: 'notPermitted' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };
  if (!resolveHtaApplicability(caseData.autopsy.jurisdiction)) {
    return { ok: false, error: 'Organ retention tracking does not apply to this case’s jurisdiction.', reasonCode: 'notApplicable' };
  }
  const tier = caseData.autopsy.organRetentionTier;
  if (!tier || tier === 'tier_0_no_retention') {
    return { ok: false, error: 'No organ retention is on record for this case to detail.', reasonCode: 'noRetention' };
  }

  const record: OrganRetentionRecord = {
    recipientName: input.recipientName,
    location: input.location,
    reason: input.reason,
    recordedAt: new Date().toISOString(),
    recordedByName: actingUserName,
  };

  let notEligible = false;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy) { notEligible = true; return null; }
    if (!resolveHtaApplicability(current.autopsy.jurisdiction)) { notEligible = true; return null; }
    const t = current.autopsy.organRetentionTier;
    if (!t || t === 'tier_0_no_retention') { notEligible = true; return null; }
    return { autopsy: { ...current.autopsy, organRetentionDetail: record } };
  }, caseRouter);

  if (write.ok === true) {
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_ORGAN_RETENTION_DETAIL_RECORDED',
      detail: `${input.recipientName} — ${input.location}`,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (notEligible) return { ok: false, error: 'No organ retention is on record for this case to detail.', reasonCode: 'noRetention' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the retention detail was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
