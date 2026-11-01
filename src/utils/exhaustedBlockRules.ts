// src/utils/exhaustedBlockRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 731 (Lab Workflow & Batch spec §10.6, decided by Pete Oct 29, 2026): the
// exhausted-block rule. The Add-On Order builder never silently refuses and
// never silently proceeds. For an order on an exhausted block it states what
// remains, then decides per order line:
//   • a line that needs a new section from the block (a recut, deeper levels, or
//     a stain with no slide already cut to put it on) is blocked. The
//     alternatives are offered in the same place: use an unstained slide already
//     cut, request re-embedding of remnant or wet tissue (the order then waits
//     until the block is re-embedded), or move the line to another block of the
//     same part. Nothing can create tissue that does not exist;
//   • a line that can use a slide that already exists (a stain, IHC or molecular
//     test on an unstained slide) is allowed with a required reason, and audited.
// The same alternatives answer the Microtome's "Block exhausted" flag
// (resolveExhaustionWithAlternative). Batch 732 (spec §11.5): the same rule
// applies per piece of a multi-piece block: an order for pieces that are all used
// up gets the same alternatives, plus another piece of the block that remains.
// Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { HistologyBlock, Specimen, StainOrder } from '@/types/case/Specimen';
import { UNSTAINED_LABEL } from '@/types/case/Specimen';
import type { AddOnOrderException, AddOnOrderExceptionEvent } from '@/types/case/Specimen';
import { isExhausted, isLost, isDamaged } from './blockExceptionStates';
import { slideIdentifier } from '@/types/labels/LabelData';
import { nextSlideLevelNumber, slideLevelOf } from '@/services/material/slideLevels';
import type { AddOnOrderKind } from '@/types/case/AddOnOrder';
import { remainingPieces } from './blockPieceRules';
import { withReasonCode } from '@/services/reasons/benchReasons';

/** What a line needs to know about an order line (a subset of AddOnOrderLineInput). */
export interface ExhaustedLineLike { orderKind: AddOnOrderKind; levelDepthMicrons?: number }

type Actor = { id: string; name: string };

/** Unstained slides already cut from the block and still at hand to take a stain: cut and placed, not a control,
 *  not checked out or on a scanner, not sent out, not disposed of. */
export function unstainedSlidesOf(block: Pick<HistologyBlock, 'stains'>): StainOrder[] {
  return (block.stains ?? []).filter(s =>
    s.stainName.trim().toLowerCase() === UNSTAINED_LABEL.toLowerCase()
    && s.status === 'Cut & Placed' && !s.isControlSlide && !s.disposedAt && !s.distributionStatus && !s.sendOutReferenceLabFacilityId);
}

/** Whether an order already placed needs a new section: a recut or a level (the histology cutting queue), or levels
 *  at a depth. Used when a "Block exhausted" flag is answered: such an order can never go on an existing slide. */
export function orderNeedsNewSection(order: Pick<StainOrder, 'routedQueueLabel' | 'levelDepthMicrons'>): boolean {
  return order.routedQueueLabel === 'Histology Cutting Queue' || order.levelDepthMicrons !== undefined;
}

/** Whether the line can only be done on a new section (a recut, or levels at a depth). */
export function lineNeedsNewSection(line: ExhaustedLineLike): boolean {
  return line.orderKind === 'recut' || line.levelDepthMicrons !== undefined;
}

/** Whether a block can still be cut (other blocks offered as an alternative). */
export function blockCanBeCut(block: Pick<HistologyBlock, 'status'>): boolean {
  return !isExhausted(block) && !isLost(block) && !isDamaged(block)
    && block.status !== 'Cancelled' && block.status !== 'Deleted' && block.status !== 'Invalidated';
}

