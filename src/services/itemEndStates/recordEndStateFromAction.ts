// src/services/itemEndStates/recordEndStateFromAction.ts
// Batch 731 (spec §10.5): the one call other services use to record an end state as part of their own action
// (disposal by scan, a completed referral, a block flagged as exhausted). Fire and forget: a failed record never
// undoes or stops the action it describes; it is logged to the console.
import { itemEndStateService } from './itemEndStateServiceInstance';
import type { NewItemEndState, ItemEndStateSource } from './IItemEndStateService';

/** Batch 732: the item is back in use (a re-embedded block): its current end state is withdrawn, the history kept. */
export function withdrawEndStateFromAction(itemId: string, caseAccession: string, reason: string, user: { id: string; name: string }): void {
  void itemEndStateService.listForItems([itemId]).then(r => {
    const last = r.ok ? r.data[r.data.length - 1] : undefined;
    if (!last || last.withdrawn) return;
    return itemEndStateService.recordFromAction({
      itemId, materialType: last.materialType, caseAccession, state: last.state, reason, userId: user.id, userName: user.name, source: 'reembedded', withdrawn: true,
    } as Parameters<typeof itemEndStateService.recordFromAction>[0]);
  }).catch(err => console.error('[itemEndStates] not withdrawn:', itemId, err));
}

export function recordEndStateFromAction(entries: (NewItemEndState & { source: Exclude<ItemEndStateSource, 'manual'> })[]): void {
  for (const e of entries) {
    void itemEndStateService.recordFromAction(e)
      .then(r => { if (!r.ok) console.error('[itemEndStates] not recorded:', e.itemId, r.error); })
      .catch(err => console.error('[itemEndStates] not recorded:', e.itemId, err));
  }
}
