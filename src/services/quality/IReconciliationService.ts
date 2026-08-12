// src/services/quality/IReconciliationService.ts
import { ServiceResult } from '../types';
import type { ReconciliationRecord } from '@/types/quality/ReconciliationRecord';

export interface IReconciliationService {
  getAll(): Promise<ServiceResult<ReconciliationRecord[]>>;
  create(record: Omit<ReconciliationRecord, 'id' | 'recordedAt'>): Promise<ServiceResult<ReconciliationRecord>>;
}