export interface WhatRemains {
  /** The block as printed on its cassette label (A3). */
  blockLabel: string;
  /** Unstained slides already cut: id and level (L4). */
  unstained: { id: string; level: string }[];
  /** Other blocks of the same part that can still be cut: id and label (A2). */
  otherBlocks: { id: string; label: string }[];
  /** Orders on the block waiting for it to be re-embedded. */
  awaitingReembed: number;
  /** Batch 732: pieces of a multi-piece block that still hold tissue (position, part, description). */
  otherPieces: { id: string; position: number; partLabel: string; description?: string }[];
}

/** What remains for an exhausted block: its unstained slides and the part's other usable blocks. */
export function whatRemains(specimen: Pick<Specimen, 'label' | 'blocks'>, blockId: string): WhatRemains | null {
  const block = (specimen.blocks ?? []).find(b => b.id === blockId);
  if (!block) return null;
  const unstained = unstainedSlidesOf(block).map(s => ({ id: s.id, level: slideLevelOf(s, block.stains.indexOf(s)) }));
  const otherBlocks = (specimen.blocks ?? []).filter(b => b.id !== blockId && blockCanBeCut(b)).map(b => ({ id: b.id, label: `${specimen.label}${b.label}` }));
  const otherPieces = (isExhausted(block) ? [] : remainingPieces(block)).map(p => ({ id: p.id, position: p.position, partLabel: p.partLabel, description: p.description }));
  return { blockLabel: `${specimen.label}${block.label}`, unstained, otherBlocks, awaitingReembed: ordersAwaitingReembed(block).length, otherPieces };
}

/** Orders on the block that wait for it to be re-embedded. */
export function ordersAwaitingReembed(block: Pick<HistologyBlock, 'stains'>): StainOrder[] {
  return (block.stains ?? []).filter(s => s.exception?.reason === 'Block exhausted' && s.exception.status === 'reembed_requested' && s.status !== 'Cancelled');
}

// ─── The builder's per-line choices ─────────────────────────────────────────

export type ExhaustedLineChoice =
  | { kind: 'useSlide'; slideId: string }
  | { kind: 'reembed' }
  | { kind: 'otherBlock'; blockId: string }
  /** Batch 732: another piece of the same multi-piece block that still holds tissue. */
  | { kind: 'otherPiece'; pieceId: string };

/** The choices for one exhausted block: per line (by its index in the order) and the reason. */
export interface ExhaustedBlockChoice {
  lines: Record<number, ExhaustedLineChoice | undefined>;
  reason: string;
  /** Batch 736: the code of the bench reason picked (Reason Dictionary id); absent when only a note was typed. */
  reasonCode?: string;
}

export type ExhaustedLineProblem = 'needsNewSection' | 'chooseAlternative' | 'slideUnavailable' | 'blockUnusable' | 'pieceUnusable';

export type ExhaustedLineCheck =
  | { line: number; ok: true; choice: ExhaustedLineChoice }
  | { line: number; ok: false; problem: ExhaustedLineProblem };

/** Each line's outcome on the exhausted block. A line with no choice is blocked: "needs a new section" when it is a
 *  recut or levels, otherwise "choose an alternative". An unstained slide can take one line only. */
export function checkExhaustedLines(
  specimen: Pick<Specimen, 'label' | 'blocks'>, blockId: string, lines: readonly ExhaustedLineLike[], choice: ExhaustedBlockChoice | undefined,
): ExhaustedLineCheck[] {
  const block = (specimen.blocks ?? []).find(b => b.id === blockId);
  const free = new Set(block ? unstainedSlidesOf(block).map(s => s.id) : []);
  const usable = new Set((specimen.blocks ?? []).filter(b => b.id !== blockId && blockCanBeCut(b)).map(b => b.id));
  const pieces = new Set(block && !isExhausted(block) ? remainingPieces(block).map(p => p.id) : []);
  return lines.map((line, i): ExhaustedLineCheck => {
    const c = choice?.lines[i];
    if (!c) return { line: i, ok: false, problem: lineNeedsNewSection(line) ? 'needsNewSection' : 'chooseAlternative' };
    if (c.kind === 'useSlide') {
      if (lineNeedsNewSection(line)) return { line: i, ok: false, problem: 'needsNewSection' };
      if (!free.has(c.slideId)) return { line: i, ok: false, problem: 'slideUnavailable' };
      free.delete(c.slideId);
      return { line: i, ok: true, choice: c };
    }
    if (c.kind === 'otherBlock' && !usable.has(c.blockId)) return { line: i, ok: false, problem: 'blockUnusable' };
    if (c.kind === 'otherPiece' && !pieces.has(c.pieceId)) return { line: i, ok: false, problem: 'pieceUnusable' };
    return { line: i, ok: true, choice: c };
  });
}

