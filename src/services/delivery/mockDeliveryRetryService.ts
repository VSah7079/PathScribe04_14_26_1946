// src/services/delivery/mockDeliveryRetryService.ts
// Batch 521 (PS-281): automatic-retry records, browser-storage backed. Full Reset clears them.
import { storageGet, storageSet } from '../mockStorage';
import type { IDeliveryRetryService } from './IDeliveryRetryService';
import type { DeliveryRetryRecord } from '@/types/delivery/DeliveryRetryRecord';

export const DELIVERY_RETRY_RECORDS_KEY = 'delivery_retry_records_v1';

const load = (): DeliveryRetryRecord[] => storageGet<DeliveryRetryRecord[]>(DELIVERY_RETRY_RECORDS_KEY, []);
const persist = (data: DeliveryRetryRecord[]) => storageSet(DELIVERY_RETRY_RECORDS_KEY, data);

export const mockDeliveryRetryService: IDeliveryRetryService = {
  async getAll() { return { ok: true, data: load() }; },
  async create(record) {
    const now = new Date().toISOString();
    const created: DeliveryRetryRecord = { ...record, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    persist([...load(), created]);
    return { ok: true, data: created };
  },
  async update(id, patch) {
    const all = load();
    const i = all.findIndex(r => r.id === id);
    if (i === -1) return { ok: false, error: `Delivery retry record ${id} not found` };
    const next = [...all];
    next[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
    persist(next);
    return { ok: true, data: next[i] };
  },
};
