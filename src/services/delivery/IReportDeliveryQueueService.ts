// src/services/delivery/IReportDeliveryQueueService.ts
// Batch 520 (PS-280): the report delivery queue (e-fax and file drop). Same shape as the other
// outbound queues (IReferralOutboundQueueService), plus a lookup by case and an update of what
// a resend finds (a fax number added since).
import type { ServiceResult } from '../types';
import type { ReportDeliveryQueueEntry } from '@/types/delivery/ReportDeliveryQueueEntry';

export type NewReportDeliveryEntry = Omit<ReportDeliveryQueueEntry, 'id' | 'status' | 'queuedAt' | 'retryCount' | 'maxRetriesExceeded'>;

export interface IReportDeliveryQueueService {
  getAll(): Promise<ServiceResult<ReportDeliveryQueueEntry[]>>;
  getByCaseId(caseId: string): Promise<ServiceResult<ReportDeliveryQueueEntry[]>>;
  enqueue(entry: NewReportDeliveryEntry): Promise<ServiceResult<ReportDeliveryQueueEntry>>;
  getFailed(): Promise<ServiceResult<ReportDeliveryQueueEntry[]>>;
  markFailed(id: string, failure: { errorCode: ReportDeliveryQueueEntry['errorCode']; errorMessage: string; maxRetriesExceeded: boolean }): Promise<ServiceResult<ReportDeliveryQueueEntry>>;
  retryDispatch(id: string): Promise<ServiceResult<ReportDeliveryQueueEntry>>;
  /** Batch 538: with the SHA-256 of the PDF sent. */
  markSent(id: string, sent?: { pdfSha256?: string }): Promise<ServiceResult<ReportDeliveryQueueEntry>>;
  /** Records the fax recipient found on a later attempt. */
  setFaxRecipient(id: string, fax: { number: string; recipientName?: string }): Promise<ServiceResult<ReportDeliveryQueueEntry>>;
  /** Batch 521 (PS-281 §3.2.3): records the provider's transmission report. */
  setTransmission(id: string, transmission: NonNullable<ReportDeliveryQueueEntry['transmission']>): Promise<ServiceResult<ReportDeliveryQueueEntry>>;
}
