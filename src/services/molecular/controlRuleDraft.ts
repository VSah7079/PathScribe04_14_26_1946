// src/services/molecular/controlRuleDraft.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406. The Control Rules page's decisions, moved out of the page:
//   - what's wrong with a rule before it is saved (assay, fixed wells);
//   - which deck slots a rule may name for its assay's sample rack: every
//     slot, on any active analyser, that takes a sample rack (Pete: "Sample
//     Rack 1 must be in Slot A1 or Slot A2"); a slot a rule already names is
//     kept on the list even if no deck has it now, so it can be unticked.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularRequiredControl } from './IMolecularAssayControlRuleService';
import type { DeckSlot } from '../equipment/IEquipmentService';

export type ControlRuleDraftProblem =
  | { code: 'assayRequired' }
  | { code: 'fixedPositionMissingWell'; sampleType: string };

export function controlRuleDraftProblem(draft: { assayCode: string; requiredControls: readonly MolecularRequiredControl[] }): ControlRuleDraftProblem | null {
  if (!draft.assayCode.trim()) return { code: 'assayRequired' };
  const unpinned = draft.requiredControls.find(c => c.positionMode === 'fixed' && !c.fixedWellPosition?.trim());
  return unpinned ? { code: 'fixedPositionMissingWell', sampleType: unpinned.sampleType } : null;
}

/** The slot ids a rule can offer, sorted. */
export function sampleRackSlotChoices(
  instruments: readonly { deckSlots?: readonly DeckSlot[] }[],
  alreadyChosen: readonly string[] = [],
): string[] {
  const ids = new Set<string>(alreadyChosen);
  for (const i of instruments) for (const sl of i.deckSlots ?? []) if (sl.rackTypes.includes('sample_tube_rack')) ids.add(sl.id);
  return [...ids].sort();
}

/** A required control with its position mode changed: a random control names no well. */
export function withControlPatch(c: MolecularRequiredControl, patch: Partial<MolecularRequiredControl>): MolecularRequiredControl {
  const next = { ...c, ...patch };
  return next.positionMode === 'random' ? { ...next, fixedWellPosition: undefined } : next;
}
