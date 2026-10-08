// src/services/molecular/plateBuilderWells.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-229 (Batch 451): the plate builder's well-list decisions, moved out of
// MolecularPlateBuilderPage unchanged in behaviour:
//   - emptyPlateWells: a fresh, all-empty well list for a plate layout
//     (row-major, the order the grid renders in);
//   - autoPopulatePlateWells: "Auto-fill" marks every still-empty well as a
//     patient specimen well, walking the plate in the requested fill order
//     (row- or column-major). Wells that already have a sample type keep it.
//     No specimen data is invented: the tech scans each specimen in after.
//     The returned list is in the fill order (the scan auto-advance in
//     plateWellScan.ts follows the list order).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { MOLECULAR_PLATE_LAYOUTS, type MolecularPlateLayout, type MolecularWell } from './IMolecularBatchService';
import { generateWellPositionsInOrder } from './resolveMolecularBarcodes';

export type PlateFillOrder = 'row_major' | 'column_major';

/** Every well of the layout, empty, in row-major order. */
export function emptyPlateWells(layout: MolecularPlateLayout): MolecularWell[] {
  return generateWellPositionsInOrder(MOLECULAR_PLATE_LAYOUTS[layout], 'row_major').map(wellPosition => ({ wellPosition }));
}

/** Marks every empty well PATIENT_SPECIMEN, in the given fill order; returns the list in that order. */
export function autoPopulatePlateWells(wells: readonly MolecularWell[], layout: MolecularPlateLayout, order: PlateFillOrder): MolecularWell[] {
  const orderedPositions = generateWellPositionsInOrder(MOLECULAR_PLATE_LAYOUTS[layout], order);
  const byPos = new Map(wells.map(w => [w.wellPosition, w]));
  for (const pos of orderedPositions) {
    const well = byPos.get(pos);
    if (well && !well.sampleType) byPos.set(pos, { ...well, sampleType: 'PATIENT_SPECIMEN' });
  }
  return orderedPositions.map(pos => byPos.get(pos)!);
}

/**
 * Batch 451: the wells as the grid draws them: every position of the layout,
 * row by row, each showing its own well or an empty one. The grid used to
 * draw the well list in list order, so a column-major auto-fill (list in fill
 * order) and an existing batch (only its assigned wells stored) put wells in
 * the wrong grid positions.
 */
export function plateGridWells(wells: readonly MolecularWell[], layout: MolecularPlateLayout): MolecularWell[] {
  const byPos = new Map(wells.map(w => [w.wellPosition, w]));
  return generateWellPositionsInOrder(MOLECULAR_PLATE_LAYOUTS[layout], 'row_major').map(pos => byPos.get(pos) ?? { wellPosition: pos });
}

/** Batch 467b: what a well's tooltip says — its locale key (molecularPlateBuilderPage.wellTitle.*) and values; the
 *  sample type label is added by the screen. A tooltip can't be redacted for screenshots (data-phi), so it never shows
 *  the accession: the selected well's panel does, tagged. A well holding an in-house order names the order. Pure. */
export function plateWellTitle(w: Pick<MolecularWell, 'wellPosition' | 'sampleType' | 'orderId'>): { key: 'empty' | 'sample' | 'order'; values: { well: string; order?: string } } {
  if (!w.sampleType) return { key: 'empty', values: { well: w.wellPosition } };
  if (w.orderId) return { key: 'order', values: { well: w.wellPosition, order: w.orderId } };
  return { key: 'sample', values: { well: w.wellPosition } };
}
