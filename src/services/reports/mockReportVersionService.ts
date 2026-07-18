// src/services/reports/mockReportVersionService.ts
// CORRECTED — back to the real, original two-method implementation.
// My earlier draft added getLatestForCase/createCaseVersion/
// getInstanceVersionHistory and a case-wide `instances[]` concept that
// doesn't match how this service is actually used elsewhere in the
// app. No new methods needed — instanceId is just a field now, and the
// banner can filter getByCaseId()'s results client-side.
import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import type { IReportVersionService } from './IReportVersionService';

const STORAGE_KEY = 'report_version_records';

const load    = (): ReportVersionRecord[] => storageGet<ReportVersionRecord[]>(STORAGE_KEY, []);
const persist = (data: ReportVersionRecord[]) => storageSet(STORAGE_KEY, data);

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const mockReportVersionService: IReportVersionService = {
  async getByCaseId(caseId) {
    return ok(load().filter(r => r.caseId === caseId).sort((a, b) => a.versionNumber - b.versionNumber));
  },

  async create(record) {
    const existing = load().filter(r => r.caseId === record.caseId);
    const newRecord: ReportVersionRecord = {
      ...record,
      id: `ver-${Date.now().toString(36)}`,
      versionNumber: existing.length + 1,
      createdAt: new Date().toISOString(),
    };
    persist([...load(), newRecord]);
    return ok(newRecord);
  },
};
