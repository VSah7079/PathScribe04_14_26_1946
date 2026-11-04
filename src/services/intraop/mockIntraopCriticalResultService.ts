// src/services/intraop/mockIntraopCriticalResultService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 399: the critical intraoperative results dictionary (Configuration →
// System → Intraoperative critical results). Same storage-backed add / update
// / deactivate / reactivate shape as the other dictionaries. Changing it needs
// config:intraop-critical-results:manage, checked here.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { IntraopCriticalResultEntry, NewIntraopCriticalResultEntry } from '@/types/intraop/IntraopCriticalResult';
import { SEED_INTRAOP_CRITICAL_RESULTS } from './intraopCriticalResultSeeds';
import type { IIntraopCriticalResultService } from './IIntraopCriticalResultService';
export type { IIntraopCriticalResultService } from './IIntraopCriticalResultService';


export const INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED = 'INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED';

export { SEED_INTRAOP_CRITICAL_RESULTS } from './intraopCriticalResultSeeds';

const STORAGE_KEY = 'pathscribe_intraop_critical_results';
const load = (): IntraopCriticalResultEntry[] => storageGet<IntraopCriticalResultEntry[] | null>(STORAGE_KEY, null) ?? SEED_INTRAOP_CRITICAL_RESULTS.map(e => ({ ...e }));
const persist = (d: IntraopCriticalResultEntry[]) => storageSet(STORAGE_KEY, d);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error } as ServiceResult<T>);

const clean = (e: Partial<NewIntraopCriticalResultEntry>): Partial<NewIntraopCriticalResultEntry> => ({
  ...e,
  ...(e.name !== undefined ? { name: e.name.trim() } : {}),
  ...(e.matchTerms ? { matchTerms: [...new Set(e.matchTerms.map(t => t.trim()).filter(Boolean))] } : {}),
});

async function permitted(): Promise<boolean> {
  return (await authorizationService.enforce('config:intraop-critical-results:manage')).allowed;
}

export const mockIntraopCriticalResultService: IIntraopCriticalResultService = {
  async getAll() {
    return ok(load());
  },
  async add(entry) {
    if (!(await permitted())) return err(INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED);
    const e = clean(entry) as NewIntraopCriticalResultEntry;
    if (!e.name || (e.matchTerms.length === 0 && e.frozenCategories.length === 0)) return err('An entry needs a name and at least one term or category.');
    const created: IntraopCriticalResultEntry = { ...e, id: 'icr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
    persist([...load(), created]);
    return ok(created);
  },
  async update(id, changes) {
    if (!(await permitted())) return err(INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED);
    const all = load();
    const i = all.findIndex(e => e.id === id);
    if (i === -1) return err('Entry not found.');
    const next = { ...all[i], ...clean(changes) };
    if (!next.name || (next.matchTerms.length === 0 && next.frozenCategories.length === 0)) return err('An entry needs a name and at least one term or category.');
    all[i] = next;
    persist(all);
    return ok(next);
  },
  async setActive(id, active) {
    if (!(await permitted())) return err(INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED);
    const all = load();
    const i = all.findIndex(e => e.id === id);
    if (i === -1) return err('Entry not found.');
    all[i] = { ...all[i], status: active ? 'Active' : 'Inactive' };
    persist(all);
    return ok(all[i]);
  },
};
