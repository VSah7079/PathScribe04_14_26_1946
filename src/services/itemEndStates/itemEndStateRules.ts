// src/services/itemEndStates/itemEndStateRules.ts
// Batch 731 (spec §10.5): what an end state needs, the item's current end state, and the quick-pick reasons a station
// offers for each end state (picked or typed; the reason is stored as text). Pure.
import { ITEM_END_STATES, type ItemEndState, type ItemEndStateKind, type NewItemEndState } from './IItemEndStateService';

export type EndStateProblem = 'itemMissing' | 'stateUnknown' | 'reasonMissing' | 'userMissing';

/** What is wrong with an end state before it is recorded (empty: it can be recorded). */
export function endStateProblems(e: Partial<NewItemEndState>): EndStateProblem[] {
  const out: EndStateProblem[] = [];
  if (!e.itemId?.trim() || !e.caseAccession?.trim()) out.push('itemMissing');
  if (!e.state || !(ITEM_END_STATES as readonly string[]).includes(e.state)) out.push('stateUnknown');
  if (!e.reason?.trim()) out.push('reasonMissing');
  if (!e.userId?.trim()) out.push('userMissing');
  return out;
}

/** Each item's current end state: its newest record. */
export function currentEndStates(records: readonly ItemEndState[]): Map<string, ItemEndState> {
  const out = new Map<string, ItemEndState>();
  for (const r of [...records].sort((a, b) => a.at.localeCompare(b.at))) out.set(r.itemId.toUpperCase(), r);
  return out;
}

/** The current end state of one item, or undefined (none, or the newest record says it is back in use). */
export function currentEndStateOf(records: readonly ItemEndState[], itemId: string): ItemEndState | undefined {
  const r = currentEndStates(records).get(itemId.trim().toUpperCase());
  return r?.withdrawn ? undefined : r;
}

/** The end states a person records by hand. "Exhausted" is not one of them (Batch 732, review): it is recorded when
 *  the block is flagged and the pathologist confirms it, or when its last piece is used up, so the block's status and
 *  its end state always agree. */
export function endStatesFor(_materialType: string): ItemEndStateKind[] {
  return ITEM_END_STATES.filter(s => s !== 'exhausted');
}

/** Quick-pick reasons per end state, as locale keys under itemEndState.reasons.<state>.<key>. */
export const END_STATE_REASON_KEYS: Readonly<Record<ItemEndStateKind, readonly string[]>> = {
  exhausted: ['noTissueLeft', 'facedThrough'],
  returned_to_storage: ['workComplete', 'awaitingDecision'],
  archived: ['caseSignedOut', 'retentionPolicy'],
  sent_out: ['referral', 'consult', 'research'],
  consumed: ['molecularTest', 'flowOrOther'],
  discarded: ['retentionEnded', 'damagedUnusable'],
};
