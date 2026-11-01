// src/services/material/materialEvents.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (Pete, Oct 4 2026): material changes are published as events
// for the open case session, so screens that depend on the material (the
// billing review panel first) stay in step without a reload or tab switch.
//
//   DecantEvent: the standard payload of a decant change, Pete's shape:
//     { parentId, childId, materialType, volumeOrWeight, timestamp }
//   MATERIAL_DECANTED: a decant was added, changed or deleted.
//   MATERIAL_ROLLED_BACK: a change shown optimistically failed to save and
//     was undone; subscribers drop anything they derived from it.
//
// The bus is in-process and per browser tab. Across users the same events
// would travel over SignalR (docs/architecture/LIVE_UPDATES_SIGNALR.md).
// ─────────────────────────────────────────────────────────────────────────────

export interface DecantEvent {
  /** What the decant was taken from: its specimen, or the decant it was
   *  split from (multi-level splitting). */
  parentId: string;
  /** The decant itself. */
  childId: string;
  /** Decant['decantType']: 'residual_fluid' | 'cell_block' | 'aliquot' (Batch 739). */
  materialType: string;
  /** Volume in mL when recorded, else the pellet yield, else null. */
  volumeOrWeight: number | string | null;
  timestamp: string;
}

export type MaterialChangeKind = 'added' | 'modified' | 'deleted';

export type MaterialEvent =
  | { type: 'MATERIAL_DECANTED'; caseId: string; change: MaterialChangeKind; decant: DecantEvent }
  | { type: 'MATERIAL_ROLLED_BACK'; caseId: string; decant: DecantEvent; reason: string };

export type MaterialEventHandler = (event: MaterialEvent) => void;

export interface MaterialEventBus {
  publish(event: MaterialEvent): void;
  /** Events for one case. Returns the unsubscribe function. */
  subscribe(caseId: string, handler: MaterialEventHandler): () => void;
}

export function createMaterialEventBus(): MaterialEventBus {
  const handlers = new Map<string, Set<MaterialEventHandler>>();
  return {
    publish(event) {
      for (const h of [...(handlers.get(event.caseId) ?? [])]) {
        try { h(event); } catch (e) { console.error('[material] subscriber failed:', e); }
      }
    },
    subscribe(caseId, handler) {
      const set = handlers.get(caseId) ?? new Set<MaterialEventHandler>();
      set.add(handler);
      handlers.set(caseId, set);
      return () => { set.delete(handler); if (set.size === 0) handlers.delete(caseId); };
    },
  };
}

/** The app's bus (one per browser tab). */
export const materialEventBus: MaterialEventBus = createMaterialEventBus();