/** Whether the order can go ahead on this block: every line has a valid choice and a reason is given. */
export function exhaustedChoiceProblems(checks: readonly ExhaustedLineCheck[], reason: string | undefined): { blockedLines: number[]; reasonMissing: boolean } {
  return { blockedLines: checks.filter(c => !c.ok).map(c => c.line), reasonMissing: !reason?.trim() };
}

// ─── Applying a choice ──────────────────────────────────────────────────────

/** The order details an unstained slide takes when an order is put on it. */
export type SlideOrderFields = Pick<StainOrder, 'stainName'> & Partial<Pick<StainOrder,
  'addOnPriority' | 'orderedByPathologistId' | 'orderedByPathologistName' | 'orderedAt' | 'addOnPanelId' | 'addOnPanelName'
  | 'slideMediaType' | 'cuttingInstructions' | 'routedQueueLabel' | 'routedWorkflowStage' | 'sendOutReferenceLabFacilityId'
  | 'sendOutReferenceLabName' | 'performingLabFacilityId'>>;

/** The order fields of an existing order (used when an exception is answered with "use an unstained slide"). */
export function orderFieldsOf(order: StainOrder): SlideOrderFields {
  return {
    stainName: order.stainName, addOnPriority: order.addOnPriority, orderedByPathologistId: order.orderedByPathologistId,
    orderedByPathologistName: order.orderedByPathologistName, orderedAt: order.orderedAt, addOnPanelId: order.addOnPanelId,
    addOnPanelName: order.addOnPanelName, slideMediaType: order.slideMediaType, cuttingInstructions: order.cuttingInstructions,
    routedQueueLabel: order.routedQueueLabel, routedWorkflowStage: order.routedWorkflowStage,
    sendOutReferenceLabFacilityId: order.sendOutReferenceLabFacilityId, sendOutReferenceLabName: order.sendOutReferenceLabName,
    performingLabFacilityId: order.performingLabFacilityId,
  };
}

/** Puts an order on an unstained slide already cut: the slide keeps its id, level and status and takes the stain. */
export function orderOnUnstainedSlide(specimen: Specimen, blockId: string, slideId: string, fields: SlideOrderFields): Specimen | null {
  const block = (specimen.blocks ?? []).find(b => b.id === blockId);
  if (!block || !unstainedSlidesOf(block).some(s => s.id === slideId)) return null;
  const stains = block.stains.map(s => (s.id !== slideId ? s : { ...s, ...fields, userAdded: true }));
  return { ...specimen, blocks: (specimen.blocks ?? []).map(b => (b.id !== blockId ? b : { ...b, stains, userModified: true })) };
}

/** The "waiting for re-embedding" exception put on an order placed on an exhausted block. */
export function reembedException(actor: Actor, note: string | undefined, now: string): AddOnOrderException {
  return { reason: 'Block exhausted', note, flaggedBy: actor.id, flaggedByName: actor.name, flaggedAt: now, status: 'reembed_requested', blockStatusBefore: 'Embedded' };
}

