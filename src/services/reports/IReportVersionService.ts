// src/services/reports/IReportVersionService.ts
import { ServiceResult } from '../types';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';

export interface IReportVersionService {
  getByCaseId(caseId: string): Promise<ServiceResult<ReportVersionRecord[]>>;
  create(record: Omit<ReportVersionRecord, 'id' | 'createdAt' | 'versionNumber'>): Promise<ServiceResult<ReportVersionRecord>>;
}
