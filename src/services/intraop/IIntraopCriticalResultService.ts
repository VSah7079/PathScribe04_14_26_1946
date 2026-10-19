// src/services/intraop/IIntraopCriticalResultService.ts
// Batch 617 (PS-514): the interface, moved out of the mock so the mock and the server version share it.
import type { ServiceResult } from '../types';
import type { IntraopCriticalResultEntry, NewIntraopCriticalResultEntry } from '@/types/intraop/IntraopCriticalResult';

export interface IIntraopCriticalResultService {
  getAll(): Promise<ServiceResult<IntraopCriticalResultEntry[]>>;
  add(entry: NewIntraopCriticalResultEntry): Promise<ServiceResult<IntraopCriticalResultEntry>>;
  update(id: string, changes: Partial<NewIntraopCriticalResultEntry>): Promise<ServiceResult<IntraopCriticalResultEntry>>;
  setActive(id: string, active: boolean): Promise<ServiceResult<IntraopCriticalResultEntry>>;
}
