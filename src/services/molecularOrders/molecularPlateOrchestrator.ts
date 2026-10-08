// src/services/molecularOrders/molecularPlateOrchestrator.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467: the spec's "MolecularPlateOrchestrator" — plate geometry rules for
// binding in-house orders to wells (spec `wellBindingContract`: a SAMPLE well
// carries its orderId; a CONTROL well its controlId). Only a draft plate of the
// order's assay takes orders, into its free wells in row order: a well no
// sample or control holds, and never a position the assay's control rule fixes
// for a control. Unbinding empties the well again. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { MOLECULAR_PLATE_LAYOUTS, type MolecularBatch, type MolecularWell } from '../molecular/IMolecularBatchService';
import type { MolecularAssayControlRule } from '../molecular/IMolecularAssayControlRuleService';
import { generateWellPositionsInOrder } from '../molecular/resolveMolecularBarcodes';
import type { MolecularOrder } from './molecularOrderTypes';

/** Spec `wellBindingContract`: how a well reads to the engine's API. */
export interface WellBinding { wellPosition: string; wellType: 'SAMPLE' | 'CONTROL'; orderId: string | null; controlId: string | null }

export const wellBindingOf = (w: MolecularWell): WellBinding | null => {
  if (!w.sampleType) return null;
  const control = w.sampleType !== 'PATIENT_SPECIMEN';
  return { wellPosition: w.wellPosition, wellType: control ? 'CONTROL' : 'SAMPLE', orderId: control ? null : w.orderId ?? null, controlId: control ? w.controlInfo?.controlId ?? null : null };
};

/** The positions a plate can still take a sample in, in row order. */
export function freeSampleWells(batch: Pick<MolecularBatch, 'plateLayout' | 'wells' | 'assayCode'>, rules: readonly MolecularAssayControlRule[]): string[] {
  const reserved = new Set((rules.find(r => r.assayCode === batch.assayCode)?.requiredControls ?? [])
    .filter(c => c.positionMode === 'fixed' && c.fixedWellPosition).map(c => c.fixedWellPosition!));
  const taken = new Set(batch.wells.filter(w => w.sampleType).map(w => w.wellPosition));
  return generateWellPositionsInOrder(MOLECULAR_PLATE_LAYOUTS[batch.plateLayout], 'row_major').filter(p => !taken.has(p) && !reserved.has(p));
}

export type BindRefusal = 'plateNotDraft' | 'assayMismatch' | 'plateFull' | 'wrongStatus' | 'sendOut';

/** Binds the orders to the plate's next free wells. All or nothing. */
export function bindOrdersToPlate(
  batch: MolecularBatch,
  orders: readonly MolecularOrder[],
  rules: readonly MolecularAssayControlRule[],
): { ok: true; wells: MolecularWell[]; positions: Record<string, string> } | { ok: false; refused: BindRefusal } {
  if (batch.status !== 'draft' || batch.worklistDispatchedAt) return { ok: false, refused: 'plateNotDraft' };
  if (orders.some(o => o.routing !== 'IN_HOUSE')) return { ok: false, refused: 'sendOut' };
  if (orders.some(o => o.status !== 'QUEUED')) return { ok: false, refused: 'wrongStatus' };
  if (orders.some(o => o.assayTarget !== batch.assayCode)) return { ok: false, refused: 'assayMismatch' };
  const free = freeSampleWells(batch, rules);
  if (free.length < orders.length) return { ok: false, refused: 'plateFull' };
  const positions: Record<string, string> = {};
  const added: MolecularWell[] = orders.map((o, i) => {
    positions[o.orderId] = free[i];
    return { wellPosition: free[i], sampleType: 'PATIENT_SPECIMEN', accessionNumber: o.accession, specimenUuid: o.specimenId, orderId: o.orderId };
  });
  // An empty well record at that position (no sample) is replaced.
  const kept = batch.wells.filter(w => !(added.some(a => a.wellPosition === w.wellPosition) && !w.sampleType));
  return { ok: true, wells: [...kept, ...added], positions };
}

/** The plate without the order's well (its sample is taken off). */
export function unbindOrderFromPlate(batch: MolecularBatch, orderId: string): { ok: true; wells: MolecularWell[] } | { ok: false; refused: BindRefusal } {
  if (batch.status !== 'draft' || batch.worklistDispatchedAt) return { ok: false, refused: 'plateNotDraft' };
  return { ok: true, wells: batch.wells.filter(w => w.orderId !== orderId) };
}
