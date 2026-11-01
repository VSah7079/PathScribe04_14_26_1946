// src/utils/microtomyOperations.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-284 (Microtome Workstation). Pure, testable functions —
// same real shape as grossingScreenOperations.ts's own extraction:
// genuinely worth verifying in isolation (print-status transitions,
// the printed-vs-unprinted removal-reason gate, control-slide pairing)
// without driving a real page component to do it. The caller
// (useMicrotomyWorkstation.ts) is responsible for persisting the
// returned Specimen via caseRouter.updateCase — these functions never
// touch case data themselves.
//
// Real, deliberate scope note on control-slide pairing: this creates
// a second StainOrder on the SAME block, cross-linked via
// pairedControlSlideId — the real, physical thing a microtome tech
// does when pairing happens at order time (an extra slide cut
// alongside the clinical one). This is genuinely separate from
// shouldAutoAppendControl.ts's own, already-real mechanism (Stain QC
// Module §2.3), which creates a synthetic CONTROL CASE at the batch/
// QC level, not a same-block sibling slide. Reconciling whether these
// two real control-slide paths should ever be unified is a real,
// separate design question, not resolved here.
// ─────────────────────────────────────────────────────────────────────────────

import { slideIdentifier } from '@/types/labels/LabelData';
import type { HistologyBlock, Specimen, StainOrder } from '@/types/case/Specimen';
import type { Decant } from '@/types/case/Material';
import type { MaterialComment } from '@/types/case/MaterialComment';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import type { Case } from '@/types/case/Case';
import { nextSlideLevelNumber } from '@/services/material/slideLevels';
import { cuttingBlockedByExhaustion } from '@/utils/blockExceptionStates';
import type { StainType } from '@/services/stains/IStainService';
import type { CytologyPrepSuggestion } from '@/services/cytology/computeCytologyPrepSuggestions';

export type MicrotomyOperationResult =
  | { ok: true; specimen: Specimen }
  | { ok: false; error: string }
  | { ok: false; needsReason: true };

/** Real, per the spec's own "Remove/Cancel Stain... cancellation
 *  reason required (Damaged Section, Ordered in Error, Tissue
 *  Exhausted) if removing after a slide has already printed." */
export const MICROTOMY_CANCEL_REASONS = ['Damaged Section', 'Ordered in Error', 'Tissue Exhausted', 'Other'] as const;
export type MicrotomyCancelReason = typeof MICROTOMY_CANCEL_REASONS[number];

/** Real, per the spec's own "dedicated Reprint button requiring
 *  single-tap reason selection." */
export const MICROTOMY_REPRINT_REASONS = ['Jam', 'Scratched Glass', 'Misprint', 'Other'] as const;

/** Batch 388: the reasons are stored as these English values (audit and label
 *  records); the screen shows them through `microtomyWorkstation.reasons.<key>`. */
export const MICROTOMY_REASON_KEYS: Record<typeof MICROTOMY_CANCEL_REASONS[number] | typeof MICROTOMY_REPRINT_REASONS[number], string> = {
  'Damaged Section': 'damagedSection', 'Ordered in Error': 'orderedInError', 'Tissue Exhausted': 'tissueExhausted', 'Other': 'other',
  'Jam': 'jam', 'Scratched Glass': 'scratchedGlass', 'Misprint': 'misprint',
};

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function findBlock(specimen: Specimen, blockId: string): HistologyBlock | undefined {
  return (specimen.blocks ?? []).find(b => b.id === blockId);
}

function findDecant(specimen: Specimen, decantId: string): Decant | undefined {
  return (specimen.decants ?? []).find(d => d.id === decantId);
}

function replaceBlockStains(specimen: Specimen, blockId: string, stains: StainOrder[], extra?: Partial<HistologyBlock>): Specimen {
  return {
    ...specimen,
    blocks: (specimen.blocks ?? []).map(b => b.id !== blockId ? b : { ...b, ...extra, stains }),
  };
}

function replaceDecantStains(specimen: Specimen, decantId: string, stains: StainOrder[]): Specimen {
  return {
    ...specimen,
    decants: (specimen.decants ?? []).map(d => d.id !== decantId ? d : { ...d, stains }),
  };
}

