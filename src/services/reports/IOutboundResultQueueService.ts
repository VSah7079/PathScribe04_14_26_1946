// src/services/reports/IOutboundResultQueueService.ts
import type { ServiceResult } from '../types';
import type { OutboundResultQueueEntry } from '@/types/case/OutboundResultQueueEntry';

export interface IOutboundResultQueueService {
  getAll(): Promise<ServiceResult<OutboundResultQueueEntry[]>>;
  getByCaseId(caseId: string): Promise<ServiceResult<OutboundResultQueueEntry[]>>;
  /** Real, natural dedup check — has this exact instance/state already
   *  been enqueued, regardless of trigger. Same reasoning as
   *  IOutboundChargeQueueService.getByServiceChargeRecordIds. */
  getByInstanceAndState(instanceId: string, resultState: OutboundResultQueueEntry['resultState']): Promise<ServiceResult<OutboundResultQueueEntry[]>>;
  /** Real UUID assigned here, not by the caller. */
  enqueue(entry: Omit<OutboundResultQueueEntry, 'id' | 'status' | 'queuedAt' | 'retryCount' | 'maxRetriesExceeded'>): Promise<ServiceResult<OutboundResultQueueEntry>>;

  getFailed(): Promise<ServiceResult<OutboundResultQueueEntry[]>>;
  markFailed(id: string, failure: { errorCode: OutboundResultQueueEntry['errorCode']; errorMessage: string; maxRetriesExceeded: boolean }): Promise<ServiceResult<OutboundResultQueueEntry>>;
  retryDispatch(id: string): Promise<ServiceResult<OutboundResultQueueEntry>>;
  /** Real, per direct guidance (the real receiving end for PathScribe's
   *  real outbound interface dispatch): the genuine "a real dispatch
   *  attempt actually succeeded" transition — previously, nothing in
   *  this app ever called this; a queue entry could only ever reach
   *  'QUEUED' or 'FAILED', never a genuinely earned 'SENT'. */
  markSent(id: string): Promise<ServiceResult<OutboundResultQueueEntry>>;
  /**
   * Batch 559: the SHA-256 of the PDF a send or retry actually carried, recorded on the entry (a retry may
   * send a newer signed version than the release did, so the entry says what went last).
   */
  recordPdfSha256(id: string, sha256: string): Promise<ServiceResult<OutboundResultQueueEntry>>;
}
