// src/services/molecular/controlRuleDraft.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406. The Control Rules page's decisions, moved out of the page:
//   - what's wrong with a rule before it is saved (assay, duplicate assay, no controls, fixed wells, reason);
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
  | { code: 'duplicateAssay' }
  | { code: 'controlsRequired' }
  | { code: 'fixedPositionMissingWell'; sampleType: string }
  | { code: 'reasonRequired' };

/** What is wrong with a rule before it is saved. Batch 669 (mol-14): a rule with no controls, another rule already on the
 *  assay (checked on Edit as on Create: `otherRules` are the rules other than the one being edited), and no reason given. */
export function controlRuleDraftProblem(
  draft: { assayCode: string; requiredControls: readonly MolecularRequiredControl[]; reason?: string },
  otherRules: readonly { assayCode: string }[] = [],
): ControlRuleDraftProblem | null {
  if (!draft.assayCode.trim()) return { code: 'assayRequired' };
  if (otherRules.some(r => r.assayCode === draft.assayCode.trim())) return { code: 'duplicateAssay' };
  if (draft.requiredControls.length === 0) return { code: 'controlsRequired' };
  const unpinned = draft.requiredControls.find(c => c.positionMode === 'fixed' && !c.fixedWellPosition?.trim());
  if (unpinned) return { code: 'fixedPositionMissingWell', sampleType: unpinned.sampleType };
  if (draft.reason !== undefined && !draft.reason.trim()) return { code: 'reasonRequired' };
  return null;
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
