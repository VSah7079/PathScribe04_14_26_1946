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
//   - Batch 731 (spec §10.6), an exhausted block: each line's alternative (an unstained slide already cut, re-embedding,
//     another block of the same part) with a required reason, audited    add-on:order:place
//                                           + material:reembed:request when a line asks for re-embedding
//   - answering a "Block exhausted" flag with one of those alternatives  add-on:order:place / material:reembed:request
//   - marking the block re-embedded at the Embedding Station             material:reembed:complete
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
  createAddOnOrder, stampPerformingLab, flagBlockExhaustion, resolvePathologistException, markBlockRetrieved, addOnLineFields,
  type AddOnOrderLineInput, type AddOnOrderSubmissionInput, type AddOnOrderErrorCode,
} from '@/utils/addOnOrderOperations';
import { onExhaustedTissue, mixesExhaustedPieces } from '@/utils/blockPieceRules';
import {
  checkExhaustedLines, exhaustedChoiceProblems, orderOnUnstainedSlide, resolveExhaustionWithAlternative, completeReembed,
  flagBlockExhaustedOnce, openExhaustionFlags, destructiveCutAllowed, unstainedSlidesForGroup,
  type ExhaustedBlockChoice, type ExhaustionAlternative,
} from '@/utils/exhaustedBlockRules';
import { resolveBlockDisplayId } from '@/utils/materialDisplayId';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { NewItemEndState } from '../itemEndStates/IItemEndStateService';
import { withReasonCode } from '@/services/reasons/benchReasons';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import { matrixBlockAsSpecimenView, matrixBlockFromSpecimenView, isMatrixView } from '@/utils/microtomyOperations';

export const ADD_ON_ORDER_PLACE_CAPABILITY = 'add-on:order:place';
export const ADD_ON_DESTRUCTIVE_CUT_CAPABILITY = 'add-on:exception:approve-destructive-cut';
export const ADD_ON_FLAG_EXCEPTION_CAPABILITY = 'add-on:exception:flag';
export const ADD_ON_MARK_RETRIEVED_CAPABILITY = 'add-on:block:mark-retrieved';

/** Batch 731 (spec §10.6): use_unstained, other_block and reembed answer a "Block exhausted" flag with an alternative. */
export type AddOnExceptionResponse = 'approve_destructive_cut' | 'cancel' | 'modify' | 'use_unstained' | 'other_block' | 'reembed';

export interface AddOnOrderActionDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  /** Saves the case's changed specimens (one write). Batch 737: with `matrixBlocks` when a matrix block changed
   *  (an add-on order on a matrix block or one of its parts), saved in the same write. */
  saveSpecimens: (caseData: Case, specimens: Specimen[], matrixBlocks?: MatrixBlock[]) => Promise<void>;
  /** Batch 467: hands the order's molecular lines to the molecular order engine (services/molecularOrders/). */
  ingestMolecularOrders?: (requests: MolecularOrderIngest[]) => Promise<{ refused: readonly unknown[] }>;
  /** Batch 731: the audit log (an order on an exhausted block, an alternative chosen, a block re-embedded). Detail text is English. */
  audit?: (entry: NewAuditLog) => Promise<unknown>;
  /** Batch 731 (spec §10.5): records an end state as part of this action (a block confirmed exhausted). Fire and forget. */
  recordEndState?: (entry: NewItemEndState & { source: 'exhaustion_flag' }) => void;
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
  /** Blocks refused, with why (for `addOnOrder.errors.<code>`). Batch 731: `lines` (indexes) still blocked on an exhausted block. */
  refused?: { block: string; code: AddOnOrderErrorCode; lines?: number[] }[];
  /** Batch 731: how many orders a re-embedded block released to the Microtome. */
  released?: number;
  /** Batch 733: how many waiting slides one answer covered. */
  answered?: number;
  /** Batch 733: an answer that cannot apply: a slide needs a new section, there are not enough unstained slides for all
   *  of them (answer slide by slide), or nothing is left to cut (the block was already exhausted). */
  alternativeRefused?: 'needsNewSection' | 'notEnoughSlides' | 'nothingLeft';
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
  // Batch 737 (spec §11.4): an order on a matrix block, found through the block's one-block view.
  for (const mb of caseData.matrixBlocks ?? []) {
    const order = (mb.slides ?? []).find(s => s.id === stainOrderId);
    if (order) { const view = matrixBlockAsSpecimenView(mb); return { specimen: view, block: (view.blocks ?? [])[0], order }; }
  }
  return null;
}

