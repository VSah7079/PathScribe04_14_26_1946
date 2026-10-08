// src/services/billing/billingMaterialSync.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-316 (Batch 451): keeps the AI Billing Code Review panel and the report
// page's Material tab in step. Moved out of BillingReviewPanel.tsx and
// SynopticReportPage.tsx so the decisions can be tested on their own.
//
//   Material → Billing: clicking a block, or one of its slides, on the
//     Material tab selects that block's row in the billing panel.
//   Billing → Material: selecting a billing row highlights the stain (slide)
//     that produced the suggestion on the Material tab, and focuses the
//     specimen.
//
// The billing panel lists specimens and their blocks only (see
// computeCaseCodingSummary in codeMapTable.ts), so a decant on the Material
// tab has no billing row to select: a decant click focuses the decant in the
// block editor and leaves the billing selection alone.
// ─────────────────────────────────────────────────────────────────────────────

import type { MaterialEvent } from '../material/materialEvents';

export type BillingSelection =
  | { type: 'specimen'; specimenId: string }
  | { type: 'block'; specimenId: string; blockId: string };

/** What a click on a Material-tab asset (block, slide or decant) focuses on the report page. */
export type MaterialAssetTarget =
  | { kind: 'block'; blockIndex: number; blockId: string }
  | { kind: 'decant'; decantId: string }
  | { kind: 'none' };

/**
 * The Material tab reports a click by the clicked block's id (a slide click
 * reports its own block) or by a decant's id. Blocks are checked first, the
 * common case, then decants.
 */
export function resolveMaterialAssetClick(
  assetId: string,
  blockIds: readonly string[],
  decantIds: readonly string[],
): MaterialAssetTarget {
  const blockIndex = blockIds.indexOf(assetId);
  if (blockIndex >= 0) return { kind: 'block', blockIndex, blockId: assetId };
  if (decantIds.includes(assetId)) return { kind: 'decant', decantId: assetId };
  return { kind: 'none' };
}

/**
 * The billing row matching the block selected on the Material tab, or null
 * when nothing is selected there or the id isn't one of the case's blocks.
 */
export function billingSelectionForMaterialBlock(
  specimens: readonly { id: string; blocks?: readonly { id: string }[] }[],
  materialSelectedBlockId: string | undefined,
): BillingSelection | null {
  if (!materialSelectedBlockId) return null;
  const owner = specimens.find(sp => sp.blocks?.some(b => b.id === materialSelectedBlockId));
  return owner ? { type: 'block', specimenId: owner.id, blockId: materialSelectedBlockId } : null;
}

export interface BillingHighlights {
  /** The specimen to focus on the Material tab, if any. */
  focusSpecimenId: string | undefined;
  /** Text to highlight in the report draft (the source stain's name). */
  reportText: string | undefined;
  /** The stain (StainOrder.id) to highlight on the Material tab. */
  stainId: string | undefined;
}

/**
 * What a billing-panel selection highlights. A block row highlights the
 * source stain of its active pending suggestion (or, with nothing pending,
 * just names the block's first stain in the report text); a specimen row
 * focuses the specimen with no stain highlight, since a base code isn't tied
 * to one stain; no selection clears everything.
 */
export function billingHighlightsForSelection(
  selection: BillingSelection | null,
  activePending: { sourceStainName?: string; sourceStainId?: string } | undefined,
  blockStainNames: readonly string[] | undefined,
): BillingHighlights {
  if (!selection) return { focusSpecimenId: undefined, reportText: undefined, stainId: undefined };
  if (selection.type === 'specimen') return { focusSpecimenId: selection.specimenId, reportText: undefined, stainId: undefined };
  return {
    focusSpecimenId: selection.specimenId,
    reportText: activePending?.sourceStainName || blockStainNames?.[0] || undefined,
    stainId: activePending?.sourceStainId,
  };
}

// ── Batch 452 (Pete, Oct 4 2026): material events ──────────────────────────

export interface BillingMaterialReaction {
  /** A decant whose billing row should be selected once it appears. */
  focusMaterialId?: string;
  /** A deleted decant: clear the selection if it was this row. */
  clearMaterialId?: string;
  /** What the panel announces (translation key and values). */
  notice: { key: string; params: Record<string, string> };
}

/** How the billing panel responds to a material event. Charges themselves
 *  are recomputed from the material tree; this decides selection and the
 *  announcement. */
export function billingReactionToMaterialEvent(event: MaterialEvent): BillingMaterialReaction {
  const params: Record<string, string> = {};
  if (event.type === 'MATERIAL_ROLLED_BACK') return { clearMaterialId: undefined, notice: { key: 'billingReviewPanel.materialSync.rolledBack', params } };
  if (event.change === 'deleted') return { clearMaterialId: event.decant.childId, notice: { key: 'billingReviewPanel.materialSync.decantRemoved', params } };
  return { focusMaterialId: event.decant.childId, notice: { key: event.change === 'added' ? 'billingReviewPanel.materialSync.decantAdded' : 'billingReviewPanel.materialSync.decantChanged', params } };
}
