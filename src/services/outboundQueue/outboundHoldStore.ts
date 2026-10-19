// src/services/outboundQueue/outboundHoldStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): which outbound messages a person has held. The owning
// queues only know waiting, sent and failed, so a hold is an overlay kept
// here: a message with a hold is not sent (the screen's retry refuses it, the
// Audit Log → Interfaces → Outbound view's Dispatch Now and Retry refuse it
// through `isHeld` in outboundQueueActions.ts, and the API server's dispatcher
// skips it), and releasing it removes the hold. With an API server the hold
// lives on the server (OUTBOUND_QUEUE_API.md); this is the demo's version.
// ─────────────────────────────────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import type { OutboundHold } from './outboundQueueTypes';

export interface IOutboundHoldStore {
  all(): Promise<OutboundHold[]>;
  isHeld(ref: string): Promise<boolean>;
  put(hold: OutboundHold): Promise<void>;
  remove(ref: string): Promise<void>;
}

const KEY = 'outbound_holds_v1';

/** A store over a plain load/save pair (tests pass memory; the demo passes browser storage). */
export function createHoldStore(load: () => OutboundHold[], save: (holds: OutboundHold[]) => void): IOutboundHoldStore {
  return {
    async all() { return load(); },
    async isHeld(ref) { return load().some(h => h.ref === ref); },
    async put(hold) { save([...load().filter(h => h.ref !== hold.ref), hold]); },
    async remove(ref) { save(load().filter(h => h.ref !== ref)); },
  };
}

export const outboundHoldStore: IOutboundHoldStore = createHoldStore(() => storageGet<OutboundHold[]>(KEY, []), holds => storageSet(KEY, holds));
