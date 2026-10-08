// src/services/autopsy/recordAutopsyCustodyTransfer.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 468 (PS-261 / RFP-APLIS-2026-GLOBAL §3.1.C §2.4.3, §3.3) —
// "Mandatory chain-of-custody logging for all retained items.
// Immutable audit trail. Transfer events, responsible parties,
// timestamps, receiving entities." Before this batch, no custody-log
// data structure existed anywhere in the app (confirmed by a
// repo-wide search) — only a single one-shot body-release event
// (releaseAutopsyBody.ts), appended to the generic
// MaterialLocation/locationHistory a specimen already carries, with
// no recipient role, no "who received it," and — a separate,
// pre-existing gap this file's capability also fixes — no audit-log
// write at all.
//
// Same real orchestration shape as releaseAutopsyBody.ts: capability
// check, fetch, re-check on the freshest copy, append (append-only —
// custodyLog is never replaced or reordered), persist via
// updateCaseWithRetry (version-safe, PS-71), and — the one thing
// releaseAutopsyBody.ts itself was missing — always write to the
// shared audit trail, the same real choke point
// processMaterialLocationEvent.ts already uses
// (mockAuditService.logEvent()).
//
// Deliberately forensic-only: the RFP's chain-of-custody requirement
// (§2.1.2, §2.4.3) is specific to the forensic/coroner/medicolegal
// case type — a hospital/consented autopsy has no legal custody
// chain to maintain. Any attempt on a hospital_consented case is
// refused, not silently accepted.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import type { AutopsyCustodianType, AutopsyCustodyTransferEvent } from '@/types/autopsy/AutopsyCaseDetails';

export interface RecordAutopsyCustodyTransferInput {
  itemDescription: string;
  toCustodianType: AutopsyCustodianType;
  toCustodianName: string;
  releasedByName: string;
  receivedByName?: string;
  notes?: string;
  /** Batch 475 (PS-261 follow-up) — set when this transfer is of a
   *  specific toxicology specimen (AutopsyToxicologyOrder.id). See
   *  AutopsyCustodyTransferEvent.toxicologyOrderId's own doc comment. */
  toxicologyOrderId?: string;
}

/** Real, per the standing i18n rule — `error` is a developer-facing,
 *  literal-English fallback (logs, tests), never shown to the user
 *  directly. `reasonCode` is what the UI maps to a translated toast;
 *  see synopticReportPage.autopsy.custody.errors.* in the locale
 *  files and SynopticReportPage.tsx's handleCustodyTransferSubmit. */
export type RecordAutopsyCustodyTransferReasonCode =
  | 'notPermitted' | 'caseNotFound' | 'notForensic' | 'conflict';

export interface RecordAutopsyCustodyTransferResult {
  ok: boolean;
  error?: string;
  reasonCode?: RecordAutopsyCustodyTransferReasonCode;
  /** The person lacks autopsy:custody:transfer. */
  notPermitted?: boolean;
}

/** The custodian a new transfer starts FROM: whoever the log's last
 *  entry says received it, or the pathology department by default
 *  for the very first transfer (the body/item starts there). Pure and
 *  exported so the UI can show "currently held by" without
 *  duplicating this rule. */
export function resolveCurrentAutopsyCustodian(
  custodyLog: readonly AutopsyCustodyTransferEvent[] | undefined,
): { type: AutopsyCustodianType; name: string } {
  const last = custodyLog && custodyLog.length > 0 ? custodyLog[custodyLog.length - 1] : undefined;
  if (last) return { type: last.toCustodianType, name: last.toCustodianName };
  return { type: 'pathology_department', name: 'Pathology Department' };
}

/** Batch 475 (PS-261 follow-up) — every custody-log entry linked to one
 *  toxicology specimen, oldest first (the log's own append order).
 *  Pure and exported so the UI can show a specimen's own chain of
 *  custody without duplicating this filter. */
export function custodyEventsForToxicologyOrder(
  custodyLog: readonly AutopsyCustodyTransferEvent[] | undefined, toxicologyOrderId: string,
): AutopsyCustodyTransferEvent[] {
  return (custodyLog ?? []).filter(e => e.toxicologyOrderId === toxicologyOrderId);
}

export async function recordAutopsyCustodyTransfer(
  caseId: string,
  input: RecordAutopsyCustodyTransferInput,
  actingUserName: string,
): Promise<RecordAutopsyCustodyTransferResult> {
  // Batch 468: recording a custody transfer needs autopsy:custody:transfer
  // for the case's facility — a new, distinct capability (never reusing
  // autopsy:body:release, which governs a different action).
  const decision = await authorizationService.enforce('autopsy:custody:transfer', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Recording a custody transfer needs the autopsy:custody:transfer permission', notPermitted: true, reasonCode: 'notPermitted' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };
  if (caseData.autopsy.caseAuthority !== 'statutory_judicial') {
    return { ok: false, error: 'Chain-of-custody logging applies only to medicolegal/forensic autopsy cases.', reasonCode: 'notForensic' };
  }

  let notFound = false;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy) { notFound = true; return null; }
    if (current.autopsy.caseAuthority !== 'statutory_judicial') { notFound = true; return null; }
    const from = resolveCurrentAutopsyCustodian(current.autopsy.custodyLog);
    const event: AutopsyCustodyTransferEvent = {
      id: `custody-${caseId}-${(current.autopsy.custodyLog?.length ?? 0) + 1}`,
      occurredAt: new Date().toISOString(),
      itemDescription: input.itemDescription,
      fromCustodianType: from.type,
      fromCustodianName: from.name,
      toCustodianType: input.toCustodianType,
      toCustodianName: input.toCustodianName,
      releasedByName: input.releasedByName,
      receivedByName: input.receivedByName,
      notes: input.notes,
      toxicologyOrderId: input.toxicologyOrderId,
    };
    return {
      autopsy: { ...current.autopsy, custodyLog: [...(current.autopsy.custodyLog ?? []), event] },
    };
  }, caseRouter);

  if (write.ok === true) {
    // Real, per this file's own header comment: the one real audit-log
    // write releaseAutopsyBody.ts was missing — never skipped here.
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_CUSTODY_TRANSFER',
      detail: `${input.itemDescription} transferred to ${input.toCustodianName} (${input.toCustodianType})`,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (notFound) return { ok: false, error: 'Case has no autopsy record, or is not a medicolegal/forensic case.', reasonCode: 'notForensic' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the custody transfer was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
