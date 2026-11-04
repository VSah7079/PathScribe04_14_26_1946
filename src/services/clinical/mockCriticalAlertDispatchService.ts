// src/services/clinical/mockCriticalAlertDispatchService.ts
import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { CriticalAlertDispatchRecord } from '@/types/clinical/CriticalAlertDispatch';
import type { ICriticalAlertDispatchService } from './ICriticalAlertDispatchService';
import { CRITICAL_ALERT_DEMO_DISPATCHES } from './criticalAlertDemoSeed';

const STORAGE_KEY = 'critical_alert_dispatches_v1';

const ok  = <T>(data: T):     ServiceResult<T> => ({ ok: true,  data });

// Batch 456: until anything is stored (a fresh browser, or after a Full Reset), the demo alert (criticalAlertDemoSeed.ts).
const load    = (): CriticalAlertDispatchRecord[] => storageGet<CriticalAlertDispatchRecord[]>(STORAGE_KEY, CRITICAL_ALERT_DEMO_DISPATCHES);
const persist = (records: CriticalAlertDispatchRecord[]) => storageSet(STORAGE_KEY, records);

export const mockCriticalAlertDispatchService: ICriticalAlertDispatchService = {
  async getByCaseId(caseId) {
    return ok(load().filter(r => r.caseId === caseId));
  },

  async getAll() {
    return ok(load());
  },

  async record(input) {
    // `id` may already be caller-supplied — see ICriticalAlertDispatchService.ts's
    // own doc comment for why (a reference token needing to link back to
    // this exact record before it exists in storage). Destructured out so
    // the spread below can't clobber the resolved id.
    const { id: providedId, ...rest } = input;
    const record: CriticalAlertDispatchRecord = {
      id: providedId ?? `cad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      ...rest,
      dispatchedAt: new Date().toISOString(),
    };
    persist([...load(), record]);
    return ok(record);
  },
};
