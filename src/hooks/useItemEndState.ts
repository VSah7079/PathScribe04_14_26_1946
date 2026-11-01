// src/hooks/useItemEndState.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 731 (Lab Workflow & Batch spec §10.5): loads an item's end-state history
// for ItemEndStatePanel and records a new end state (the service checks
// material:end-state:record and that a reason is given). The newest record is
// the item's current end state (services/itemEndStates/itemEndStateRules.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { itemEndStateService } from '@/services';
import type { ItemEndState, ItemEndStateKind, ItemEndStateMaterial } from '@/services/itemEndStates/IItemEndStateService';
import { currentEndStateOf } from '@/services/itemEndStates/itemEndStateRules';

export type RecordEndStateOutcome = 'recorded' | 'notPermitted' | 'invalid' | 'failed';

export function useItemEndState(item: { itemId: string; materialType: ItemEndStateMaterial; caseAccession: string; stationId?: string | null } | null) {
  const { user } = useAuth();
  const [history, setHistory] = useState<ItemEndState[]>([]);
  const [loading, setLoading] = useState(false);
  const itemId = item?.itemId ?? '';

  const load = useCallback(async (live: () => boolean = () => true) => {
    if (!itemId) { setHistory([]); return; }
    setLoading(true);
    try {
      const r = await itemEndStateService.listForItems([itemId]);
      if (live()) setHistory(r.ok ? r.data : []);
    } catch {
      if (live()) setHistory([]);
    } finally {
      if (live()) setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    let live = true;
    void load(() => live);
    return () => { live = false; };
  }, [load]);

  const record = useCallback(async (state: ItemEndStateKind, reason: string): Promise<RecordEndStateOutcome> => {
    if (!item || !user) return 'failed';
    try {
      const r = await itemEndStateService.record({
        itemId: item.itemId, materialType: item.materialType, caseAccession: item.caseAccession, state, reason,
        userId: user.id, userName: user.name ?? user.id, ...(item.stationId ? { stationId: item.stationId } : {}),
      });
      if (!r.ok) return r.error === 'NOT_PERMITTED' ? 'notPermitted' : r.error === 'INVALID' ? 'invalid' : 'failed';
      await load();
      return 'recorded';
    } catch {
      return 'failed';
    }
  }, [item, user, load]);

  return { history, current: currentEndStateOf(history, itemId), loading, record };
}