/** Real, first unprinted slide on a block, per the spec's own
 *  "On-Demand: auto-selects first unprinted slide on Block barcode
 *  scan or Block selection from queue." A slide with no printStatus
 *  at all (predates this field) counts as unprinted — same real
 *  "undefined means never attempted" posture as the field's own doc
 *  comment. 'Printing' is deliberately excluded — a slide already
 *  mid-dispatch is never re-selected as "next." */
export function computeNextUnprintedStain(stains: StainOrder[]): StainOrder | undefined {
  return stains.find(s => s.printStatus === undefined || s.printStatus === 'Pending' || s.printStatus === 'Failed');
}

/** Real, per the spec's own Add Stain Quick-Picker: "configurable
 *  duplicate count, level depth/microtome step distance,
 *  control-slide pairing checkbox." Works against a block's own
 *  stains array directly — caller passes which real block. */
export function addMicrotomyStain(
  specimen: Specimen,
  blockId: string,
  stainType: StainType,
  fullAccession: string,
  options: { duplicateCount?: number; levelDepthMicrons?: number; pairWithControl?: boolean } = {},
): MicrotomyOperationResult {
  const block = findBlock(specimen, blockId);
  if (!block) return { ok: false, error: 'Block not found.' };

  const duplicateCount = Math.max(1, options.duplicateCount ?? 1);
  const newStains: StainOrder[] = [];
  // Batch 460: past the highest level used (a removed slide's level is never reused).
  let nextLevel = nextSlideLevelNumber(block.stains) - 1;

  for (let i = 0; i < duplicateCount; i++) {
    nextLevel += 1;
    const clinical: StainOrder = {
      id: genId('stain'),
      stainName: stainType.name,
      status: 'Pending Cut',
      displayId: slideIdentifier(fullAccession, specimen.label, block.label, `L${nextLevel}`),
      userAdded: true,
      levelDepthMicrons: options.levelDepthMicrons,
      printStatus: 'Pending',
    };
    newStains.push(clinical);

    if (options.pairWithControl) {
      nextLevel += 1;
      const controlId = genId('stain');
      const control: StainOrder = {
        id: controlId,
        stainName: `${stainType.name} (Control)`,
        status: 'Pending Cut',
        displayId: slideIdentifier(fullAccession, specimen.label, block.label, `L${nextLevel}`),
        userAdded: true,
        isControlSlide: true,
        pairedControlSlideId: clinical.id,
        printStatus: 'Pending',
      };
      clinical.pairedControlSlideId = controlId;
      newStains.push(control);
    }
  }

  return { ok: true, specimen: replaceBlockStains(specimen, blockId, [...block.stains, ...newStains], { userModified: true }) };
}

/** Real, per the spec's own "Remove/Cancel Stain: direct delete on
 *  unprinted rows; cancellation reason required... if removing after
 *  a slide has already printed." Pass `reason` only once the caller's
 *  own real reason-selection UI has answered it — this function never
 *  shows UI itself, same real convention as removeGrossingStain's own
 *  confirmed flag. */
export function removeMicrotomyStain(
  specimen: Specimen,
  blockId: string,
  stainId: string,
  reason?: MicrotomyCancelReason,
): MicrotomyOperationResult {
  const block = findBlock(specimen, blockId);
  if (!block) return { ok: false, error: 'Block not found.' };
  const stain = block.stains.find(s => s.id === stainId);
  if (!stain) return { ok: false, error: 'Stain not found.' };

  const alreadyPrinted = stain.printStatus === 'Printed' || stain.printStatus === 'Printing';
  if (alreadyPrinted && !reason) return { ok: false, needsReason: true };

  // Real, deliberate choice: a printed slide is never silently
  // deleted from the record (it's a real, physical label that already
  // left the printer) — it's marked Canceled instead, same "never
  // silently reversible" posture as disposedAt elsewhere in this app.
  // An unprinted slide has nothing physical yet, so a direct delete is
  // safe and matches the spec's own "direct delete on unprinted rows."
  const updatedStains = alreadyPrinted
    ? block.stains.map(s => s.id !== stainId ? s : { ...s, status: 'Cancelled' as const, printStatus: 'Canceled' as const, printFailureReason: reason })
    : block.stains.filter(s => s.id !== stainId);

  return { ok: true, specimen: replaceBlockStains(specimen, blockId, updatedStains) };
}

