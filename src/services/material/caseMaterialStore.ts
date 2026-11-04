// src/services/material/caseMaterialStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (Pete, Oct 4 2026): the single source of truth for an open
// case's material tree on the client, with optimistic updates and rollback.
//
//   dispatch(change):
//     1. apply the change locally (materialTree.applyDecantChange) and notify
//        subscribers at once, so the Material tab updates instantly;
//     2. publish MATERIAL_DECANTED, so the billing panel recalculates now;
//     3. save (the atomic call: tree + affected billing lines back);
//     4. success: adopt the server's tree and version;
//        failure: restore the tree from before the change, notify, and
//        publish MATERIAL_ROLLED_BACK, so the Material tab and billing both
//        return to the saved state.
//   Changes are saved one at a time, in order; each starts from the result
//   of the one before. A failure rolls back that change and any queued
//   behind it, since they were built on it.
//
// Framework-free; the report page binds it with useCaseMaterialStore.
// ─────────────────────────────────────────────────────────────────────────────

import { applyDecantChange, type DecantChange } from './materialTree';
import type { MaterialEventBus } from './materialEvents';
import type { DecantSaveResult } from './caseMaterialService';


export interface CaseMaterialState {
  caseId: string;
  specimens: any[];
  version: number;
  /** Changes shown but not yet saved. */
  pending: number;
}

export type DispatchOutcome =
  | { ok: true; result: Extract<DecantSaveResult, { ok: true }> }
  | { ok: false; error: string; rolledBack: boolean; currentVersion?: number };

export interface CaseMaterialStoreDeps {
  save: (caseId: string, change: DecantChange, expectedVersion: number) => Promise<DecantSaveResult>;
  bus: MaterialEventBus;
  now: () => Date;
}

export interface CaseMaterialStore {
  getState(): CaseMaterialState;
  subscribe(listener: (state: CaseMaterialState) => void): () => void;
  /** The case was reloaded or changed elsewhere: take its tree as current
   *  (ignored while changes are being saved, so they aren't lost). */
  replace(specimens: any[], version: number): void;
  dispatch(change: DecantChange): Promise<DispatchOutcome>;
}

export function createCaseMaterialStore(initial: { caseId: string; specimens: any[]; version: number }, deps: CaseMaterialStoreDeps): CaseMaterialStore {
  let state: CaseMaterialState = { ...initial, pending: 0 };
  let saved = { specimens: initial.specimens, version: initial.version };
  let queue: Promise<unknown> = Promise.resolve();
  let generation = 0; // bumped on rollback: queued saves built on a failed change are dropped
  const listeners = new Set<(s: CaseMaterialState) => void>();
  const emit = () => { for (const l of [...listeners]) { try { l(state); } catch (e) { console.error('[material] listener failed:', e); } } };
  const set = (next: Partial<CaseMaterialState>) => { state = { ...state, ...next }; emit(); };

  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    replace(specimens, version) {
      if (state.pending > 0) return;
      saved = { specimens, version };
      set({ specimens, version });
    },
    dispatch(change) {
      // 1–2: optimistic, synchronously.
      const local = applyDecantChange(state.specimens, change, deps.now().toISOString());
      if (local.ok === false) return Promise.resolve({ ok: false, error: local.refusal, rolledBack: false });
      const myGeneration = generation;
      set({ specimens: local.specimens, pending: state.pending + 1 });
      deps.bus.publish({ type: 'MATERIAL_DECANTED', caseId: state.caseId, change: local.change, decant: local.event });

      // 3–4: saved in order.
      const run = async (): Promise<DispatchOutcome> => {
        if (myGeneration !== generation) {
          set({ pending: Math.max(0, state.pending - 1) });
          return { ok: false, error: 'superseded', rolledBack: true };
        }
        let result: DecantSaveResult;
        try { result = await deps.save(state.caseId, change, saved.version); }
        catch (e: any) { result = { ok: false, error: 'saveFailed', detail: e?.message ?? String(e) }; }
        if (result.ok === true) {
          saved = { specimens: result.specimens, version: result.version };
          const pending = Math.max(0, state.pending - 1);
          // Later optimistic changes stay on screen until their own save lands.
          set(pending === 0 ? { specimens: result.specimens, version: result.version, pending } : { version: result.version, pending });
          return { ok: true, result };
        }
        const failed = result as Extract<DecantSaveResult, { ok: false }>;
        generation++;
        set({ specimens: saved.specimens, version: saved.version, pending: 0 });
        deps.bus.publish({ type: 'MATERIAL_ROLLED_BACK', caseId: state.caseId, decant: local.event, reason: failed.error });
        return { ok: false, error: failed.error, rolledBack: true, currentVersion: failed.error === 'conflict' ? (failed as any).currentVersion : undefined };
      };
      const p = queue.then(run, run);
      queue = p.catch(() => undefined);
      return p;
    },
  };
}
