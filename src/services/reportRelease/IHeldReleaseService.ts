// src/services/reportRelease/IHeldReleaseService.ts
// Batch 672: the interface of the held-release store (it lived in the mock's file until now).
import type { ServiceResult } from '../types';
import type { HeldRelease } from '@/types/reportRelease/HeldRelease';

export interface IHeldReleaseService {
  add(h: HeldRelease): Promise<ServiceResult<HeldRelease>>;
  getAll(): Promise<ServiceResult<HeldRelease[]>>;
  getByCaseId(caseId: string): Promise<ServiceResult<HeldRelease[]>>;
  /** Moves a held release on (to 'released' or 'recalled'); false if it was no longer held (someone else got there first). */
  settle(id: string, status: 'released' | 'recalled', at: string): Promise<boolean>;
}
