// src/services/material/materialLineage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 731 (Lab Workflow & Batch spec §10.4): item lineage. Every physical
// item on a case points to the item it came from:
//   specimen container  →  block (cassette)  →  slide  →  aliquot
//   specimen container  →  decant            →  slide  →  aliquot
//   matrix block (several parts in one cassette)  →  slide
// The parent-child links are already held by the case record (slides are kept
// under their block, aliquots under their slide); this module reads them out
// by item id (the printed identifier, e.g. S26-4403-A1-L2), so a scan event, a
// report or the BI feed can say which block a slide was cut from. A slide that
// is put in a staining tray keeps its parent; the tray is a carrier, not a
// parent (§10.1). Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { StainOrder } from '@/types/case/Specimen';
import { slideLevelOf } from './slideLevels';
import {
  resolveSpecimenDisplayId, resolveBlockDisplayId, resolveSlideDisplayId, resolveDecantDisplayId,
  resolveDecantSlideDisplayId, resolveAliquotDisplayId, resolveDecantAliquotDisplayId,
} from '@/utils/materialDisplayId';
import { matrixBlockIdentifier, matrixSlideIdentifier, cassetteIdentifier, decantIdentifier } from '@/types/labels/LabelData';

export type LineageItemKind = 'container' | 'block' | 'slide' | 'aliquot' | 'decant' | 'decant_slide' | 'matrix_block' | 'matrix_slide';

export interface LineageItem {
  /** The item's printed identifier. */
  itemId: string;
  kind: LineageItemKind;
  /** The item it came from; none for a specimen container or a matrix block. */
  parentItemId?: string;
  /** The specimen part (A, B…), when the item belongs to one. */
  specimenLabel?: string;
}

function slidesUnder(
  out: LineageItem[], stains: readonly StainOrder[] | undefined, parentItemId: string, specimenLabel: string | undefined,
  slideKind: 'slide' | 'decant_slide' | 'matrix_slide',
  slideId: (level: string, stain: StainOrder) => string,
  aliquotId: ((level: string, a: { label: string; displayId?: string }) => string) | null,
): void {
  (stains ?? []).forEach((stain, i) => {
    const level = slideLevelOf(stain, i);
    const id = slideId(level, stain);
    out.push({ itemId: id, kind: slideKind, parentItemId, specimenLabel });
    if (!aliquotId) return;
    for (const a of stain.aliquots ?? []) out.push({ itemId: aliquotId(level, a), kind: 'aliquot', parentItemId: id, specimenLabel });
  });
}

/** Every item on the case with its parent. */
export function caseLineage(caseData: Pick<Case, 'id' | 'accession' | 'specimens' | 'matrixBlocks'>): LineageItem[] {
  const acc = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id;
  const out: LineageItem[] = [];
  for (const sp of caseData.specimens ?? []) {
    const containerId = resolveSpecimenDisplayId(acc, sp);
    out.push({ itemId: containerId, kind: 'container', specimenLabel: sp.label });
    for (const b of sp.blocks ?? []) {
      const blockId = resolveBlockDisplayId(acc, sp.label, b);
      out.push({ itemId: blockId, kind: 'block', parentItemId: containerId, specimenLabel: sp.label });
      slidesUnder(out, b.stains, blockId, sp.label, 'slide',
        (level, st) => resolveSlideDisplayId(acc, sp.label, b.label, level, st),
        (level, a) => resolveAliquotDisplayId(acc, sp.label, b.label, level, a));
    }
    for (const d of sp.decants ?? []) {
      const decantId = resolveDecantDisplayId(acc, sp.label, d);
      out.push({ itemId: decantId, kind: 'decant', parentItemId: containerId, specimenLabel: sp.label });
      slidesUnder(out, d.stains, decantId, sp.label, 'decant_slide',
        (level, st) => resolveDecantSlideDisplayId(acc, sp.label, d.label, level, st),
        (level, a) => resolveDecantAliquotDisplayId(acc, sp.label, d.label, level, a));
    }
  }
  for (const m of caseData.matrixBlocks ?? []) {
    const blockId = matrixBlockIdentifier(acc, m.label);
    out.push({ itemId: blockId, kind: 'matrix_block' });
    slidesUnder(out, m.slides, blockId, undefined, 'matrix_slide', (level, st) => st.displayId ?? matrixSlideIdentifier(acc, m.label, level), null);
  }
  return out;
}

/** The item a given item came from (its block for a slide), or undefined. */
export function parentItemIdOf(caseData: Pick<Case, 'id' | 'accession' | 'specimens' | 'matrixBlocks'>, itemId: string): string | undefined {
  const wanted = itemId.trim().toUpperCase();
  return caseLineage(caseData).find(x => x.itemId.toUpperCase() === wanted)?.parentItemId;
}

/** The items made from a given item (a block's slides), in order. */
export function childItemsOf(caseData: Pick<Case, 'id' | 'accession' | 'specimens' | 'matrixBlocks'>, itemId: string): LineageItem[] {
  const wanted = itemId.trim().toUpperCase();
  return caseLineage(caseData).filter(x => x.parentItemId?.toUpperCase() === wanted);
}

/** The chain from an item up to its specimen container: [item, parent, grandparent…]. */
export function ancestryOf(caseData: Pick<Case, 'id' | 'accession' | 'specimens' | 'matrixBlocks'>, itemId: string): LineageItem[] {
  const all = caseLineage(caseData);
  const byId = new Map(all.map(x => [x.itemId.toUpperCase(), x]));
  const chain: LineageItem[] = [];
  let at = byId.get(itemId.trim().toUpperCase());
  while (at && chain.length < 8) {
    chain.push(at);
    at = at.parentItemId ? byId.get(at.parentItemId.toUpperCase()) : undefined;
  }
  return chain;
}

/** The id a station records for the block (or matrix block, or decant) at the bench: the parent of the slides cut there. */
export function benchParentItemId(fullAccession: string, at: { specimenLabel: string; label: string; matrixLabel?: string; decant?: boolean }): string {
  if (at.matrixLabel) return matrixBlockIdentifier(fullAccession, at.matrixLabel);
  return at.decant ? decantIdentifier(fullAccession, at.specimenLabel, at.label) : cassetteIdentifier(fullAccession, at.specimenLabel, at.label);
}
