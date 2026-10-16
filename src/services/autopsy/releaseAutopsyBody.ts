// src/services/autopsy/releaseAutopsyBody.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own confirmed "continue with wiring and
// UI" — the real orchestration this module's own gate
// (resolveAutopsyBodyReleaseGate.ts) and event builder
// (buildAutopsyBodyReleaseLocationEvent.ts) were both deliberately
// kept decoupled from: fetch the real case, re-check the real gate
// server-side (never trust a UI's own earlier check alone — the case
// may have changed since), append the real, built event onto the
// real, target specimen's own locationHistory (per this module's own
// "body is a specimen" architecture), and persist via the real,
// existing caseRouter — never a second, parallel persistence path.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { resolveAutopsyBodyReleaseGate, type AutopsyBodyReleaseBlockReason } from './resolveAutopsyBodyReleaseGate';
import { buildAutopsyBodyReleaseLocationEvent, type AutopsyBodyReleaseDetails } from './buildAutopsyBodyReleaseLocationEvent';
import { resolveCurrentAutopsyCustodian } from './recordAutopsyCustodyTransfer';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import type { AutopsyCustodyTransferEvent } from '@/types/autopsy/AutopsyCaseDetails';

/** Batch 495: a stable code for each failure, so the screen shows
 *  translated text (autopsyBodyRelease.errors.<code>). `error` stays as a
 *  developer-facing English fallback and is never shown directly — same
 *  pattern as recordAutopsyCustodyTransfer.ts's reasonCode. */
export type ReleaseAutopsyBodyReasonCode = 'caseNotFound' | 'noAutopsyRecord' | 'specimenNotFound' | 'conflict';

export interface ReleaseAutopsyBodyResult {
  ok: boolean;
  blockedReasons?: AutopsyBodyReleaseBlockReason[];
  error?: string;
  reasonCode?: ReleaseAutopsyBodyReasonCode;
  /** The person lacks autopsy:body:release (Batch 383). */
  notPermitted?: boolean;
}

export async function releaseAutopsyBody(
  caseId: string,
  specimenId: string,
  releaseDetails: AutopsyBodyReleaseDetails,
): Promise<ReleaseAutopsyBodyResult> {
  // Batch 383: releasing a body needs autopsy:body:release for the case's facility.
  const decision = await authorizationService.enforce('autopsy:body:release', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Releasing an autopsy body needs the autopsy:body:release permission', notPermitted: true };
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'noAutopsyRecord' };

  const gate = resolveAutopsyBodyReleaseGate(caseData.autopsy);
  if (!gate.allowed) return { ok: false, blockedReasons: gate.blockedReasons };

  const targetSpecimen = caseData.specimens.find(s => s.id === specimenId);
  if (!targetSpecimen) return { ok: false, error: 'Specimen not found on this case.', reasonCode: 'specimenNotFound' };

  const releaseEvent = buildAutopsyBodyReleaseLocationEvent(releaseDetails);

  // PS-71 (Batch 458): the release event is appended on the newest copy of
  // the case and saved with its version (updateCaseWithRetry); on a conflict
  // it is re-appended to the newer case, so another person's change (another
  // specimen, a location event) is kept. The gate is re-checked on that
  // newest copy too: a release never lands on a case whose gate closed.
  //
  // Batch 469: for a forensic case, the same write also appends a final
  // custodyLog entry (unifying this release with the custody-transfer log
  // Batch 468 added) — one updateCaseWithRetry call, never a second,
  // separate write against the same case. Not done for a hospital-consented
  // case: custodyLog is only ever real for caseAuthority ===
  // 'statutory_judicial' (AutopsyCaseDetails.ts's own doc comment).
  let blocked: AutopsyBodyReleaseBlockReason[] | undefined;
  let custodyEvent: AutopsyCustodyTransferEvent | undefined;
  const write = await updateCaseWithRetry(caseId, current => {
    blocked = undefined;
    custodyEvent = undefined;
    if (!current.autopsy) return null;
    const g = resolveAutopsyBodyReleaseGate(current.autopsy);
    if (!g.allowed) { blocked = g.blockedReasons; return null; }
    if (!current.specimens.some(s => s.id === specimenId)) return null;
    const specimens = current.specimens.map(s =>
      s.id === specimenId
        ? { ...s, locationHistory: [...(s.locationHistory ?? []), releaseEvent] }
        : s,
    );
    if (current.autopsy.caseAuthority !== 'statutory_judicial') {
      return { specimens };
    }
    const from = resolveCurrentAutopsyCustodian(current.autopsy.custodyLog);
    custodyEvent = {
      id: `custody-${caseId}-${(current.autopsy.custodyLog?.length ?? 0) + 1}`,
      occurredAt: releaseEvent.at,
      itemDescription: 'Body',
      fromCustodianType: from.type,
      fromCustodianName: from.name,
      toCustodianType: releaseDetails.toCustodianType ?? 'funeral_home',
      toCustodianName: releaseDetails.releasedTo,
      releasedByName: releaseDetails.releasedByName,
    };
    return {
      specimens,
      autopsy: { ...current.autopsy, custodyLog: [...(current.autopsy.custodyLog ?? []), custodyEvent] },
    };
  }, caseRouter);
  if (write.ok === true) {
    // Batch 469: the one real audit-log write this file was missing
    // (same choke point recordAutopsyCustodyTransfer.ts already uses).
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_BODY_RELEASED',
      detail: `Body released to ${releaseDetails.releasedTo}`,
      user: releaseDetails.releasedByName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (blocked) return { ok: false, blockedReasons: blocked };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the release was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return write.reason === 'notFound'
    ? { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' }
    : { ok: false, error: 'Specimen not found on this case.', reasonCode: 'specimenNotFound' };
}
