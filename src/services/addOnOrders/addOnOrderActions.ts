// src/services/addOnOrders/addOnOrderActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 403 (PS-287 / PS-359). The Add-On Orders page's actions, moved out of
// its hook so each is checked where the work is done:
//   - placing an order                      add-on:order:place
//   - approving destructive cutting         add-on:exception:approve-destructive-cut
//   - cancelling, or modifying and resubmitting, an order after an exception
//                                           add-on:order:place
//   - a tech flagging a block exception     (no permission: it reports a fact)
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
import type { ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';
import { addOnSubmitMissing, addOnExceptionMissing, addOnResponseMissing } from '../fieldRequirements/addOnOrderChecks';
import {
  createAddOnOrder, stampPerformingLab, flagBlockExhaustion, resolvePathologistException, markBlockRetrieved,
  type AddOnOrderLineInput, type AddOnOrderSubmissionInput, type AddOnOrderErrorCode,
} from '@/utils/addOnOrderOperations';

export const ADD_ON_ORDER_PLACE_CAPABILITY = 'add-on:order:place';
export const ADD_ON_DESTRUCTIVE_CUT_CAPABILITY = 'add-on:exception:approve-destructive-cut';

export type AddOnExceptionResponse = 'approve_destructive_cut' | 'cancel' | 'modify';

export interface AddOnOrderActionDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  /** Saves the case's changed specimens (one write). */
  saveSpecimens: (caseData: Case, specimens: Specimen[]) => Promise<void>;
}

export interface AddOnNotifyDeps {
  getUserEmail: (userId: string) => Promise<string | undefined>;
  sendEmail: (message: { to: string[]; subject: string; bodyText: string; bodyHtml: string; metadata: Record<string, string> }) => Promise<unknown>;
}

/** One flat shape: this project's tsconfig doesn't narrow unions reliably. */
export interface AddOnActionResult {
  ok: boolean;
  notPermitted?: boolean;
  /** Field Requirements still unmet (field ids). */
  missing?: string[];
  /** Blocks refused, with why (for `addOnOrder.errors.<code>`). */
  refused?: { block: string; code: AddOnOrderErrorCode }[];
  /** Something else stopped it (the order moved, or the exception was already answered). */
  failed?: boolean;
  /** The case's specimens after the change, for the page to show. */
  specimens?: Specimen[];
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
  return { ok: true, specimens };
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

/** A tech flagging a block exception; the ordering pathologist is emailed. */
export async function flagAddOnException(
  input: {
    caseData: Case;
    stainOrderId: string;
    reason: BlockExceptionReason;
    note?: string;
    actor: Actor;
    requirements: readonly ResolvedFieldRequirement[];
  },
  deps: Pick<AddOnOrderActionDeps, 'saveSpecimens'> & AddOnNotifyDeps,
): Promise<AddOnActionResult> {
  const { caseData, actor, reason } = input;
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
  const email = pathologistId ? await deps.getUserEmail(pathologistId) : undefined;
  if (email) {
    const accession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id;
    const where = `${loc.specimen.label}${loc.block.label}`;
    const action = 'Review and respond (cancel / modify / approve destructive cutting) from the Add-On Order Tracking dashboard.';
    void deps.sendEmail({
      to: [email],
      subject: `Add-On Order Exception — ${accession} ${where}`,
      bodyText: `${reason} on block ${where} (order: ${loc.order.stainName}). ${note ?? ''}\n\n${action}`,
      bodyHtml: `<p><strong>${reason}</strong> on block ${where} (order: ${loc.order.stainName}).</p><p>${note ?? ''}</p><p>${action}</p>`,
      metadata: { caseId: caseData.id, blockId: loc.block.id, stainOrderId: input.stainOrderId, reason },
    }).catch(() => {});
  }
  return { ok: true, specimens };
}

/** A tech marking the block retrieved for an order. */
export async function markAddOnBlockRetrieved(
  input: { caseData: Case; stainOrderId: string; actor: Actor },
  deps: Pick<AddOnOrderActionDeps, 'saveSpecimens'>,
): Promise<AddOnActionResult> {
  const loc = findAddOnOrder(input.caseData, input.stainOrderId);
  if (!loc) return { ok: false, failed: true };
  const result = markBlockRetrieved(loc.specimen, loc.block.id, input.stainOrderId, input.actor);
  if (!result.ok) return { ok: false, failed: true };
  const specimens = replaceSpecimen(input.caseData.specimens ?? [], result.specimen);
  await deps.saveSpecimens(input.caseData, specimens);
  return { ok: true, specimens };
}
