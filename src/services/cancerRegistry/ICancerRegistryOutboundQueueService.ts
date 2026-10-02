// src/services/cancerRegistry/ICancerRegistryOutboundQueueService.ts
import type { ServiceResult } from '../types';
import type { CancerRegistryOutboundQueueEntry } from '@/types/case/CancerRegistryOutboundQueueEntry';

export interface ICancerRegistryOutboundQueueService {
  getAll(): Promise<ServiceResult<CancerRegistryOutboundQueueEntry[]>>;
  getByCaseId(caseId: string): Promise<ServiceResult<CancerRegistryOutboundQueueEntry[]>>;
  enqueue(entry: Omit<CancerRegistryOutboundQueueEntry, 'id' | 'status' | 'queuedAt' | 'retryCount' | 'maxRetriesExceeded'>): Promise<ServiceResult<CancerRegistryOutboundQueueEntry>>;
  getFailed(): Promise<ServiceResult<CancerRegistryOutboundQueueEntry[]>>;
  markFailed(id: string, failure: { errorCode: CancerRegistryOutboundQueueEntry['errorCode']; errorMessage: string; maxRetriesExceeded: boolean }): Promise<ServiceResult<CancerRegistryOutboundQueueEntry>>;
  retryDispatch(id: string): Promise<ServiceResult<CancerRegistryOutboundQueueEntry>>;
  markSent(id: string): Promise<ServiceResult<CancerRegistryOutboundQueueEntry>>;
  /** Batch 420: record the registry's answer (or ackOverdue) on the entry; an acknowledgement is appended. */
  setRegistryStatus(id: string, registryStatus: NonNullable<CancerRegistryOutboundQueueEntry['registryStatus']>, acknowledgement?: NonNullable<CancerRegistryOutboundQueueEntry['acknowledgements']>[number]): Promise<ServiceResult<CancerRegistryOutboundQueueEntry>>;
  /** Batch 425: replace the entry's registry revisions (a revision after acceptance, or its review). */
  setRegistryRevisions(id: string, revisions: NonNullable<CancerRegistryOutboundQueueEntry['registryRevisions']>): Promise<ServiceResult<CancerRegistryOutboundQueueEntry>>;
}