/** Real, called once dispatch has actually begun — sets 'Printing'
 *  optimistically before the real async printCassetteSlideLabel call
 *  resolves, so a batch progress UI reflects "in flight" honestly
 *  rather than jumping straight from Pending to a final state. */
export function markStainPrinting(specimen: Specimen, blockId: string, stainId: string): MicrotomyOperationResult {
  const block = findBlock(specimen, blockId);
  if (!block) return { ok: false, error: 'Block not found.' };
  // Batch 460: a slide removed meanwhile (on a newer copy of the case) is not printed.
  if (!block.stains.some(s => s.id === stainId)) return { ok: false, error: 'Stain not found.' };
  // Batch 610 (#16): a block flagged as exhausted is not cut until the pathologist answers.
  if (cuttingBlockedByExhaustion(block)) return { ok: false, error: 'Block exhausted: cutting is blocked until the ordering pathologist answers.' };
  const updatedStains = block.stains.map(s => s.id !== stainId ? s : { ...s, printStatus: 'Printing' as const, printFailureReason: undefined });
  return { ok: true, specimen: replaceBlockStains(specimen, blockId, updatedStains) };
}

/** Real, records the real, final outcome of a dispatch attempt —
 *  printedAt/printedBy on success, printFailureReason on failure.
 *  Never throws; the caller decides what a failure means for the
 *  rest of a batch run (stop vs. continue). */
export function markStainPrintResult(
  specimen: Specimen,
  blockId: string,
  stainId: string,
  // Real, per this codebase's own established gotcha (see
  // services/reports/README.md — "a real, found-and-fixed TypeScript
  // gotcha worth remembering"): this project's tsconfig has
  // strictNullChecks: false, under which a discriminated union
  // (`{ok: true} | {ok: false; message: string}`) doesn't reliably
  // narrow on `if (result.ok)`. Using the same fix already established
  // there — a single shape with an optional field — rather than
  // discrimination.
  result: { ok: boolean; message?: string },
  actor: string,
): MicrotomyOperationResult {
  const block = findBlock(specimen, blockId);
  if (!block) return { ok: false, error: 'Block not found.' };
  const updatedStains = block.stains.map(s => {
    if (s.id !== stainId) return s;
    if (result.ok) {
      return { ...s, printStatus: 'Printed' as const, printedAt: new Date().toISOString(), printedBy: actor, printFailureReason: undefined };
    }
    return { ...s, printStatus: 'Failed' as const, printFailureReason: result.message ?? 'Print failed.' };
  });
  return { ok: true, specimen: replaceBlockStains(specimen, blockId, updatedStains) };
}

/** Real, per the spec's own "dedicated Reprint button requiring
 *  single-tap reason selection... for duplicate-label auditing."
 *  Resets printStatus to 'Pending' so the real dispatch path picks it
 *  straight back up (computeNextUnprintedStain, or a direct
 *  print-this-row action) — reprintCount is the real, cumulative
 *  audit trail, never cleared. */
export function reprintMicrotomyStain(
  specimen: Specimen,
  blockId: string,
  stainId: string,
  reason: typeof MICROTOMY_REPRINT_REASONS[number],
  actor: string,
): MicrotomyOperationResult {
  const block = findBlock(specimen, blockId);
  if (!block) return { ok: false, error: 'Block not found.' };
  const stain = block.stains.find(s => s.id === stainId);
  if (!stain) return { ok: false, error: 'Stain not found.' };
  const updatedStains = block.stains.map(s => s.id !== stainId ? s : {
    ...s,
    printStatus: 'Pending' as const,
    printFailureReason: undefined,
    lastReprintReason: reason,
    lastReprintOrderedBy: actor,
    lastReprintOrderedAt: new Date().toISOString(),
    reprintCount: (s.reprintCount ?? 0) + 1,
  });
  return { ok: true, specimen: replaceBlockStains(specimen, blockId, updatedStains) };
}

