// src/services/itemEndStates/IItemEndStateService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 731 (Lab Workflow & Batch spec §10.5): every physical item (block,
// slide, matrix block, decant) has an end state, recorded with a reason, the
// user and the time: exhausted (no tissue remaining), returned to storage,
// archived, sent out, consumed for testing, discarded. Exhausted is kept apart
// from the others: it is about the tissue, the rest are about where the item
// went. Records are kept, never overwritten: the newest one is the item's
// current end state, and the earlier ones are its history (a block returned to
// storage and later archived has both).
// Recording by hand needs material:end-state:record. Three end states are
// recorded by the system as a side effect of an action that already checked its
// own permission: discarded when retained material is disposed of by scan
// (retention:material:dispose), sent out when an External Referral batch is
// completed, and exhausted when a tech flags a block as exhausted at the
// Microtome (add-on:exception:flag).
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';

export const ITEM_END_STATES = ['exhausted', 'returned_to_storage', 'archived', 'sent_out', 'consumed', 'discarded'] as const;
export type ItemEndStateKind = typeof ITEM_END_STATES[number];

/** Who recorded it: a person at a station, or the system as part of another action. */
export type ItemEndStateSource = 'manual' | 'disposal' | 'referral' | 'exhaustion_flag' | 'reembedded';

export type ItemEndStateMaterial = 'block' | 'slide' | 'matrix_block' | 'matrix_slide' | 'decant' | 'decant_slide' | 'wet_tissue';

export interface ItemEndState {
  id: string;
  /** The item's printed identifier (S26-4403-A1, S26-4403-A1-L2). */
  itemId: string;
  materialType: ItemEndStateMaterial;
  caseAccession: string;
  state: ItemEndStateKind;
  /** Why, in the words of the person who recorded it (or the system's reason). Required. */
  reason: string;
  source: ItemEndStateSource;
  userId: string;
  userName: string;
  /** The station it was recorded at, when known. */
  stationId?: string;
  at: string;
  /** Batch 732: the item is back in use (a re-embedded block); the end state before it no longer applies. */
  withdrawn?: boolean;
}

export type NewItemEndState = Omit<ItemEndState, 'id' | 'at' | 'source' | 'withdrawn'> & { withdrawn?: boolean };

export interface IItemEndStateService {
  /** A person records an end state. Needs material:end-state:record (NOT_PERMITTED); a reason is required (INVALID). */
  record(entry: NewItemEndState): Promise<ServiceResult<ItemEndState>>;
  /** The system records an end state as part of another action that already checked its own permission
   *  (disposal by scan, a completed referral, a block flagged as exhausted). INVALID for source 'manual'. */
  recordFromAction(entry: NewItemEndState & { source: Exclude<ItemEndStateSource, 'manual'> }): Promise<ServiceResult<ItemEndState>>;
  /** Every end state recorded for these items, oldest first. */
  listForItems(itemIds: string[]): Promise<ServiceResult<ItemEndState[]>>;
  /** Every end state recorded on a case, oldest first. */
  listForCase(caseAccession: string): Promise<ServiceResult<ItemEndState[]>>;
}
