// src/services/itemEndStates/mockItemEndStateService.ts
// Batch 731: the demo's end-state records (mock storage `itemEndStates`, cleared by Demo Reset). Append only. The API
// server keeps the same records (CASE_WORKFLOWS_API.md, "Item end states").
import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { IItemEndStateService, ItemEndState, NewItemEndState, ItemEndStateSource } from './IItemEndStateService';
import { endStateProblems } from './itemEndStateRules';

const KEY = 'itemEndStates';
const load = (): ItemEndState[] => storageGet<ItemEndState[]>(KEY, []);

function save(entry: NewItemEndState & { withdrawn?: boolean }, source: ItemEndStateSource): ServiceResult<ItemEndState> {
  if (endStateProblems(entry).length > 0) return { ok: false, error: 'INVALID' };
  const recorded: ItemEndState = {
    ...entry, itemId: entry.itemId.trim(), reason: entry.reason.trim(), source,
    id: `endstate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(),
  };
  storageSet(KEY, [...load(), recorded]);
  return { ok: true, data: recorded };
}

const byAt = (a: ItemEndState, b: ItemEndState) => a.at.localeCompare(b.at);

export const mockItemEndStateService: IItemEndStateService = {
  async record(entry) {
    if (!(await authorizationService.enforce('material:end-state:record', { caseId: entry.caseAccession })).allowed) return { ok: false, error: 'NOT_PERMITTED' };
    return save(entry, 'manual');
  },
  async recordFromAction(entry) {
    if ((entry.source as string) === 'manual') return { ok: false, error: 'INVALID' };
    const { source, ...rest } = entry;
    return save(rest, source);
  },
  async listForItems(itemIds) {
    const wanted = new Set(itemIds.map(id => id.trim().toUpperCase()));
    return { ok: true, data: load().filter(r => wanted.has(r.itemId.toUpperCase())).sort(byAt) };
  },
  async listForCase(caseAccession) {
    return { ok: true, data: load().filter(r => r.caseAccession === caseAccession).sort(byAt) };
  },
};