/** Real, per the spec's own "drag-and-drop slide re-ordering before
 *  firing batch jobs." `orderedStainIds` is the caller's own real,
 *  already-reordered id list (e.g. from a drag handler) — any id not
 *  present is dropped defensively rather than silently duplicated. */
export function reorderBlockStains(specimen: Specimen, blockId: string, orderedStainIds: string[]): MicrotomyOperationResult {
  const block = findBlock(specimen, blockId);
  if (!block) return { ok: false, error: 'Block not found.' };
  const byId = new Map(block.stains.map(s => [s.id, s]));
  const reordered = orderedStainIds.map(id => byId.get(id)).filter((s): s is StainOrder => !!s);
  // Real, defensive completeness check — any stain not present in the
  // caller's own reorder list (a real bug, or a stale snapshot) is
  // appended at the end rather than silently dropped from the block.
  const missing = block.stains.filter(s => !orderedStainIds.includes(s.id));
  return { ok: true, specimen: replaceBlockStains(specimen, blockId, [...reordered, ...missing]) };
}

/** Real, per the spec's own Comment Systems: "Slide-level: editable
 *  text per row; toggle for whether a comment prints on the
 *  human-readable label area or stays LIS-only." */
export function updateStainComment(
  specimen: Specimen,
  blockId: string,
  stainId: string,
  text: string,
  printsOnLabel: boolean,
  actor: { id: string; name: string },
): MicrotomyOperationResult {
  const block = findBlock(specimen, blockId);
  if (!block) return { ok: false, error: 'Block not found.' };
  const comment: MaterialComment = { id: genId('comment'), authorId: actor.id, authorName: actor.name, text, createdAt: new Date().toISOString() };
  const updatedStains = block.stains.map(s => s.id !== stainId ? s : { ...s, comments: [...(s.comments ?? []), comment], commentPrintsOnLabel: printsOnLabel });
  return { ok: true, specimen: replaceBlockStains(specimen, blockId, updatedStains) };
}

/** Real, per the spec's own Comment Systems: "Block-level: read/write
 *  grossing notes." Reuses HistologyBlock.comments — already real,
 *  already MaterialComment-typed, no new field needed. */
export function updateBlockComment(
  specimen: Specimen,
  blockId: string,
  text: string,
  actor: { id: string; name: string },
): MicrotomyOperationResult {
  const block = findBlock(specimen, blockId);
  if (!block) return { ok: false, error: 'Block not found.' };
  const comment: MaterialComment = { id: genId('comment'), authorId: actor.id, authorName: actor.name, text, createdAt: new Date().toISOString() };
  const updatedComments = [...(block.comments ?? []), comment];
  return {
    ok: true,
    specimen: {
      ...specimen,
      blocks: (specimen.blocks ?? []).map(b => b.id !== blockId ? b : { ...b, comments: updatedComments }),
    },
  };
}

/** Real, per the spec's own Block-level "high-contrast alert badges
 *  for Tiny Tissue, Decal Required, Fragile." requiresDecal already
 *  existed; this toggles all three through one real entry point. */
export function setBlockAlertFlags(
  specimen: Specimen,
  blockId: string,
  flags: { tinyTissue?: boolean; fragile?: boolean; requiresDecal?: boolean },
): MicrotomyOperationResult {
  const block = findBlock(specimen, blockId);
  if (!block) return { ok: false, error: 'Block not found.' };
  return {
    ok: true,
    specimen: {
      ...specimen,
      blocks: (specimen.blocks ?? []).map(b => b.id !== blockId ? b : { ...b, ...flags }),
    },
  };
}

// ── Cytology / Decant panel ─────────────────────────────────────────────────

/** Real, per the spec's own "Specimen Fluid/Decant Panel: Total
 *  Volume (mL), Appearance, Decant Yield/Pellet Size." */
