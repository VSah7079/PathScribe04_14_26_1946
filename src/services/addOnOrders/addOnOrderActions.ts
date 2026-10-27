// src/services/addOnOrders/addOnOrderActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 403 (PS-287 / PS-359). The Add-On Orders page's actions, moved out of
// its hook so each is checked where the work is done:
//   - placing an order                      add-on:order:place
//   - approving destructive cutting         add-on:exception:approve-destructive-cut
//   - cancelling, or modifying and resubmitting, an order after an exception
//                                           add-on:order:place
//   - a tech flagging a block exception     add-on:exception:flag          (Batch 669, ws-19)
//   - a tech marking a block retrieved      add-on:block:mark-retrieved    (Batch 669, ws-19)
// Pete: "Both, all 3 roles" (Pathologist, Fellow, Resident). Each also checks
// the organisation's Field Requirements (page "addOnOrder",
// fieldRequirements/addOnOrderChecks.ts); a molecular or send-out line always
// names its reference lab (Pete: an unrouted send-out leaves blind spots in
// the courier and tracking logs).
//
// Fixed here: placing orders on two blocks of the same specimen started each
// block from the case as first loaded, so the second save dropped the first
// block's new orders. Blocks now build on each other before one save.
//
// The pathologist's notification email is a transport message, in English,
// like every other email PathScribe sends today.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, StainOrder } from '@/types/case/Specimen';
import type { BlockExceptionReason } from '@/types/case/AddOnOrder';
import type { MolecularOrderIngest } from '../molecularOrders/molecularOrderTypes';
import { molecularRoutingChoices } from '../molecularOrders/molecularRouting';
import type { ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';
import { addOnSubmitMissing, addOnExceptionMissing, addOnResponseMissing } from '../fieldRequirements/addOnOrderChecks';
import {
  createAddOnOrder, stampPerformingLab, flagBlockExhaustion, resolvePathologistException, markBlockRetrieved,
  type AddOnOrderLineInput, type AddOnOrderSubmissionInput, type AddOnOrderErrorCode,
} from '@/utils/addOnOrderOperations';

export const ADD_ON_ORDER_PLACE_CAPABILITY = 'add-on:order:place';
export const ADD_ON_DESTRUCTIVE_CUT_CAPABILITY = 'add-on:exception:approve-destructive-cut';
export const ADD_ON_FLAG_EXCEPTION_CAPABILITY = 'add-on:exception:flag';
export const ADD_ON_MARK_RETRIEVED_CAPABILITY = 'add-on:block:mark-retrieved';

export type AddOnExceptionResponse = 'approve_destructive_cut' | 'cancel' | 'modify';

export interface AddOnOrderActionDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  /** Saves the case's changed specimens (one write). */
  saveSpecimens: (caseData: Case, specimens: Specimen[]) => Promise<void>;
  /** Batch 467: hands the order's molecular lines to the molecular order engine (services/molecularOrders/). */
  ingestMolecularOrders?: (requests: MolecularOrderIngest[]) => Promise<{ refused: readonly unknown[] }>;
}

export interface AddOnNotifyDeps {
  getUserEmail: (userId: string) => Promise<string | undefined>;
  /** Batch 669 (ws-3): where the notice goes when no ordering pathologist can be e-mailed: the Supervisor / Accessioning
   *  Desk addresses for this case, and the name of the case's primary pathologist when known (see blockExceptionRouting.ts). */
  getDeskRecipients?: (caseData: Case) => Promise<{ emails: string[]; primaryPathologistName?: string }>;
  sendEmail: (message: { to: string[]; subject: string; bodyText: string; bodyHtml: string; metadata: Record<string, string> }) => Promise<unknown>;
}

