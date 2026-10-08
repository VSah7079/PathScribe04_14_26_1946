// src/services/autopsy/orderAutopsyToxicology.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 469 (PS-261 §2.3) — "Toxicology ordering, specimen tracking,
// and result integration." Genuinely greenfield before this batch:
// no toxicology type, service or UI existed anywhere (confirmed by a
// repo-wide search).
//
// Deliberately NOT built on services/molecularOrders/'s send-out
// engine: that engine's whole shape (plate assignment, referral-batch
// dispatch/result matching by order id, StainOrder/Specimen-bound
// results hydrated into a bound synoptic field) exists to handle
// molecular ASSAYS on surgical-pathology blocks at real volume, with
// a seeded reference-lab Facility roster (services/facilities/
// referenceLabSeeds.ts) built for genomics/molecular send-outs.
// Postmortem toxicology is a rare, autopsy-only order with no
// existing lab roster to route to and no synoptic field to hydrate a
// result into — so this is a smaller, self-contained, append-only
// order list on the case's own autopsy record, with a free-text lab
// name and result summary, same honestly-bounded choice Batch 468
// made for the custody log rather than reusing an ill-fitting engine.
//
// Placing an order sets the case's ancillaryHold active (the field's
// own doc comment on AncillaryHoldState already names toxicology as
// an intended reason) — recordAutopsyToxicologyResult.ts clears it.
// Only one ancillary hold exists per case today (a single
// AncillaryHoldState, not a list): ordering toxicology on a case
// already on hold for another reason (e.g. fixed-brain neuropathology)
// overwrites that hold's reason/startedAt. Disclosed, not solved here
// — see services/autopsy/README.md.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '@/services/cases/CaseRouter';
import { updateCaseWithRetry } from '@/services/cases/caseWrite';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import type { AutopsyToxicologyOrder } from '@/types/autopsy/AutopsyCaseDetails';

export interface OrderAutopsyToxicologyInput {
  specimenDescription: string;
  /** Batch 475 (PS-261 follow-up) — see AutopsyToxicologyOrder's own
   *  doc comment. Required, non-empty. */
  specimenBarcode: string;
  analytesRequested: string;
  labName: string;
}

export type OrderAutopsyToxicologyReasonCode = 'notPermitted' | 'caseNotFound' | 'missingBarcode' | 'conflict';

export interface OrderAutopsyToxicologyResult {
  ok: boolean;
  error?: string;
  reasonCode?: OrderAutopsyToxicologyReasonCode;
  notPermitted?: boolean;
}

export async function orderAutopsyToxicology(
  caseId: string,
  input: OrderAutopsyToxicologyInput,
  actingUserName: string,
): Promise<OrderAutopsyToxicologyResult> {
  const decision = await authorizationService.enforce('autopsy:toxicology:order', { caseId });
  if (!decision.allowed) return { ok: false, error: 'Ordering toxicology needs the autopsy:toxicology:order permission', notPermitted: true, reasonCode: 'notPermitted' };

  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
  if (!caseData.autopsy) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };
  if (!input.specimenBarcode.trim()) return { ok: false, error: 'A specimen barcode is required to order toxicology.', reasonCode: 'missingBarcode' };

  let notFound = false;
  const write = await updateCaseWithRetry(caseId, current => {
    if (!current.autopsy) { notFound = true; return null; }
    const order: AutopsyToxicologyOrder = {
      id: `tox-${caseId}-${(current.autopsy.toxicologyOrders?.length ?? 0) + 1}`,
      orderedAt: new Date().toISOString(),
      orderedByName: actingUserName,
      specimenDescription: input.specimenDescription,
      specimenBarcode: input.specimenBarcode,
      analytesRequested: input.analytesRequested,
      labName: input.labName,
      status: 'ordered',
    };
    return {
      autopsy: {
        ...current.autopsy,
        toxicologyOrders: [...(current.autopsy.toxicologyOrders ?? []), order],
        ancillaryHold: { active: true, reason: `Toxicology pending (${input.labName})`, startedAt: order.orderedAt },
      },
    };
  }, caseRouter);

  if (write.ok === true) {
    mockAuditService.logEvent({
      type: 'system',
      event: 'AUTOPSY_TOXICOLOGY_ORDERED',
      detail: `${input.analytesRequested} ordered from ${input.labName}`,
      user: actingUserName,
      caseId,
      confidence: null,
    }).catch(() => {});
    return { ok: true };
  }
  if (notFound) return { ok: false, error: 'Case has no autopsy record.', reasonCode: 'caseNotFound' };
  if (write.reason === 'conflict') return { ok: false, error: 'The case changed while the toxicology order was being saved; reopen it and try again.', reasonCode: 'conflict' };
  return { ok: false, error: 'Case not found.', reasonCode: 'caseNotFound' };
}