export function updateDecantCytologyFields(
  specimen: Specimen,
  decantId: string,
  fields: { totalVolumeMl?: number; appearance?: Decant['appearance']; yieldPelletSize?: Decant['yieldPelletSize'] },
): MicrotomyOperationResult {
  const decant = findDecant(specimen, decantId);
  if (!decant) return { ok: false, error: 'Decant not found.' };
  return {
    ok: true,
    specimen: {
      ...specimen,
      decants: (specimen.decants ?? []).map(d => d.id !== decantId ? d : { ...d, ...fields }),
    },
  };
}

/** Real, default stain a slide of a given preparation method is cut
 *  for absent a specific tech choice — see this file's own header
 *  reasoning for computeCytologyPrepSuggestions.ts's honest,
 *  illustrative scope. Never enforced; the returned StainOrder rows
 *  go through the exact same StainMultiSelect editing surface as
 *  every other slide afterward, so a tech can change any of these on
 *  the spot. */
function defaultCytologyStainNameFor(method: CytologyPrepSuggestion['preparationMethod']): string {
  switch (method) {
    case 'ThinPrep/Liquid-Based': return 'Pap Smear, Liquid-Based (ThinPrep)';
    case 'Direct Smear (Air-Dried)': return 'Diff-Quik / Wright-Giemsa';
    case 'Direct Smear (Fixed)': return 'Pap Smear, Conventional';
    case 'Cytospin': return 'Diff-Quik / Wright-Giemsa';
    case 'Cell Block': return 'H&E';
  }
}

/** Batch 669 (ws-5): what is still to add of the suggested slides. A decant slide of the same preparation method that
 *  is not cancelled counts as already added (whether it came from an earlier accept or was added by hand), so pressing
 *  Accept suggestion again adds nothing new. Pure. */
export function remainingPrepSuggestions(stains: readonly StainOrder[], suggestions: readonly CytologyPrepSuggestion[]): CytologyPrepSuggestion[] {
  return suggestions
    .map(s => ({
      ...s,
      count: s.count - stains.filter(st => st.preparationMethod === s.preparationMethod && st.status !== 'Cancelled' && st.printStatus !== 'Canceled').length,
    }))
    .filter(s => s.count > 0);
}

/** Real, per the spec's own Dynamic Preparation Rules — creates the
 *  real StainOrder rows a tech accepted from
 *  computeCytologyPrepSuggestions' own suggestion, one row per unit
 *  of `count`. Never called automatically; the tech's own explicit
 *  "accept suggestion" action in the UI is what invokes this.
 *  Batch 669 (ws-5): only what is missing is added (remainingPrepSuggestions); when every suggested slide is
 *  already there it refuses, so nothing is saved. */
export function applyCytologyPrepSuggestions(
  specimen: Specimen,
  decantId: string,
  suggestions: CytologyPrepSuggestion[],
  fullAccession: string,
): MicrotomyOperationResult {
  const decant = findDecant(specimen, decantId);
  if (!decant) return { ok: false, error: 'Decant not found.' };
  const missing = remainingPrepSuggestions(decant.stains, suggestions);
  if (missing.length === 0) return { ok: false, error: 'The suggested slides are already on this decant.' };
  const newStains: StainOrder[] = [];
  let nextLevel = nextSlideLevelNumber(decant.stains) - 1;
  for (const suggestion of missing) {
    for (let i = 0; i < suggestion.count; i++) {
      nextLevel += 1;
      newStains.push({
        id: genId('stain'),
        stainName: defaultCytologyStainNameFor(suggestion.preparationMethod),
        status: 'Pending Cut',
        displayId: slideIdentifier(fullAccession, specimen.label, decant.label, `L${nextLevel}`),
        preparationMethod: suggestion.preparationMethod,
        userAdded: true,
        printStatus: 'Pending',
      });
    }
  }
  return { ok: true, specimen: replaceDecantStains(specimen, decantId, [...decant.stains, ...newStains]) };
}

/** Real, decant-slide equivalent of addMicrotomyStain — a decant's
 *  own slides get the same real Add Stain Quick-Picker, minus the
 *  block-only control-pairing option (a cytology control slide, when
 *  one is genuinely needed, is a separate, real accession-level
 *  concern this app doesn't model yet — not silently faked here). */
