// src/services/reports/IReportVersionService.ts
import { ServiceResult } from '../types';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';

export interface IReportVersionService {
  getByCaseId(caseId: string): Promise<ServiceResult<ReportVersionRecord[]>>;
  /**
   * Batch 558: `priorVersions` are the case's versions held elsewhere (the API server's), counted with this
   * store's own when the new version is numbered and when an amendment is told apart (CORRECTED or ADDENDUM).
   */
  create(record: Omit<ReportVersionRecord, 'id' | 'createdAt' | 'versionNumber'>, context?: { priorVersions?: readonly ReportVersionRecord[] }): Promise<ServiceResult<ReportVersionRecord>>;
}
