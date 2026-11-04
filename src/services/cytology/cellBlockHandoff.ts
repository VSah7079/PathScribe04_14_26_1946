// src/services/cytology/cellBlockHandoff.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 740 (Pete, fluid decision 1, Oct 30, 2026): fluids are prepared at the Cytology Preparation bench, and only a
// finished cell block goes on to the Microtome. Pete's condition: the hand-off "enforces a strict electronic
// chain-of-custody scan (container-to-block or aliquot-to-block validation) to prevent phantom cell blocks".
//
//   • Which bench takes what (benchTakesDecant): the Cytology Preparation bench takes residual fluids, aliquots and
//     cell blocks; the Microtome takes only a cell block that has been handed off, and sends everything else back to
//     the preparation bench. A block is cut at the Microtome only.
//   • The hand-off (checkHandoffScans, handOffCellBlock): two scans at the preparation bench, the source the cell
//     block was made from (its parent decant, or, for a cell block made straight from the specimen, a fluid or
//     aliquot decant of the same specimen) and the cell block's own cassette. Both must match; then the cell block
//     carries `handoff` (who, when, the source scanned, the station) and the Microtome takes it. A cell block made at
//     Accession by a protocol is a planned cassette until this happens, so it can never be cut without a pellet.
//   • It needs `cytology:cell-block:hand-off` and is audited ("Cell Block Handed Off To Histology").
// Pure rules here; the save goes through the versioned decant change like every other decant edit.
// ─────────────────────────────────────────────────────────────────────────────

import type { Decant } from '@/types/case/Material';

export type Bench = 'microtome' | 'cytologyPrep';
export type BenchRefusal = 'cutAtMicrotome' | 'prepareAtCytology' | 'notHandedOff';

/** What a bench does with a scanned block (or matrix block): only the Microtome cuts it. */
export function benchTakesBlock(bench: Bench): BenchRefusal | null {
  return bench === 'microtome' ? null : 'cutAtMicrotome';
}

/** What a bench does with a scanned decant (or one of its slides). Pure. */
export function benchTakesDecant(bench: Bench, d: Pick<Decant, 'decantType' | 'handoff'>): BenchRefusal | null {
  if (bench === 'cytologyPrep') return null;
  if (d.decantType !== 'cell_block') return 'prepareAtCytology';
  return d.handoff ? null : 'notHandedOff';
}

export type HandoffProblem = 'notCellBlock' | 'alreadyHandedOff' | 'sourceMismatch' | 'cassetteMismatch';

const norm = (v: string | undefined) => (v ?? '').trim().toUpperCase();

/** The decants a cell block may be scanned against as its source. Pure. */
export function handoffSources(cellBlock: Pick<Decant, 'id' | 'parentDecantId'>, specimenDecants: readonly Decant[]): Decant[] {
  if (cellBlock.parentDecantId) return specimenDecants.filter(d => d.id === cellBlock.parentDecantId);
  return specimenDecants.filter(d => d.id !== cellBlock.id && d.decantType !== 'cell_block');
}

/** Checks the two hand-off scans. Pure: returns the problem, or the source decant that was scanned. */
export function checkHandoffScans(
  cellBlock: Decant,
  specimenDecants: readonly Decant[],
  scans: { source: string; cassette: string },
): { ok: true; source: Decant } | { ok: false; problem: HandoffProblem } {
  if (cellBlock.decantType !== 'cell_block') return { ok: false, problem: 'notCellBlock' };
  if (cellBlock.handoff) return { ok: false, problem: 'alreadyHandedOff' };
  const source = handoffSources(cellBlock, specimenDecants).find(d => !!d.displayId && norm(d.displayId) === norm(scans.source));
  if (!source) return { ok: false, problem: 'sourceMismatch' };
  if (!cellBlock.displayId || norm(cellBlock.displayId) !== norm(scans.cassette)) return { ok: false, problem: 'cassetteMismatch' };
  return { ok: true, source };
}

export interface HandoffDeps {
  enforce: (key: 'cytology:cell-block:hand-off', ctx: { caseId: string }) => Promise<{ allowed: boolean }>;
  saveHandoff: (caseId: string, decantId: string, handoff: NonNullable<Decant['handoff']>) => Promise<{ ok: true } | { ok: false; error: string }>;
  audit: (entry: { event: string; detail: string; user: string; caseId: string }) => void;
  now: () => Date;
}

export type HandoffResult = { ok: true; handoff: NonNullable<Decant['handoff']> } | { ok: false; problem: HandoffProblem | 'notPermitted' | 'notSaved' };

/** Records the hand-off after both scans match, with the permission check and the audit entry. */
export async function handOffCellBlock(
  input: { caseId: string; accession: string; cellBlock: Decant; specimenDecants: readonly Decant[]; scans: { source: string; cassette: string }; actor: { id: string; name: string }; stationId?: string },
  deps: HandoffDeps,
): Promise<HandoffResult> {
  if (!(await deps.enforce('cytology:cell-block:hand-off', { caseId: input.caseId })).allowed) return { ok: false, problem: 'notPermitted' };
  const checked = checkHandoffScans(input.cellBlock, input.specimenDecants, input.scans);
  if (checked.ok === false) return { ok: false, problem: checked.problem };
  const handoff = {
    at: deps.now().toISOString(), byId: input.actor.id, byName: input.actor.name,
    sourceItemId: checked.source.displayId ?? checked.source.id, ...(input.stationId ? { stationId: input.stationId } : {}),
  };
  const saved = await deps.saveHandoff(input.caseId, input.cellBlock.id, handoff);
  if (saved.ok === false) return { ok: false, problem: 'notSaved' };
  deps.audit({
    event: 'Cell Block Handed Off To Histology',
    detail: `Cell block ${input.cellBlock.displayId ?? input.cellBlock.label} handed off to histology; source ${handoff.sourceItemId} and cassette scanned.`,
    user: input.actor.name, caseId: input.accession,
  });
  return { ok: true, handoff };
}

/** A new cell block made at the preparation bench from `parent` (a fluid or aliquot decant): labelled D1, D2…, with
 *  an H&E waiting to be cut. It still needs the hand-off before the Microtome takes it. Pure. */
export function newCellBlockFrom(
  parent: Pick<Decant, 'id'>,
  specimen: { id: string; label: string; decants?: readonly Pick<Decant, 'label'>[] },
  fullAccession: string,
  ids: { stamp: string; createdBy: string; now: string; cassetteColorId?: string; label: string },
): Decant {
  const displayId = `${fullAccession}-${specimen.label}${ids.label}`;
  return {
    id: `dcnt-${specimen.id}-${ids.stamp}`, label: ids.label, decantType: 'cell_block', parentDecantId: parent.id,
    displayId, createdAt: ids.now, createdBy: ids.createdBy,
    ...(ids.cassetteColorId ? { cassetteColorId: ids.cassetteColorId } : {}),
    stains: [{ id: `dcnt-${specimen.id}-${ids.stamp}-he`, stainName: 'H&E', status: 'Pending Cut', displayId: `${displayId}-L1` }] as Decant['stains'],
  } as Decant;
}