export function addDecantStain(
  specimen: Specimen,
  decantId: string,
  stainType: StainType,
  fullAccession: string,
  preparationMethod?: StainOrder['preparationMethod'],
): MicrotomyOperationResult {
  const decant = findDecant(specimen, decantId);
  if (!decant) return { ok: false, error: 'Decant not found.' };
  const newStain: StainOrder = {
    id: genId('stain'),
    stainName: stainType.name,
    status: 'Pending Cut',
    displayId: slideIdentifier(fullAccession, specimen.label, decant.label, `L${nextSlideLevelNumber(decant.stains)}`),
    userAdded: true,
    preparationMethod,
    printStatus: 'Pending',
  };
  return { ok: true, specimen: replaceDecantStains(specimen, decantId, [...decant.stains, newStain]) };
}

export function removeDecantStain(
  specimen: Specimen,
  decantId: string,
  stainId: string,
  reason?: MicrotomyCancelReason,
): MicrotomyOperationResult {
  const decant = findDecant(specimen, decantId);
  if (!decant) return { ok: false, error: 'Decant not found.' };
  const stain = decant.stains.find(s => s.id === stainId);
  if (!stain) return { ok: false, error: 'Stain not found.' };
  const alreadyPrinted = stain.printStatus === 'Printed' || stain.printStatus === 'Printing';
  if (alreadyPrinted && !reason) return { ok: false, needsReason: true };
  const updatedStains = alreadyPrinted
    ? decant.stains.map(s => s.id !== stainId ? s : { ...s, status: 'Cancelled' as const, printStatus: 'Canceled' as const, printFailureReason: reason })
    : decant.stains.filter(s => s.id !== stainId);
  return { ok: true, specimen: replaceDecantStains(specimen, decantId, updatedStains) };
}

// ── Batch 460: slide order and matrix blocks ────────────────────────────────

/** The chosen slides in the grid's order (the order the tech arranged them
 *  in), not the order they were ticked. */
export function stainsInGridOrder(stains: readonly StainOrder[], chosenIds: Iterable<string>): StainOrder[] {
  const chosen = new Set(chosenIds);
  return stains.filter(s => chosen.has(s.id));
}

/** A matrix block worked at the Microtome is shown to every block operation as a
 *  one-block "specimen" with this id, so add/remove/print/reprint/reorder/
 *  comment/flags work on it unchanged. Its slides' ids come out as
 *  ACC-M1-L1 (matrixSlideIdentifier), since the view has no specimen letter. */
export const MATRIX_VIEW_SPECIMEN_ID = '__matrix-block-view__';

export function matrixBlockAsSpecimenView(matrixBlock: MatrixBlock): Specimen {
  // Batch 737 (spec §11.4, §11.5): the parts are the view's pieces (piece id = the part's specimen id), so an order
  // for a part and "Piece exhausted" work on a matrix block as on a multi-piece block.
  const pieces = [...matrixBlock.participants].sort((a, b) => a.positionInBlock - b.positionInBlock).map(p => ({
    id: p.specimenId, position: p.positionInBlock, partLabel: '', description: p.tissueType, orientation: p.orientation, ink: p.ink,
    exhaustedAt: p.exhaustedAt, exhaustedByName: p.exhaustedByName,
  }));
  const block = {
    id: matrixBlock.id, label: matrixBlock.label, status: matrixBlock.status,
    stains: matrixBlock.slides ?? [], comments: matrixBlock.comments, pieces,
    tinyTissue: matrixBlock.tinyTissue, fragile: matrixBlock.fragile, requiresDecal: matrixBlock.requiresDecal,
  } as unknown as HistologyBlock;
  return { id: MATRIX_VIEW_SPECIMEN_ID, label: '', blocks: [block] } as unknown as Specimen;
}

export function isMatrixView(specimen: Pick<Specimen, 'id'>): boolean {
  return specimen.id === MATRIX_VIEW_SPECIMEN_ID;
}

