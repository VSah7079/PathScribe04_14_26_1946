// src/services/cytology/ICytologyRegistryOutboundQueueService.ts
import type { ServiceResult } from '../types';
import type { CytologyRegistryOutboundQueueEntry } from '@/types/case/CytologyRegistryOutboundQueueEntry';

export interface ICytologyRegistryOutboundQueueService {
  getAll(): Promise<ServiceResult<CytologyRegistryOutboundQueueEntry[]>>;
  getByCaseId(caseId: string): Promise<ServiceResult<CytologyRegistryOutboundQueueEntry[]>>;
  enqueue(entry: Omit<CytologyRegistryOutboundQueueEntry, 'id' | 'status' | 'queuedAt' | 'retryCount' | 'maxRetriesExceeded'>): Promise<ServiceResult<CytologyRegistryOutboundQueueEntry>>;
  getFailed(): Promise<ServiceResult<CytologyRegistryOutboundQueueEntry[]>>;
  markFailed(id: string, failure: { errorCode: CytologyRegistryOutboundQueueEntry['errorCode']; errorMessage: string; maxRetriesExceeded: boolean }): Promise<ServiceResult<CytologyRegistryOutboundQueueEntry>>;
  retryDispatch(id: string): Promise<ServiceResult<CytologyRegistryOutboundQueueEntry>>;
  markSent(id: string): Promise<ServiceResult<CytologyRegistryOutboundQueueEntry>>;
  /** Batch 420: record the registry's answer (or ackOverdue) on the entry; an acknowledgement is appended. */
  setRegistryStatus(id: string, registryStatus: NonNullable<CytologyRegistryOutboundQueueEntry['registryStatus']>, acknowledgement?: NonNullable<CytologyRegistryOutboundQueueEntry['acknowledgements']>[number]): Promise<ServiceResult<CytologyRegistryOutboundQueueEntry>>;
  /** Batch 425: replace the entry's registry revisions (a revision after acceptance, or its review). */
  setRegistryRevisions(id: string, revisions: NonNullable<CytologyRegistryOutboundQueueEntry['registryRevisions']>): Promise<ServiceResult<CytologyRegistryOutboundQueueEntry>>;
}
