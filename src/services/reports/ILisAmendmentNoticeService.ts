// src/services/reports/ILisAmendmentNoticeService.ts
import { ServiceResult } from '../types';
import type { LisAmendmentNotice, LisAmendmentNoticeStatus } from '@/types/reports/LisAmendmentNotice';

export interface ILisAmendmentNoticeService {
  getByCaseId(caseId: string): Promise<ServiceResult<LisAmendmentNotice[]>>;
  /** Pending notices across all cases for a given pathologist — this is
   *  what a worklist badge queries. */
  getPendingForPathologist(pathologistId: string): Promise<ServiceResult<LisAmendmentNotice[]>>;
  create(notice: Omit<LisAmendmentNotice, 'id' | 'receivedAt' | 'status'>): Promise<ServiceResult<LisAmendmentNotice>>;
  updateStatus(id: string, status: LisAmendmentNoticeStatus): Promise<ServiceResult<LisAmendmentNotice>>;
}