/** The matrix block as changed through its view. A slide added at the bench
 *  is cut through every core, so it targets every participant (the
 *  pathologist still confirms which cores were evaluated, for billing). */
export function matrixBlockFromSpecimenView(matrixBlock: MatrixBlock, view: Specimen): MatrixBlock {
  const block = (view.blocks ?? [])[0];
  if (!block) return matrixBlock;
  const everyone = matrixBlock.participants.map(p => p.specimenId);
  // Batch 737: a part used up through the view (its piece) is kept on the participant; the block's status follows.
  const used = new Map((block.pieces ?? []).filter(p => p.exhaustedAt).map(p => [p.id, p]));
  return {
    ...matrixBlock,
    status: block.status,
    participants: matrixBlock.participants.map(p => { const u = used.get(p.specimenId); return u && !p.exhaustedAt ? { ...p, exhaustedAt: u.exhaustedAt, exhaustedByName: u.exhaustedByName } : p; }),
    slides: block.stains.map(s => (s.targetSpecimenIds ? s : { ...s, targetSpecimenIds: everyone })),
    comments: block.comments,
    tinyTissue: (block as { tinyTissue?: boolean }).tinyTissue,
    fragile: (block as { fragile?: boolean }).fragile,
    requiresDecal: block.requiresDecal,
  };
}

/** What a Microtome work item is, by id, so a save can find it again on a
 *  newer copy of the case. */
export type MicrotomyTarget =
  | { kind: 'block'; specimenId: string; blockId: string }
  | { kind: 'decant'; specimenId: string; decantId: string }
  | { kind: 'matrix'; matrixBlockId: string };

/** The specimen (or matrix-block view) the operations work on, from a case. */
export function microtomyViewOf(caseData: Pick<Case, 'specimens' | 'matrixBlocks'>, target: MicrotomyTarget): Specimen | null {
  if (target.kind === 'matrix') {
    const mb = (caseData.matrixBlocks ?? []).find(m => m.id === target.matrixBlockId);
    return mb ? matrixBlockAsSpecimenView(mb) : null;
  }
  return (caseData.specimens ?? []).find(sp => sp.id === target.specimenId) ?? null;
}

/** The case change that stores an operation's result: the matrix block, or the specimens. */
export function microtomyCaseUpdates(caseData: Pick<Case, 'specimens' | 'matrixBlocks'>, view: Specimen): Pick<Case, 'specimens'> | Pick<Case, 'matrixBlocks'> {
  if (isMatrixView(view)) {
    const id = (view.blocks ?? [])[0]?.id;
    return { matrixBlocks: (caseData.matrixBlocks ?? []).map(mb => (mb.id === id ? matrixBlockFromSpecimenView(mb, view) : mb)) };
  }
  return { specimens: (caseData.specimens ?? []).map(sp => (sp.id === view.id ? view : sp)) };
}

/** Batch 460: a decant slide's print state (moved from the Microtome hook). */
export function markDecantStainPrinting(specimen: Specimen, decantId: string, stainId: string): MicrotomyOperationResult {
  const decant = findDecant(specimen, decantId);
  if (!decant) return { ok: false, error: 'Decant not found.' };
  if (!decant.stains.some(s => s.id === stainId)) return { ok: false, error: 'Stain not found.' };
  return { ok: true, specimen: replaceDecantStains(specimen, decantId, decant.stains.map(s => (s.id !== stainId ? s : { ...s, printStatus: 'Printing' as const, printFailureReason: undefined }))) };
}

export function markDecantStainPrintResult(specimen: Specimen, decantId: string, stainId: string, result: { ok: boolean; message?: string }, actor: string): MicrotomyOperationResult {
  const decant = findDecant(specimen, decantId);
  if (!decant) return { ok: false, error: 'Decant not found.' };
  return {
    ok: true,
    specimen: replaceDecantStains(specimen, decantId, decant.stains.map(s => (s.id !== stainId ? s : (result.ok
      ? { ...s, printStatus: 'Printed' as const, printedAt: new Date().toISOString(), printedBy: actor, printFailureReason: undefined }
      : { ...s, printStatus: 'Failed' as const, printFailureReason: result.message ?? 'Print failed.' })))),
  };
}