/** One flat shape: this project's tsconfig doesn't narrow unions reliably. */
export interface AddOnActionResult {
  ok: boolean;
  /** Batch 669: the change was not saved ('conflict': someone else changed the case; 'notApplied': the save failed). The screen says "Not saved" and reloads the case. */
  notSaved?: 'conflict' | 'notApplied';
  notPermitted?: boolean;
  /** Field Requirements still unmet (field ids). */
  missing?: string[];
  /** Blocks refused, with why (for `addOnOrder.errors.<code>`). */
  refused?: { block: string; code: AddOnOrderErrorCode }[];
  /** Something else stopped it (the order moved, or the exception was already answered). */
  failed?: boolean;
  /** Batch 467: molecular tests chosen to run in-house that this case's performing lab doesn't run in-house (names). */
  inHouseNotAvailable?: string[];
  /** Batch 467: the order was placed, but this many of its molecular orders didn't reach the Order Queue. */
  molecularNotQueued?: number;
  /** The case's specimens after the change, for the page to show. */
  specimens?: Specimen[];
  /** Batch 669 (ws-3): a flagged exception was saved, and the notice went to the Supervisor / Accessioning Desk because no ordering pathologist could be e-mailed. */
  noticeToDesk?: boolean;
  /** Batch 669 (ws-3): a flagged exception was saved, but nobody could be e-mailed (no ordering pathologist and no desk address). */
  noticeNotSent?: boolean;
}

type Actor = { id: string; name: string };

/** Where an order sits on the case. Pure. */
export function findAddOnOrder(caseData: Case, stainOrderId: string): { specimen: Specimen; block: HistologyBlock; order: StainOrder } | null {
  for (const specimen of caseData.specimens ?? []) {
    for (const block of specimen.blocks ?? []) {
      const order = (block.stains ?? []).find(s => s.id === stainOrderId);
      if (order) return { specimen, block, order };
    }
  }
  return null;
}

const replaceSpecimen = (specimens: Specimen[], updated: Specimen) => specimens.map(sp => sp.id === updated.id ? updated : sp);

/** Places the order on every chosen block. Nothing is saved unless every block takes it. */
export async function placeAddOnOrders(
  input: {
    caseData: Case;
    blockIds: string[];
    lines: AddOnOrderLineInput[];
    submission: AddOnOrderSubmissionInput;
    actor: Actor;
    performingLabFacilityId?: string;
    requirements: readonly ResolvedFieldRequirement[];
  },
  deps: AddOnOrderActionDeps,
): Promise<AddOnActionResult> {
  const { caseData, blockIds, lines, submission, actor } = input;
  const decision = await deps.enforce('add-on:order:place', { caseId: caseData.id });
  if (!decision.allowed) return { ok: false, notPermitted: true };

  const missing = addOnSubmitMissing({ blockIds, lines, cuttingInstructions: submission.cuttingInstructions }, input.requirements);
  if (missing.length > 0) return { ok: false, missing };
  // Batch 467: an in-house molecular line must still be runnable in-house at this lab (checked again by the engine).
  const notInHouse = lines.filter(l => l.orderKind === 'molecular' && l.molecularRouting === 'IN_HOUSE'
    && !molecularRoutingChoices(l.stainType, input.performingLabFacilityId).choices.includes('IN_HOUSE')).map(l => l.stainType.name);
  if (notInHouse.length > 0) return { ok: false, inHouseNotAvailable: [...new Set(notInHouse)] };

  const fullAccession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id;
  let specimens = [...(caseData.specimens ?? [])];
  const refused: { block: string; code: AddOnOrderErrorCode }[] = [];
  for (const blockId of blockIds) {
    const specimen = specimens.find(sp => (sp.blocks ?? []).some(b => b.id === blockId));
    if (!specimen) { refused.push({ block: blockId, code: 'blockNotFound' }); continue; }
    const block = (specimen.blocks ?? []).find(b => b.id === blockId)!;
    const result = createAddOnOrder(specimen, blockId, fullAccession, lines, submission, actor);
    if (!result.ok) {
      refused.push({ block: `${specimen.label}${block.label}`, code: (result as { errorCode?: AddOnOrderErrorCode }).errorCode ?? 'blockNotFound' });
      continue;
    }
    specimens = replaceSpecimen(specimens, stampPerformingLab(result.specimen, blockId, result.createdStainIds, input.performingLabFacilityId));
  }
  if (refused.length > 0) return { ok: false, refused };
  await deps.saveSpecimens(caseData, specimens);
  // Batch 467: each molecular line becomes an order the molecular engine routes and queues. The slide orders are
  // already saved, so a refusal or failure here is reported, never turned into a failed placement (which would invite
  // a resubmit and duplicate slides).
  if (deps.ingestMolecularOrders) {
    const requests = molecularOrderRequests(caseData, specimens, input.lines, input.actor, input.performingLabFacilityId);
    if (requests.length) {
      let notQueued = requests.length;
      try { notQueued = (await deps.ingestMolecularOrders(requests)).refused.length; } catch (e) { console.error('[addOnOrders] molecular orders not queued:', e); }
      if (notQueued > 0) return { ok: true, specimens, molecularNotQueued: notQueued };
    }
  }
  return { ok: true, specimens };
}

