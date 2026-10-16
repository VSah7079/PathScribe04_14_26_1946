// src/services/material/billableMaterial.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (Pete, Oct 4 2026: "bind billing to material selectors"): the
// billing review panel's expected charges are derived from the current
// material tree, decants included. Until now computeCaseCodingSummary only
// looked at blocks, so a decant's stains never reached billing at all.
//
// billableMaterialOf gives each specimen's billable units: its blocks, then
// its decants in the same block-like shape (id, label, stains, coding). The
// IHC first/additional sequencing therefore runs across blocks and decants
// together, as it would on the claim. affectedBillingLines picks out what a
// material change altered, for the atomic save's response.
// ─────────────────────────────────────────────────────────────────────────────

import { computeCaseCodingSummary, type SpecimenCodingSummary } from '../billing/codeMapTable';
import type { StainType } from '../stains/IStainService';


type BlockLike = { id: string; label: string; stains?: { id?: string; stainName: string }[]; coding?: { cpt?: any[]; rejectedCpt?: any[] } };
type SpecimenForBilling = { id: string; label: string; blocks?: BlockLike[]; decants?: (BlockLike & { disposedAt?: string })[] } & Record<string, any>;

/** The ids of every decant in the tree (billing rows that are decants). */
export function decantIdsOf(specimens: readonly SpecimenForBilling[]): Set<string> {
  return new Set(specimens.flatMap(s => (s.decants ?? []).map(d => d.id)));
}

/** Each specimen with its decants appended to its blocks, block-shaped. A
 *  decant with no stains adds a row with nothing to code, which still shows
 *  the decant exists. */
export function billableMaterialOf<S extends SpecimenForBilling>(specimens: readonly S[]): S[] {
  return specimens.map(s => (s.decants?.length
    ? { ...s, blocks: [...(s.blocks ?? []), ...s.decants.map(d => ({ id: d.id, label: d.label, stains: d.stains ?? [], coding: d.coding }))] }
    : s));
}

/** The coding summary the billing panel shows, from the current material. */
export function billingSummaryForMaterial(specimens: readonly SpecimenForBilling[], stainTypes: StainType[], matrixBlocks: any[] = []): SpecimenCodingSummary[] {
  return computeCaseCodingSummary(billableMaterialOf(specimens) as any, stainTypes, matrixBlocks);
}

export interface BillingLine {
  specimenId: string;
  materialId: string;
  materialLabel: string;
  appliedCodes: string[];
  suggestedCodes: string[];
}

export function billingLinesOf(summary: SpecimenCodingSummary[]): BillingLine[] {
  return summary.flatMap(s => s.blocks.map(b => ({
    specimenId: s.specimenId,
    materialId: b.blockId,
    materialLabel: b.blockLabel,
    appliedCodes: b.appliedAncillaryCodes.map(c => c.code),
    suggestedCodes: [...b.unappliedSuggestions],
  })));
}

/** Lines that differ between two material states (added, removed or changed). */
export function affectedBillingLines(before: BillingLine[], after: BillingLine[]): { changed: BillingLine[]; removedMaterialIds: string[] } {
  const key = (l: BillingLine) => JSON.stringify([l.appliedCodes, l.suggestedCodes, l.materialLabel]);
  const beforeById = new Map(before.map(l => [l.materialId, l]));
  const afterIds = new Set(after.map(l => l.materialId));
  return {
    changed: after.filter(l => !beforeById.has(l.materialId) || key(beforeById.get(l.materialId)!) !== key(l)),
    removedMaterialIds: before.filter(l => !afterIds.has(l.materialId)).map(l => l.materialId),
  };
}

/** A billing row's material: the block or the decant with that id on the
 *  specimen (billing writes its codes back to whichever it is). */
export function billableUnitOf<B, D>(
  specimens: readonly { id: string; blocks?: (B & { id: string })[]; decants?: (D & { id: string })[] }[] | undefined,
  specimenId: string,
  materialId: string,
): { kind: 'block'; unit: B } | { kind: 'decant'; unit: D } | null {
  const sp = specimens?.find(s => s.id === specimenId);
  const block = sp?.blocks?.find(b => b.id === materialId);
  if (block) return { kind: 'block', unit: block };
  const decant = sp?.decants?.find(d => d.id === materialId);
  return decant ? { kind: 'decant', unit: decant } : null;
}
