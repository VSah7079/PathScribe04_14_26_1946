// src/pages/SynopticReportPage/hooks/useCaseMaterialStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (Pete, Oct 4 2026): binds the open case to its material store
// (services/material/caseMaterialStore.ts). The store is the source of truth
// for decant changes: it applies them optimistically, publishes
// MATERIAL_DECANTED for the billing panel, saves through the atomic call
// (applyDecantChangeLive) on the case's current version, and rolls back on
// failure. This hook mirrors the store's tree into caseData (so every panel
// reading the case sees it) and feeds the case's own reloads back into the
// store. It decides nothing itself.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Case } from '@/types/case/Case';
import { createCaseMaterialStore, type CaseMaterialStore } from '@/services/material/caseMaterialStore';
import { applyDecantChangeLive, type DecantSaveResult } from '@/services/material/caseMaterialService';
import { materialEventBus } from '@/services/material/materialEvents';
import type { DecantChange } from '@/services/material/materialTree';

type SetCaseData = (updater: (prev: Case | null) => Case | null) => void;

export function useCaseMaterialStore(
  caseData: Case | null,
  setCaseData: SetCaseData,
  knownVersionRef: MutableRefObject<number>,
  save: (caseId: string, change: DecantChange, expectedVersion: number) => Promise<DecantSaveResult> = applyDecantChangeLive,
): CaseMaterialStore | null {
  const caseId = caseData?.id;
  const lastFromStore = useRef<unknown>(null);
  const store = useMemo(() => {
    if (!caseId) return null;
    return createCaseMaterialStore(
      { caseId, specimens: (caseData?.specimens as unknown[] as never[]) ?? [], version: knownVersionRef.current },
      {
        // Always on the case's current version: other saves on the page move it on.
        save: async (id, change) => {
          const result = await save(id, change, knownVersionRef.current);
          if (result.ok) knownVersionRef.current = result.version;
          return result;
        },
        bus: materialEventBus,
        now: () => new Date(),
      },
    );
    // A new store per case only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Store → case: every optimistic change, confirmation and rollback.
  useEffect(() => {
    if (!store) return;
    return store.subscribe(state => {
      // The case already holds this tree (it came from the case): nothing to mirror.
      if (state.specimens === lastFromStore.current) return;
      lastFromStore.current = state.specimens;
      setCaseData(prev => (prev && prev.id === state.caseId ? { ...prev, specimens: state.specimens as Case['specimens'] } : prev));
    });
  }, [store, setCaseData]);

  // Case → store: a reload or another panel's save.
  useEffect(() => {
    if (!store || !caseData?.specimens || caseData.specimens === lastFromStore.current) return;
    lastFromStore.current = caseData.specimens;
    store.replace(caseData.specimens as unknown[] as never[], knownVersionRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, caseData?.specimens]);

  return store;
}