/** Batch 467: the molecular orders an add-on order just made — one per molecular slide order created (not its
 *  control), with the line's test, routing and lab. Pure. */
export function molecularOrderRequests(
  caseData: Case, after: Specimen[], lines: readonly AddOnOrderLineInput[], actor: Actor, performingLabFacilityId?: string,
): MolecularOrderIngest[] {
  const before = new Set((caseData.specimens ?? []).flatMap(sp => (sp.blocks ?? []).flatMap(b => (b.stains ?? []).map(s => s.id))));
  const accession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id;
  const out: MolecularOrderIngest[] = [];
  for (const sp of after) {
    for (const b of sp.blocks ?? []) {
      for (const st of b.stains ?? []) {
        if (before.has(st.id) || st.isControlSlide) continue;
        const line = lines.find(l => l.orderKind === 'molecular' && l.stainType.name === st.stainName);
        if (!line) continue;
        out.push({
          caseId: caseData.id, accession, specimenId: sp.id, specimenLabel: sp.label, blockId: b.id, blockLabel: b.label,
          assayTarget: line.stainType.id, routing: line.molecularRouting ?? 'SEND_OUT',
          sendOutLabId: st.sendOutReferenceLabFacilityId, sendOutLabName: st.sendOutReferenceLabName,
          performingLabFacilityId, stainOrderId: st.id, orderedBy: actor.id, orderedByName: actor.name,
        });
      }
    }
  }
  return out;
}

/** The pathologist's answer to a block exception. */
export async function respondToAddOnException(
  input: {
    caseData: Case;
    stainOrderId: string;
    action: AddOnExceptionResponse;
    responseNote?: string;
    modifyChanges?: { levelDepthMicrons?: number; cuttingInstructions?: string };
    actor: Actor;
    requirements: readonly ResolvedFieldRequirement[];
  },
  deps: AddOnOrderActionDeps,
): Promise<AddOnActionResult> {
  const { caseData, actor } = input;
  // The capability keys are written out so the capabilities guard finds them.
  const decision = input.action === 'approve_destructive_cut'
    ? await deps.enforce('add-on:exception:approve-destructive-cut', { caseId: caseData.id })
    : await deps.enforce('add-on:order:place', { caseId: caseData.id });
  if (!decision.allowed) return { ok: false, notPermitted: true };

  const missing = addOnResponseMissing(input.responseNote, input.requirements);
  if (missing.length > 0) return { ok: false, missing };

  const loc = findAddOnOrder(caseData, input.stainOrderId);
  if (!loc) return { ok: false, failed: true };
  const note = input.responseNote?.trim() || undefined;
  const result = resolvePathologistException(loc.specimen, loc.block.id, input.stainOrderId, input.action, note, input.modifyChanges, actor);
  if (!result.ok) return { ok: false, failed: true };
  const specimens = replaceSpecimen(caseData.specimens ?? [], result.specimen);
  await deps.saveSpecimens(caseData, specimens);
  return { ok: true, specimens };
}

/** A tech flagging a block exception (add-on:exception:flag). The ordering pathologist is emailed; when there is none, or
 *  no address for them, the notice goes to the Supervisor / Accessioning Desk instead (Pete, Oct 24, 2026). */