const replaceSpecimen = (specimens: Specimen[], updated: Specimen) => specimens.map(sp => sp.id === updated.id ? updated : sp);

/** Batch 737: saves a changed specimen, or a changed matrix block's view back onto Case.matrixBlocks. */
async function commitSpecimen(caseData: Case, updated: Specimen, deps: Pick<AddOnOrderActionDeps, 'saveSpecimens'>): Promise<Specimen[]> {
  if (isMatrixView(updated)) {
    const id = (updated.blocks ?? [])[0]?.id;
    const matrixBlocks = (caseData.matrixBlocks ?? []).map(mb => (mb.id === id ? matrixBlockFromSpecimenView(mb, updated) : mb));
    await deps.saveSpecimens(caseData, caseData.specimens ?? [], matrixBlocks);
    return caseData.specimens ?? [];
  }
  const specimens = replaceSpecimen(caseData.specimens ?? [], updated);
  await deps.saveSpecimens(caseData, specimens);
  return specimens;
}

/** Batch 737: the slides an order on a matrix block is for: the parts chosen, or every part. Pure. */
function targetMatrixParts(view: Specimen, blockId: string, createdIds: readonly string[], parts: readonly string[] | undefined): Specimen {
  if (!parts || parts.length === 0) return view;
  const ids = new Set(createdIds);
  return { ...view, blocks: (view.blocks ?? []).map(b => (b.id !== blockId ? b : {
    ...b, stains: b.stains.map(st => (ids.has(st.id) ? { ...st, targetSpecimenIds: [...parts] } : st)),
  })) };
}

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
    /** Batch 731 (spec §10.6): for each exhausted block, each line's alternative and the reason. */
    exhaustedChoices?: Readonly<Record<string, ExhaustedBlockChoice>>;
    /** Batch 732 (spec §11.4): for a multi-piece block, the pieces the order is for (none: the whole block). */
    pieceIdsByBlock?: Readonly<Record<string, string[]>>;
  },
  deps: AddOnOrderActionDeps,
): Promise<AddOnActionResult> {
  const { caseData, blockIds, lines, submission, actor } = input;
  const decision = await deps.enforce('add-on:order:place', { caseId: caseData.id });
  if (!decision.allowed) return { ok: false, notPermitted: true };
  // Batch 731: a line that waits for re-embedding needs its own permission as well.
  const wantsReembed = blockIds.some(id => Object.values(input.exhaustedChoices?.[id]?.lines ?? {}).some(c => c?.kind === 'reembed'));
  if (wantsReembed && !(await deps.enforce('material:reembed:request', { caseId: caseData.id })).allowed) return { ok: false, notPermitted: true };

  const missing = addOnSubmitMissing({ blockIds, lines, cuttingInstructions: submission.cuttingInstructions }, input.requirements);
  if (missing.length > 0) return { ok: false, missing };
  // Batch 467: an in-house molecular line must still be runnable in-house at this lab (checked again by the engine).
  const notInHouse = lines.filter(l => l.orderKind === 'molecular' && l.molecularRouting === 'IN_HOUSE'
    && !molecularRoutingChoices(l.stainType, input.performingLabFacilityId).choices.includes('IN_HOUSE')).map(l => l.stainType.name);
  if (notInHouse.length > 0) return { ok: false, inHouseNotAvailable: [...new Set(notInHouse)] };

  const fullAccession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id;
  let specimens = [...(caseData.specimens ?? [])];
  let matrixBlocks: MatrixBlock[] | undefined;
  const refused: { block: string; code: AddOnOrderErrorCode; lines?: number[] }[] = [];
  const reusedSlideIds: string[] = [];
  const auditLines: string[] = [];
  for (const blockId of blockIds) {
    // Batch 737 (spec §11.4): a matrix block, or some of its parts (the specimens sharing the cassette).
    const mb = (matrixBlocks ?? caseData.matrixBlocks ?? []).find(m => m.id === blockId);
    if (mb) {
      const view = matrixBlockAsSpecimenView(mb);
      const parts = input.pieceIdsByBlock?.[blockId];
      const viewBlock = (view.blocks ?? [])[0];
      if (onExhaustedTissue(viewBlock, parts) || mixesExhaustedPieces(viewBlock, parts)) { refused.push({ block: mb.label, code: 'matrixExhausted' }); continue; }
      const result = createAddOnOrder(view, blockId, fullAccession, lines, submission, actor);
      if (!result.ok) { refused.push({ block: mb.label, code: (result as { errorCode?: AddOnOrderErrorCode }).errorCode ?? 'blockNotFound' }); continue; }
      const placed = targetMatrixParts(stampPerformingLab(result.specimen, blockId, result.createdStainIds, input.performingLabFacilityId), blockId, result.createdStainIds, parts);
      matrixBlocks = (matrixBlocks ?? caseData.matrixBlocks ?? []).map(m => (m.id === blockId ? matrixBlockFromSpecimenView(m, placed) : m));
      continue;
    }
    const specimen = specimens.find(sp => (sp.blocks ?? []).some(b => b.id === blockId));
    if (!specimen) { refused.push({ block: blockId, code: 'blockNotFound' }); continue; }
    const block = (specimen.blocks ?? []).find(b => b.id === blockId)!;
    // Batch 731 (spec §10.6): an exhausted block takes the order only line by line, through an alternative, with a reason.
    // Batch 732 (§11.5): so does an order for pieces that are all used up; used-up and remaining pieces together are refused.
    const choice = input.exhaustedChoices?.[blockId];
    const pieceIds = input.pieceIdsByBlock?.[blockId];
    const label = `${specimen.label}${block.label}`;
    if (mixesExhaustedPieces(block, pieceIds)) { refused.push({ block: label, code: 'mixedPieces' }); continue; }
    const exhaustedTissue = onExhaustedTissue(block, pieceIds);
    if (exhaustedTissue && !choice && block.status !== 'Exhausted') { refused.push({ block: label, code: 'pieceExhausted' }); continue; }
    if (exhaustedTissue && choice) {
      const checks = checkExhaustedLines(specimen, blockId, lines, choice);
      const problems = exhaustedChoiceProblems(checks, choice.reason);
      if (problems.blockedLines.length > 0) { refused.push({ block: label, code: 'exhaustedNeedsChoice', lines: problems.blockedLines }); continue; }
      if (problems.reasonMissing) { refused.push({ block: label, code: 'exhaustedReasonRequired' }); continue; }
      const placed = placeOnExhaustedBlock(specimen, blockId, fullAccession, lines, choice, submission, actor, input.performingLabFacilityId, pieceIds);
      if (!placed) return { ok: false, failed: true };
      specimens = replaceSpecimen(specimens, placed.specimen);
      reusedSlideIds.push(...placed.reusedSlideIds);
      auditLines.push(withReasonCode(`${fullAccession} block ${label} (exhausted): ${placed.summary.join('; ')}. Reason: ${choice.reason.trim()}`, choice.reasonCode));
      continue;
    }
    const result = createAddOnOrder(specimen, blockId, fullAccession, lines, submission, actor, pieceIds?.length ? { pieceIds } : undefined);
    if (!result.ok) {
      refused.push({ block: `${specimen.label}${block.label}`, code: (result as { errorCode?: AddOnOrderErrorCode }).errorCode ?? 'blockNotFound' });
      continue;
    }
    specimens = replaceSpecimen(specimens, stampPerformingLab(result.specimen, blockId, result.createdStainIds, input.performingLabFacilityId));
  }
  if (refused.length > 0) return { ok: false, refused };
  await deps.saveSpecimens(caseData, specimens, matrixBlocks);
  for (const detail of auditLines) {
    void deps.audit?.({ type: 'user', event: 'Add-On Order On Exhausted Block', detail, user: actor.name, caseId: fullAccession, confidence: null })?.catch(() => undefined);
  }
  // Batch 467: each molecular line becomes an order the molecular engine routes and queues. The slide orders are
  // already saved, so a refusal or failure here is reported, never turned into a failed placement (which would invite
  // a resubmit and duplicate slides).
  if (deps.ingestMolecularOrders) {
    const requests = molecularOrderRequests(caseData, specimens, input.lines, input.actor, input.performingLabFacilityId, reusedSlideIds);
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
  /** Batch 731: unstained slides already cut that took a line (they are not new, but their molecular test is). */
  reusedSlideIds: readonly string[] = [],
): MolecularOrderIngest[] {
  const reused = new Set(reusedSlideIds);
  const before = new Set((caseData.specimens ?? []).flatMap(sp => (sp.blocks ?? []).flatMap(b => (b.stains ?? []).map(s => s.id))).filter(id => !reused.has(id)));
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

/** Batch 731 (spec §10.6): applies each line's alternative on an exhausted block (already checked): onto an unstained
 *  slide already cut, an order that waits for re-embedding, or an order on another block of the same part. Pure. */
export function placeOnExhaustedBlock(
  specimen: Specimen, blockId: string, fullAccession: string, lines: readonly AddOnOrderLineInput[], choice: ExhaustedBlockChoice,
  submission: AddOnOrderSubmissionInput, actor: Actor, performingLabFacilityId?: string, pieceIds?: string[],
): { specimen: Specimen; reusedSlideIds: string[]; summary: string[] } | null {
  let sp = specimen;
  const reusedSlideIds: string[] = [];
  const summary: string[] = [];
  const orderedAt = new Date().toISOString();
  const reembed: AddOnOrderLineInput[] = [];
  const toBlock = new Map<string, AddOnOrderLineInput[]>();
  const toPiece = new Map<string, AddOnOrderLineInput[]>();
  const pieceLabel = (id: string) => { const p = (specimen.blocks ?? []).find(b => b.id === blockId)?.pieces?.find(x => x.id === id); return p ? `piece ${p.position} (${p.partLabel})` : id; };
  const labelOf = (id: string) => { const b = (specimen.blocks ?? []).find(x => x.id === id); return b ? `${specimen.label}${b.label}` : id; };
  for (const [i, line] of lines.entries()) {
    const c = choice.lines[i];
    if (!c) return null;
    if (c.kind === 'useSlide') {
      const next = orderOnUnstainedSlide(sp, blockId, c.slideId, addOnLineFields(line, submission, actor, orderedAt, performingLabFacilityId));
      if (!next) return null;
      sp = next;
      reusedSlideIds.push(c.slideId);
      const slide = (next.blocks ?? []).find(b => b.id === blockId)?.stains.find(s => s.id === c.slideId);
      summary.push(`${line.stainType.name} on unstained slide ${slide?.displayId ?? c.slideId}`);
    } else if (c.kind === 'reembed') {
      reembed.push(line);
      summary.push(`${line.stainType.name} waits for re-embedding`);
    } else if (c.kind === 'otherPiece') {
      toPiece.set(c.pieceId, [...(toPiece.get(c.pieceId) ?? []), line]);
      summary.push(`${line.stainType.name} moved to ${pieceLabel(c.pieceId)}`);
    } else {
      toBlock.set(c.blockId, [...(toBlock.get(c.blockId) ?? []), line]);
      summary.push(`${line.stainType.name} moved to block ${labelOf(c.blockId)}`);
    }
  }
  const stamp = (r: ReturnType<typeof createAddOnOrder>, onBlock: string): boolean => {
    if (!r.ok) return false;
    sp = stampPerformingLab(r.specimen, onBlock, r.createdStainIds, performingLabFacilityId);
    return true;
  };
  if (reembed.length > 0 && !stamp(createAddOnOrder(sp, blockId, fullAccession, reembed, submission, actor, { holdForReembed: { note: choice.reason.trim() }, ...(pieceIds?.length ? { pieceIds } : {}) }), blockId)) return null;
  for (const [pieceId, ls] of toPiece) {
    if (!stamp(createAddOnOrder(sp, blockId, fullAccession, ls, submission, actor, { pieceIds: [pieceId] }), blockId)) return null;
  }
  for (const [otherId, ls] of toBlock) {
    if (!stamp(createAddOnOrder(sp, otherId, fullAccession, ls, submission, actor), otherId)) return null;
  }
  return { specimen: sp, reusedSlideIds, summary };
}

/** The pathologist's answer to a block exception. */
export async function respondToAddOnException(
  input: {
    caseData: Case;
    stainOrderId: string;
    action: AddOnExceptionResponse;
    responseNote?: string;
    modifyChanges?: { levelDepthMicrons?: number; cuttingInstructions?: string };
    /** Batch 731: the unstained slide (use_unstained) or the other block (other_block). */
    alternative?: { slideId?: string; blockId?: string };
    /** Batch 733 (Pete): an answer to a "Block exhausted" flag covers every waiting slide on the block, unless the
     *  pathologist answers this slide only. */
    individually?: boolean;
    /** Batch 736: the code of the bench reason picked for the answer (Reason Dictionary id). */
    reasonCode?: string;
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
  // Batch 731: re-embedding also needs its own permission.
  if (input.action === 'reembed' && !(await deps.enforce('material:reembed:request', { caseId: caseData.id })).allowed) return { ok: false, notPermitted: true };
  // Batch 732 (review, spec §10.6): an alternative on an exhausted block always needs a reason (the builder's rule).
  if ((input.action === 'use_unstained' || input.action === 'other_block' || input.action === 'reembed') && !input.responseNote?.trim()) return { ok: false, missing: ['responseNote'] };

  const missing = addOnResponseMissing(input.responseNote, input.requirements);
  if (missing.length > 0) return { ok: false, missing };

  const loc = findAddOnOrder(caseData, input.stainOrderId);
  if (!loc) return { ok: false, failed: true };
  const note = input.responseNote?.trim() || undefined;
  const fullAccession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id;
  const alternative = alternativeOf(input.action, input.alternative);
  if ((input.action === 'use_unstained' || input.action === 'other_block' || input.action === 'reembed') && !alternative) return { ok: false, failed: true };
  const exhaustFlag = loc.order.exception?.reason === 'Block exhausted';
  // Batch 733 (Pete, Oct 30, 2026): destructive cutting only while tissue may remain, always with a reason.
  if (exhaustFlag && input.action === 'approve_destructive_cut') {
    if (!destructiveCutAllowed(loc.order)) return { ok: false, alternativeRefused: 'nothingLeft' };
    if (!note) return { ok: false, missing: ['responseNote'] };
  }
  // Batch 733: one answer covers every waiting slide flagged on the block, unless answered slide by slide.
  const others = exhaustFlag && !input.individually ? openExhaustionFlags(loc.block).filter(o => o.id !== loc.order.id) : [];
  const targets = [loc.order, ...others];
  let slideByOrder: Record<string, string> | undefined;
  if (alternative?.kind === 'useSlide' && targets.length > 1) {
    const g = unstainedSlidesForGroup(loc.block, targets, alternative.slideId);
    if (!g.ok) return { ok: false, alternativeRefused: g.problem };
    slideByOrder = g.slideByOrder;
  }
  let working = loc.specimen;
  for (const o of targets) {
    const alt: ExhaustionAlternative | null = alternative && alternative.kind === 'useSlide' && slideByOrder ? { kind: 'useSlide', slideId: slideByOrder[o.id] } : alternative;
    const r = alt
      ? resolveExhaustionWithAlternative(working, loc.block.id, o.id, alt, note, actor, fullAccession)
      : resolvePathologistException(working, loc.block.id, o.id, input.action as 'approve_destructive_cut' | 'cancel' | 'modify', note, input.modifyChanges, actor);
    if (!r.ok) return { ok: false, failed: true };
    working = r.specimen;
  }
  // Batch 736: the picked reason's code is kept beside the answer's text.
  if (input.reasonCode) working = stampResponseReasonCode(working, loc.block.id, targets.map(o => o.id), input.reasonCode);
  const specimens = await commitSpecimen(caseData, working, deps);
  if (exhaustFlag) {
    const where = `${fullAccession} block ${loc.specimen.label}${loc.block.label}`;
    const what = targets.map(o => o.stainName).join(', ');
    void deps.audit?.({ type: 'user', event: 'Block Exhausted Answered', detail: withReasonCode(`${where}, ${what}: ${input.action.replace(/_/g, ' ')}${targets.length > 1 ? ` (one answer for ${targets.length} slides)` : ''}${note ? ` — ${note}` : ''}`, input.reasonCode), user: actor.name, caseId: fullAccession, confidence: null })?.catch(() => undefined);
    // Spec §10.5: the answer confirms the block has no tissue left (destructive cutting uses up what remained).
    if (input.action === 'approve_destructive_cut' || input.action === 'use_unstained' || input.action === 'other_block') {
      deps.recordEndState?.({
        itemId: resolveBlockDisplayId(fullAccession, loc.specimen.label, loc.block), materialType: 'block', caseAccession: fullAccession, state: 'exhausted',
        reason: withReasonCode(`Block exhausted confirmed by the pathologist (${input.action.replace(/_/g, ' ')})${note ? `: ${note}` : ''}`, input.reasonCode), userId: actor.id, userName: actor.name, source: 'exhaustion_flag',
      });
    }
  }
  return { ok: true, specimens, answered: targets.length };
}

/** Batch 736: the picked reason's code on each answered order's exception. Pure. */
function stampResponseReasonCode(specimen: Specimen, blockId: string, orderIds: readonly string[], code: string): Specimen {
  const ids = new Set(orderIds);
  return { ...specimen, blocks: (specimen.blocks ?? []).map(b => (b.id !== blockId ? b : {
    ...b, stains: b.stains.map(st => (ids.has(st.id) && st.exception ? { ...st, exception: { ...st.exception, responseReasonCode: code } } : st)),
  })) };
}

function alternativeOf(action: AddOnExceptionResponse, alt: { slideId?: string; blockId?: string } | undefined): ExhaustionAlternative | null {
  if (action === 'reembed') return { kind: 'reembed' };
  if (action === 'use_unstained') return alt?.slideId ? { kind: 'useSlide', slideId: alt.slideId } : null;
  if (action === 'other_block') return alt?.blockId ? { kind: 'otherBlock', blockId: alt.blockId } : null;
  return null;
}

/** Batch 731 (spec §10.6): the lab has re-embedded an exhausted block's remnant or wet tissue (material:reembed:complete).
 *  The block can be cut again and every order waiting for it goes to the Microtome. Audited. Batch 732: the block's
 *  "exhausted" end state is withdrawn (it is back in use). */
export async function completeReembedding(
  input: { caseData: Case; blockId: string; note?: string; actor: Actor },
  deps: Pick<AddOnOrderActionDeps, 'enforce' | 'saveSpecimens' | 'audit'> & { withdrawEndState?: (itemId: string, caseAccession: string, reason: string) => void },
): Promise<AddOnActionResult> {
  const { caseData, actor } = input;
  const decision = await deps.enforce('material:reembed:complete', { caseId: caseData.id });
  if (!decision.allowed) return { ok: false, notPermitted: true };
  const specimen = (caseData.specimens ?? []).find(sp => (sp.blocks ?? []).some(b => b.id === input.blockId));
  if (!specimen) return { ok: false, failed: true };
  const note = input.note?.trim() || undefined;
  const result = completeReembed(specimen, input.blockId, actor, note);
  if (!result.ok) return { ok: false, failed: true };
  const specimens = replaceSpecimen(caseData.specimens ?? [], result.specimen);
  await deps.saveSpecimens(caseData, specimens);
  const fullAccession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id;
  const block = (specimen.blocks ?? []).find(b => b.id === input.blockId)!;
  deps.withdrawEndState?.(resolveBlockDisplayId(fullAccession, specimen.label, block), fullAccession, `Block re-embedded${note ? `: ${note}` : ''}`);
  void deps.audit?.({ type: 'user', event: 'Block Re-embedded', detail: `${fullAccession} block ${specimen.label}${block.label} re-embedded; ${result.released} waiting order(s) released to the Microtome${note ? ` — ${note}` : ''}`, user: actor.name, caseId: fullAccession, confidence: null })?.catch(() => undefined);
  return { ok: true, specimens, released: result.released };
}

/** A tech flagging a block exception (add-on:exception:flag). The ordering pathologist is emailed; when there is none, or
 *  no address for them, the notice goes to the Supervisor / Accessioning Desk instead (Pete, Oct 24, 2026). */
export async function flagAddOnException(
  input: {
    caseData: Case;
    stainOrderId: string;
    reason: BlockExceptionReason;
    note?: string;
    /** Batch 736: the code of the bench reason picked for a Block exhausted flag (Reason Dictionary id). */
    reasonCode?: string;
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
  // Batch 733 (Pete, Oct 30, 2026): "Block exhausted" is one flag per block, on every slide still waiting to be cut.
  const once = reason === 'Block exhausted' ? flagBlockExhaustedOnce(loc.specimen, loc.block.id, input.stainOrderId, note, actor, input.reasonCode) : null;
  const result = once ?? flagBlockExhaustion(loc.specimen, loc.block.id, input.stainOrderId, reason, note, actor);
  if (!result.ok) return { ok: false, failed: true };
  const specimens = await commitSpecimen(caseData, result.specimen, deps);
  const flaggedOrders = once && once.ok ? (loc.block.stains ?? []).filter(s => once.flaggedIds.includes(s.id)) : [loc.order];

  // Every ordering pathologist of a flagged slide is told (once each).
  const pathologistIds = [...new Set(flaggedOrders.map(o => o.orderedByPathologistId).filter((id): id is string => !!id))];
  const emails = (await Promise.all(pathologistIds.map(id => deps.getUserEmail(id)))).filter((e): e is string => !!e);
  let to: string[] = [...new Set(emails)];
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
    : 'Review and respond from the Add-On Order Tracking dashboard: use an unstained slide already cut, request re-embedding, move the order to another block of the same part, approve destructive cutting, or cancel or modify the order.';
  void deps.sendEmail({
    to,
    subject: `Add-On Order Exception — ${accession} ${where}`,
    bodyText: `${reason} on block ${where} (${flaggedOrders.length > 1 ? 'orders' : 'order'}: ${flaggedOrders.map(o => o.stainName).join(', ')}). ${note ?? ''}\n\n${action}`,
    bodyHtml: `<p><strong>${reason}</strong> on block ${where} (${flaggedOrders.length > 1 ? 'orders' : 'order'}: ${flaggedOrders.map(o => o.stainName).join(', ')}).</p><p>${note ?? ''}</p><p>${action}</p>`,
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
  const specimens = await commitSpecimen(input.caseData, result.specimen, deps);
  return { ok: true, specimens };
}