function event(action: AddOnOrderExceptionEvent['action'], actor: Actor, detail: string, now: string): AddOnOrderExceptionEvent {
  return { id: `exev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, action, timestamp: now, actorId: actor.id, actorName: actor.name, detail };
}

/** A copy of an order on another block: a new slide (next level), Pending Cut, no exception. */
export function copyOrderToBlock(specimen: Specimen, order: StainOrder, toBlockId: string, fullAccession: string): { specimen: Specimen; newId: string } | null {
  const to = (specimen.blocks ?? []).find(b => b.id === toBlockId);
  if (!to || !blockCanBeCut(to)) return null;
  const newId = `stain-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const copy: StainOrder = {
    ...orderFieldsOf(order), id: newId, status: 'Pending Cut', userAdded: true, printStatus: 'Pending',
    levelDepthMicrons: order.levelDepthMicrons, onSlideControlTissue: order.onSlideControlTissue,
    displayId: slideIdentifier(fullAccession, specimen.label, to.label, `L${nextSlideLevelNumber(to.stains)}`),
  };
  return { specimen: { ...specimen, blocks: (specimen.blocks ?? []).map(b => (b.id !== toBlockId ? b : { ...b, stains: [...b.stains, copy], userModified: true })) }, newId };
}

export type ExhaustionAlternative =
  | { kind: 'useSlide'; slideId: string }
  | { kind: 'reembed' }
  | { kind: 'otherBlock'; blockId: string };

/** The pathologist answers an open "Block exhausted" flag with one of the alternatives (spec §10.6: the same choices
 *  appear at the Microtome's flag). The block stays Exhausted in every case:
 *   • useSlide: the order goes onto an unstained slide already cut; the flagged order is cancelled;
 *   • reembed: the order waits for the block to be re-embedded (cutting stays held until then);
 *   • otherBlock: the order is placed on another block of the same part; the flagged order is cancelled. */
export function resolveExhaustionWithAlternative(
  specimen: Specimen, blockId: string, stainOrderId: string, alternative: ExhaustionAlternative, note: string | undefined, actor: Actor, fullAccession: string,
): { ok: true; specimen: Specimen } | { ok: false; error: 'notFound' | 'noOpenFlag' | 'slideUnavailable' | 'blockUnusable' } {
  const block = (specimen.blocks ?? []).find(b => b.id === blockId);
  const order = block?.stains.find(s => s.id === stainOrderId);
  if (!block || !order) return { ok: false, error: 'notFound' };
  if (order.exception?.reason !== 'Block exhausted' || order.exception.status !== 'pending_pathologist_review') return { ok: false, error: 'noOpenFlag' };
  const now = new Date().toISOString();
  const response = { pathologistResponseBy: actor.id, pathologistResponseByName: actor.name, pathologistResponseAt: now, responseNote: note };
  const suffix = note ? ` — ${note}` : '';

  let working: Specimen = specimen;
  let status: AddOnOrderException['status'];
  let detail: string;
  let cancel = true;
  if (alternative.kind === 'useSlide') {
    if (orderNeedsNewSection(order)) return { ok: false, error: 'slideUnavailable' };
    const slide = block.stains.find(s => s.id === alternative.slideId);
    const placed = slide ? orderOnUnstainedSlide(working, blockId, alternative.slideId, orderFieldsOf(order)) : null;
    if (!slide || !placed) return { ok: false, error: 'slideUnavailable' };
    working = placed;
    status = 'used_unstained';
    detail = `Placed on unstained slide ${slide.displayId ?? slideLevelOf(slide, block.stains.indexOf(slide))}${suffix}`;
  } else if (alternative.kind === 'otherBlock') {
    const to = (specimen.blocks ?? []).find(b => b.id === alternative.blockId);
    const moved = copyOrderToBlock(working, order, alternative.blockId, fullAccession);
    if (!to || !moved) return { ok: false, error: 'blockUnusable' };
    working = moved.specimen;
    status = 'moved_to_other_block';
    detail = `Moved to block ${specimen.label}${to.label}${suffix}`;
  } else {
    status = 'reembed_requested';
    detail = `Re-embedding requested; the order waits until the block is re-embedded${suffix}`;
    cancel = false;
  }
  // Batch 732 (review): the order's separate control slide, still waiting to be cut, goes with it: moved with the
  // order to the other block, or cancelled when the order goes onto an unstained slide.
  const control = order.pairedControlSlideId ? block.stains.find(s => s.id === order.pairedControlSlideId && s.status === 'Pending Cut') : undefined;
  if (control && alternative.kind === 'otherBlock') {
    const newOrderId = (working.blocks ?? []).find(b => b.id === alternative.blockId)?.stains.slice(-1)[0]?.id;
    const movedControl = copyOrderToBlock(working, control, alternative.blockId, fullAccession);
    if (movedControl) {
      working = { ...movedControl.specimen, blocks: (movedControl.specimen.blocks ?? []).map(b => (b.id !== alternative.blockId ? b : {
        ...b, stains: b.stains.map(s => (s.id === movedControl.newId ? { ...s, isControlSlide: true, pairedControlSlideId: newOrderId }
          : s.id === newOrderId ? { ...s, pairedControlSlideId: movedControl.newId } : s)),
      })) };
    }
  }
  const blocks = (working.blocks ?? []).map(b => (b.id !== blockId ? b : {
    ...b,
    stains: b.stains.map(s => (control && cancel && s.id === control.id ? { ...s, status: 'Cancelled' as const } : s.id !== stainOrderId ? s : {
      ...s,
      ...(cancel ? { status: 'Cancelled' as const } : {}),
      exception: { ...order.exception!, ...response, status },
      exceptionEvents: [...(order.exceptionEvents ?? []), event(status, actor, detail, now)],
    })),
  }));
  return { ok: true, specimen: { ...working, blocks } };
}

/** The lab has re-embedded the block's remnant or wet tissue: the block can be cut again (its status goes back to
 *  Embedded) and every order waiting for it is released to the Microtome. */
export function completeReembed(specimen: Specimen, blockId: string, actor: Actor, note: string | undefined): { ok: true; specimen: Specimen; released: number } | { ok: false; error: 'notFound' | 'nothingWaiting' } {
  const block = (specimen.blocks ?? []).find(b => b.id === blockId);
  if (!block) return { ok: false, error: 'notFound' };
  const waiting = new Set(ordersAwaitingReembed(block).map(s => s.id));
  if (waiting.size === 0) return { ok: false, error: 'nothingWaiting' };
  const now = new Date().toISOString();
  const detail = `Block re-embedded${note ? ` — ${note}` : ''}`;
  const stains = block.stains.map(s => (!waiting.has(s.id) ? s : {
    ...s, exception: { ...s.exception!, status: 'reembedded' as const }, exceptionEvents: [...(s.exceptionEvents ?? []), event('reembedded', actor, detail, now)],
  }));
  const before = [...waiting].map(id => block.stains.find(s => s.id === id)?.exception?.blockStatusBefore).find(Boolean);
  const status = before && before !== 'Exhausted' ? before : 'Embedded';
  // Batch 732: the pieces the waiting orders were for hold tissue again (none named: every piece).
  const waitingOrders = [...waiting].map(id => block.stains.find(s => s.id === id));
  const wholeBlock = waitingOrders.some(o => !o?.pieceIds?.length);
  const refreshed = new Set(waitingOrders.flatMap(o => o?.pieceIds ?? []));
  const pieces = block.pieces?.map(p => (wholeBlock || refreshed.has(p.id) ? { ...p, exhaustedAt: undefined, exhaustedByName: undefined } : p));
  return { ok: true, specimen: { ...specimen, blocks: (specimen.blocks ?? []).map(b => (b.id !== blockId ? b : { ...b, status, stains, ...(pieces ? { pieces } : {}), userModified: true })) }, released: waiting.size };
}

// ─── The builder's form values ──────────────────────────────────────────────

/** One select value per choice ('' = none chosen): slide:<id>, reembed, block:<id>. */
export function encodeLineChoice(c: ExhaustedLineChoice | undefined): string {
  if (!c) return '';
  return c.kind === 'useSlide' ? `slide:${c.slideId}` : c.kind === 'otherBlock' ? `block:${c.blockId}` : c.kind === 'otherPiece' ? `piece:${c.pieceId}` : 'reembed';
}

export function decodeLineChoice(v: string): ExhaustedLineChoice | undefined {
  if (v === 'reembed') return { kind: 'reembed' };
  if (v.startsWith('slide:') && v.length > 6) return { kind: 'useSlide', slideId: v.slice(6) };
  if (v.startsWith('block:') && v.length > 6) return { kind: 'otherBlock', blockId: v.slice(6) };
  if (v.startsWith('piece:') && v.length > 6) return { kind: 'otherPiece', pieceId: v.slice(6) };
  return undefined;
}

/** The builder keeps choices per cart line (lines can be removed); the order needs them per line index. */
/** Batch 736: `reason` is the note typed; `pick` the bench reason tapped (its code and the words shown). */
export interface CartExhaustedChoice { byCart: Record<string, ExhaustedLineChoice | undefined>; reason: string; pick?: { code: string; label: string } }

/** `textOf` joins the picked reason and the note into the saved text (useBenchReasons). */
export function choicesForSubmit(
  cartIds: readonly string[], ui: Readonly<Record<string, CartExhaustedChoice>>,
  textOf: (choice: { code?: string; label?: string; note: string }) => string = c => c.note,
): Record<string, ExhaustedBlockChoice> {
  const out: Record<string, ExhaustedBlockChoice> = {};
  for (const [blockId, c] of Object.entries(ui)) {
    const choice = { code: c.pick?.code, label: c.pick?.label, note: c.reason };
    out[blockId] = {
      reason: textOf(choice), lines: Object.fromEntries(cartIds.map((id, i) => [i, c.byCart[id]])),
      ...(c.pick ? { reasonCode: c.pick.code } : {}),
    };
  }
  return out;
}

/** The choices a line can have: an unstained slide (not for a line that needs a new section), re-embedding (when
 *  the person may request it), or another block of the same part. */
export function lineChoiceOptions(remains: WhatRemains, line: ExhaustedLineLike, canRequestReembed: boolean): ExhaustedLineChoice[] {
  return [
    ...(lineNeedsNewSection(line) ? [] : remains.unstained.map((s): ExhaustedLineChoice => ({ kind: 'useSlide', slideId: s.id }))),
    ...(canRequestReembed ? [{ kind: 'reembed' } as ExhaustedLineChoice] : []),
    ...remains.otherPieces.map((p): ExhaustedLineChoice => ({ kind: 'otherPiece', pieceId: p.id })),
    ...remains.otherBlocks.map((b): ExhaustedLineChoice => ({ kind: 'otherBlock', blockId: b.id })),
  ];
}

// ─── Batch 733 (Pete, Oct 30, 2026): one flag per block, one answer for every waiting slide ──────────────────────

/** The slides a "Block exhausted" flag covers: the one flagged and every other slide on the block still waiting to be
 *  cut (not a control: a control moves with its order). */
export function waitingSlideIds(block: Pick<HistologyBlock, 'stains'>, flaggedId: string): string[] {
  const waiting = (block.stains ?? []).filter(s => s.status === 'Pending Cut' && !s.isControlSlide
    && s.exception?.status !== 'pending_pathologist_review' && s.exception?.status !== 'reembed_requested').map(s => s.id);
  return [...new Set([flaggedId, ...waiting])];
}

/** The open "Block exhausted" flags on a block (the slides one answer covers). */
export function openExhaustionFlags(block: Pick<HistologyBlock, 'stains'>): StainOrder[] {
  return (block.stains ?? []).filter(s => s.exception?.reason === 'Block exhausted' && s.exception.status === 'pending_pathologist_review' && s.status !== 'Cancelled');
}

/** Whether "Approve Destructive Cutting" may be offered: only while tissue may still remain, that is when the block
 *  was not already Exhausted before this flag (Pete, Oct 30, 2026; spec §10.6: consuming the last tissue creates
 *  none, but an exhausted block has nothing left to cut). */
export function destructiveCutAllowed(order: Pick<StainOrder, 'exception'>): boolean {
  return order.exception?.reason === 'Block exhausted' && order.exception.status === 'pending_pathologist_review'
    && order.exception.blockStatusBefore !== 'Exhausted';
}

/** Flags the block exhausted once, on every slide still waiting to be cut (Batch 733). The block's status before the
 *  flag is remembered on each, so Cancel or Modify can put it back. */
/** Batch 736: `reasonCode` is the picked bench reason's code (Reason Dictionary), kept beside the text. */
export function flagBlockExhaustedOnce(specimen: Specimen, blockId: string, flaggedId: string, note: string | undefined, actor: Actor, reasonCode?: string):
  { ok: true; specimen: Specimen; flaggedIds: string[] } | { ok: false; error: string } {
  const block = (specimen.blocks ?? []).find(b => b.id === blockId);
  const first = block?.stains.find(s => s.id === flaggedId);
  if (!block || !first) return { ok: false, error: 'Order not found on this block.' };
  if (first.exception?.status === 'pending_pathologist_review') return { ok: false, error: 'An exception is already open on this order.' };
  const ids = new Set(waitingSlideIds(block, flaggedId));
  const now = new Date().toISOString();
  const statusBefore = block.status;
  const detail = withReasonCode(`Block exhausted${note ? ` — ${note}` : ''}${ids.size > 1 ? ` (one flag for ${ids.size} waiting slides)` : ''}`, reasonCode);
  const stains = block.stains.map(s => (!ids.has(s.id) ? s : {
    ...s,
    exception: { reason: 'Block exhausted' as const, note, ...(reasonCode ? { reasonCode } : {}), flaggedBy: actor.id, flaggedByName: actor.name, flaggedAt: now, status: 'pending_pathologist_review' as const, blockStatusBefore: statusBefore },
    exceptionEvents: [...(s.exceptionEvents ?? []), event('flagged', actor, detail, now)],
  }));
  const blocks = (specimen.blocks ?? []).map(b => (b.id !== blockId ? b : { ...b, status: 'Exhausted' as const, stains }));
  return { ok: true, specimen: { ...specimen, blocks }, flaggedIds: [...ids] };
}

export type GroupAlternativeProblem = 'needsNewSection' | 'notEnoughSlides';

/** For one answer covering several flagged slides with "use an unstained slide": the chosen slide for the first, then
 *  the block's other free unstained slides in order. Refused when one of them needs a new section, or there are not
 *  enough slides (then the pathologist answers slide by slide). */
export function unstainedSlidesForGroup(block: Pick<HistologyBlock, 'stains'>, orders: readonly StainOrder[], chosenSlideId: string):
  { ok: true; slideByOrder: Record<string, string> } | { ok: false; problem: GroupAlternativeProblem } {
  if (orders.some(o => orderNeedsNewSection(o))) return { ok: false, problem: 'needsNewSection' };
  const free = unstainedSlidesOf(block).map(s => s.id);
  const pool = [chosenSlideId, ...free.filter(id => id !== chosenSlideId)].filter(id => free.includes(id));
  if (pool.length < orders.length) return { ok: false, problem: 'notEnoughSlides' };
  return { ok: true, slideByOrder: Object.fromEntries(orders.map((o, i) => [o.id, pool[i]])) };
}