export async function flagAddOnException(
  input: {
    caseData: Case;
    stainOrderId: string;
    reason: BlockExceptionReason;
    note?: string;
    actor: Actor;
    requirements: readonly ResolvedFieldRequirement[];
  },
  deps: Pick<AddOnOrderActionDeps, 'saveSpecimens' | 'enforce'> & AddOnNotifyDeps,
): Promise<AddOnActionResult> {
  const { caseData, actor, reason } = input;
  const decision = await deps.enforce('add-on:exception:flag', { caseId: caseData.id });
  if (!decision.allowed) return { ok: false, notPermitted: true };
  const missing = addOnExceptionMissing(input.note, input.requirements);
  if (missing.length > 0) return { ok: false, missing };

  const loc = findAddOnOrder(caseData, input.stainOrderId);
  if (!loc) return { ok: false, failed: true };
  const note = input.note?.trim() || undefined;
  const result = flagBlockExhaustion(loc.specimen, loc.block.id, input.stainOrderId, reason, note, actor);
  if (!result.ok) return { ok: false, failed: true };
  const specimens = replaceSpecimen(caseData.specimens ?? [], result.specimen);
  await deps.saveSpecimens(caseData, specimens);

  const pathologistId = loc.order.orderedByPathologistId;
  const pathologistEmail = pathologistId ? await deps.getUserEmail(pathologistId) : undefined;
  let to: string[] = pathologistEmail ? [pathologistEmail] : [];
  let primaryPathologistName: string | undefined;
  const toDesk = to.length === 0;
  if (toDesk && deps.getDeskRecipients) {
    try {
      const desk = await deps.getDeskRecipients(caseData);
      to = desk.emails;
      primaryPathologistName = desk.primaryPathologistName;
    } catch (e) { console.error('[addOnOrders] desk recipients not found:', e); }
  }
  if (to.length === 0) return { ok: true, specimens, noticeNotSent: true };

  const accession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id;
  const where = `${loc.specimen.label}${loc.block.label}`;
  const action = toDesk
    ? `No ordering pathologist is recorded for this slide order${primaryPathologistName ? ` (the case's primary pathologist is ${primaryPathologistName})` : ''}. Please pass this on to the pathologist so the exception can be answered (cancel / modify / approve destructive cutting) from the Add-On Order Tracking dashboard.`
    : 'Review and respond (cancel / modify / approve destructive cutting) from the Add-On Order Tracking dashboard.';
  void deps.sendEmail({
    to,
    subject: `Add-On Order Exception — ${accession} ${where}`,
    bodyText: `${reason} on block ${where} (order: ${loc.order.stainName}). ${note ?? ''}\n\n${action}`,
    bodyHtml: `<p><strong>${reason}</strong> on block ${where} (order: ${loc.order.stainName}).</p><p>${note ?? ''}</p><p>${action}</p>`,
    metadata: { caseId: caseData.id, blockId: loc.block.id, stainOrderId: input.stainOrderId, reason, ...(toDesk ? { routedTo: 'supervisor-desk' } : {}) },
  }).catch(() => {});
  return toDesk ? { ok: true, specimens, noticeToDesk: true } : { ok: true, specimens };
}

/** A tech marking the block retrieved for an order (add-on:block:mark-retrieved). */
export async function markAddOnBlockRetrieved(
  input: { caseData: Case; stainOrderId: string; actor: Actor },
  deps: Pick<AddOnOrderActionDeps, 'saveSpecimens' | 'enforce'>,
): Promise<AddOnActionResult> {
  const decision = await deps.enforce('add-on:block:mark-retrieved', { caseId: input.caseData.id });
  if (!decision.allowed) return { ok: false, notPermitted: true };
  const loc = findAddOnOrder(input.caseData, input.stainOrderId);
  if (!loc) return { ok: false, failed: true };
  const result = markBlockRetrieved(loc.specimen, loc.block.id, input.stainOrderId, input.actor);
  if (!result.ok) return { ok: false, failed: true };
  const specimens = replaceSpecimen(input.caseData.specimens ?? [], result.specimen);
  await deps.saveSpecimens(input.caseData, specimens);
  return { ok: true, specimens };
}
