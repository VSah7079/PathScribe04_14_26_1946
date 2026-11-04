// src/services/delivery/IDeliveryRetryService.ts
// Batch 521 (PS-281): the automatic-retry records (DeliveryRetryRecord). Written by the system
// (the release, the retry sweep, fax transmission reports), never by a person, so no capability.
import type { ServiceResult } from '../types';
import type { DeliveryRetryRecord } from '@/types/delivery/DeliveryRetryRecord';

export interface IDeliveryRetryService {
  getAll(): Promise<ServiceResult<DeliveryRetryRecord[]>>;
  create(record: Omit<DeliveryRetryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<DeliveryRetryRecord>>;
  update(id: string, patch: Partial<Omit<DeliveryRetryRecord, 'id' | 'createdAt'>>): Promise<ServiceResult<DeliveryRetryRecord>>;
}