// ── Batch 669: decant slide comments and reprints, and Undo ────────────────

/** Batch 669 (ws-2): a comment on a decant slide (the block version is updateStainComment). */
export function updateDecantStainComment(
  specimen: Specimen,
  decantId: string,
  stainId: string,
  text: string,
  printsOnLabel: boolean,
  actor: { id: string; name: string },
): MicrotomyOperationResult {
  const decant = findDecant(specimen, decantId);
  if (!decant) return { ok: false, error: 'Decant not found.' };
  if (!decant.stains.some(s => s.id === stainId)) return { ok: false, error: 'Stain not found.' };
  const comment: MaterialComment = { id: genId('comment'), authorId: actor.id, authorName: actor.name, text, createdAt: new Date().toISOString() };
  return {
    ok: true,
    specimen: replaceDecantStains(specimen, decantId, decant.stains.map(s => s.id !== stainId ? s : { ...s, comments: [...(s.comments ?? []), comment], commentPrintsOnLabel: printsOnLabel })),
  };
}

/** Batch 669 (ws-2): a reprint of a decant slide, recorded the same way as a block slide's (reprintMicrotomyStain). */
export function reprintDecantStain(
  specimen: Specimen,
  decantId: string,
  stainId: string,
  reason: typeof MICROTOMY_REPRINT_REASONS[number],
  actor: string,
): MicrotomyOperationResult {
  const decant = findDecant(specimen, decantId);
  if (!decant) return { ok: false, error: 'Decant not found.' };
  if (!decant.stains.some(s => s.id === stainId)) return { ok: false, error: 'Stain not found.' };
  return {
    ok: true,
    specimen: replaceDecantStains(specimen, decantId, decant.stains.map(s => s.id !== stainId ? s : {
      ...s,
      printStatus: 'Pending' as const,
      printFailureReason: undefined,
      lastReprintReason: reason,
      lastReprintOrderedBy: actor,
      lastReprintOrderedAt: new Date().toISOString(),
      reprintCount: (s.reprintCount ?? 0) + 1,
    })),
  };
}

/** Batch 669 (ws-6): how long the Undo toast after Remove or Reprint stays. */
export const MICROTOMY_UNDO_WINDOW_MS = 8000;

/** The fields Remove and Reprint change on a slide; Undo puts only these back, so a comment added meanwhile is kept. */
const UNDO_FIELDS = ['status', 'printStatus', 'printFailureReason', 'printedAt', 'printedBy', 'lastReprintReason', 'lastReprintOrderedBy', 'lastReprintOrderedAt', 'reprintCount'] as const;

/** Batch 669 (ws-6): what Undo puts back after Remove or Reprint: the slide as it was (`snapshot`). A slide that Remove
 *  had deleted outright (an unprinted one) is put back at its place in the grid (`index`); one that is still there gets
 *  back only the fields Remove and Reprint change. Works for a block (or matrix block) and a decant. Pure. */
export function restoreStainOrder(
  specimen: Specimen,
  parent: { kind: 'block' | 'decant'; id: string },
  snapshot: StainOrder,
  index: number,
): MicrotomyOperationResult {
  const stains = parent.kind === 'block' ? findBlock(specimen, parent.id)?.stains : findDecant(specimen, parent.id)?.stains;
  if (!stains) return { ok: false, error: parent.kind === 'block' ? 'Block not found.' : 'Decant not found.' };
  const putBack = (current: StainOrder): StainOrder => {
    const next: StainOrder = { ...current };
    for (const k of UNDO_FIELDS) (next as unknown as Record<string, unknown>)[k] = (snapshot as unknown as Record<string, unknown>)[k];
    return next;
  };
  const restored = stains.some(s => s.id === snapshot.id)
    ? stains.map(s => (s.id === snapshot.id ? putBack(s) : s))
    : [...stains.slice(0, index), snapshot, ...stains.slice(index)];
  return { ok: true, specimen: parent.kind === 'block' ? replaceBlockStains(specimen, parent.id, restored) : replaceDecantStains(specimen, parent.id, restored) };
}
