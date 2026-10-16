// src/services/reportRelease/mockHeldReleaseService.ts
// Batch 534: report outputs waiting out the release delay (types/reportRelease/HeldRelease.ts),
// kept through mockStorage (in memory when the API server is configured, Batch 525). In
// production the API server holds them and releases them on its own schedule.
import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { HeldRelease } from '@/types/reportRelease/HeldRelease';

const STORAGE_KEY = 'held_report_releases';
const load = (): HeldRelease[] => storageGet<HeldRelease[]>(STORAGE_KEY, []);
const persist = (data: HeldRelease[]) => storageSet(STORAGE_KEY, data);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export interface IHeldReleaseService {
  add(h: HeldRelease): Promise<ServiceResult<HeldRelease>>;
  getAll(): Promise<ServiceResult<HeldRelease[]>>;
  getByCaseId(caseId: string): Promise<ServiceResult<HeldRelease[]>>;
  /** Moves a held release on (to 'released' or 'recalled'); false if it was no longer held (someone else got there first). */
  settle(id: string, status: 'released' | 'recalled', at: string): Promise<boolean>;
}

export const mockHeldReleaseService: IHeldReleaseService = {
  async add(h) { persist([...load(), h]); return ok(h); },
  async getAll() { return ok(load()); },
  async getByCaseId(caseId) { return ok(load().filter(h => h.caseId === caseId)); },
  async settle(id, status, at) {
    const all = load();
    const i = all.findIndex(h => h.id === id);
    if (i === -1 || all[i].status !== 'held') return false;
    all[i] = { ...all[i], status, ...(status === 'released' ? { sentAt: at } : { recalledAt: at }), pdfBase64: undefined };
    persist(all);
    return true;
  },
};
