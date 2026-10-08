// src/services/autopsy/recordAutopsyOrganTag.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 478 (PS-261 follow-up; Pete's own scoping decision via
// AskUserQuestion) — "per-organ tagging on gross-exam findings," flagged
// as open/unscoped in services/autopsy/README.md after Batch 472. Pete's
// decision: a separate, case-level organ-tag log (AutopsyOrganTag[] on
// AutopsyCaseDetails), not an extension of the shared grossing-template
// engine (EditorField has no per-field organ association today — only
// whole sections are organ-derived, via AUTOPSY_ORGAN_TO_SECTION — and
// giving every protocol's template engine an organ concept it doesn't
// need would be a far bigger, cross-cutting change than this module's
// own data model warrants).
//
// Same orchestration shape as every other autopsy write site in this
// folder (recordAutopsyCustodyTransfer.ts, recordAutopsyOrganRetentionDetail.ts):
// capability check, fetch, re-check on the freshest copy, append-only
// persist via updateCaseWithRetry (version-safe, PS-71), real audit-log
// write.
//
// Deliberately uses the existing 31-code AutopsyOrganCode vocabulary
// (Pete's own earlier, locked-in scoping decision: use it now, map to
// SNOMED later pending PS-343 licensing) — never a second, parallel
// organ vocabulary for tagging alone.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import type { AutopsyOrganCode } from '@/types/autopsy/AutopsyOrganCode';
import type { AutopsyOrganTag, AutopsyOrganTagStatus } from '@/types/autopsy/AutopsyCaseDetails';

export interface RecordAutopsyOrganTagInput {
  organCode: AutopsyOrganCode;
  status: AutopsyOrganTagStatus;
  finding?: string;
}

export type RecordAutopsyOrganTagReasonCode = 'notPermitted' | 'caseNotFound' | 'conflict';

export interface RecordAutopsyOrganTagResult {
  ok: boolean;
  error?: string;
  reasonCode?: RecordAutopsyOrganTagReasonCode;
  notPermitted?: boolean;
}

/** Every tag recorded for one organ, oldest first (the log's own append
 *  order) — the organ's own real history, the same real finding may be
 *  corrected or re-examined more than once before sign-out. Pure and
 *  exported so the UI can show an organ's own tag history without
 *  duplicating this filter (mirrors custodyEventsForToxicologyOrder's
 *  own established pattern). */
export function organTagsForOrgan(
  organTags: readonly AutopsyOrganTag[] | undefined, organCode: AutopsyOrganCode,
): AutopsyOrganTag[] {
  return (organTags ?? []).filter(t => t.organCode === organCode);
}

export async function recordAutopsyOrganTag(
  caseId: string,
  input: RecordAutopsyOrganTagInput,
  actingUserName: string,
): Promise<RecordAutopsyOrganTagResult> {
  // Batch 478: recording a per-organ finding needs autopsy:organ-tag:record
  // — its own capability, seeded to the roles that gross (GROSSERS), never
  // reusing a consent/custody/retention capability that governs a
  // different, higher-stakes class of action.
  const decision = await authorizationService.enforce('autopsy:organ-tag:record', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Recording an organ tag needs the autopsy:organ-tag:record permission', notPermitted: true, reasonCode: 'notPermitted' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };

  let notFound = false;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy) { notFound = true; return null; }
    const tag: AutopsyOrganTag = {
      id: `organ-tag-${caseId}-${(current.autopsy.organTags?.length ?? 0) + 1}`,
      organCode: input.organCode,
      status: input.status,
      finding: input.finding,
      recordedAt: new Date().toISOString(),
      recordedByName: actingUserName,
    };
    return { autopsy: { ...current.autopsy, organTags: [...(current.autopsy.organTags ?? []), tag] } };
  }, caseRouter);

  if (write.ok === true) {
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_ORGAN_TAG_RECORDED',
      detail: `${input.organCode}: ${input.status}${input.finding ? ` — ${input.finding}` : ''}`,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (notFound) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the organ tag was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
