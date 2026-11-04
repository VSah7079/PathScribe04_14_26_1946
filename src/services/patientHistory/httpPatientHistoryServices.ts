// src/services/patientHistory/httpPatientHistoryServices.ts
// Batch 616 (PS-503): the API server's patient history: the per-case cache of prior reports and the
// LIS lookup. Prior reports are PHI, so the cache lives on the server; the browser holds a result only in memory.
// Contract: PATIENTS_API.md section 4. The LIS lookup is made by the SERVER (it holds the LIS credentials and
// the secure-endpoint rule), never by the browser directly.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';
import type { PatientHistoryCacheEntry, PatientHistoryReport } from '@/types/patientHistory/PatientHistoryCacheEntry';
import type { IPatientHistoryCacheService } from './IPatientHistoryCacheService';
import type { IPatientHistoryLisService } from './IPatientHistoryLisService';

type ArgsPatientHistoryCache<K extends keyof IPatientHistoryCacheService> = Parameters<IPatientHistoryCacheService[K]>;
const BASE_PATIENT_HISTORY_CACHE = '/api/patient-history/patient-history-cache';
const routePatientHistoryCache = (method: string): string => methodPath(BASE_PATIENT_HISTORY_CACHE, method);

export function createHttpPatientHistoryCacheService(client: ApiHttpClient): IPatientHistoryCacheService {
  const routes = buildHttpService<IPatientHistoryCacheService>(client, {
    getAll: result('GET', () => routePatientHistoryCache('getAll'), { pick: (d: ItemsReply<PatientHistoryCacheEntry>) => itemsOf(d) }),
    getByCaseId: result('GET', (caseId: ArgsPatientHistoryCache<'getByCaseId'>[0]) => `${routePatientHistoryCache('getByCaseId')}${queryString({ caseId })}`),
    ensurePending: result('POST', () => routePatientHistoryCache('ensurePending'), { body: (caseId: string, patientId: string) => ({ caseId, patientId }) }),
    markFetched: result('POST', () => routePatientHistoryCache('markFetched'), { body: (caseId: string, reports: unknown) => ({ caseId, reports }) }),
    markFailed: result('POST', () => routePatientHistoryCache('markFailed'), { body: (caseId: string, errorMessage: string) => ({ caseId, errorMessage }) }),
    destroy: result('POST', () => routePatientHistoryCache('destroy'), { body: (caseId: ArgsPatientHistoryCache<'destroy'>[0]) => ({ caseId }) }),
  });
  return {
    ...routes,
    // No history yet for a case is a normal answer ({ ok: true, data: null }).
    getByCaseId: async caseId => {
      const r = await routes.getByCaseId(caseId);
      return r.ok === false && r.error === 'NOT_FOUND' ? { ok: true as const, data: null } : r;
    },
  };
}
const BASE_PATIENT_HISTORY_LIS = '/api/patient-history/patient-history-lis';
const routePatientHistoryLis = (method: string): string => methodPath(BASE_PATIENT_HISTORY_LIS, method);

export const createHttpPatientHistoryLisService = (client: ApiHttpClient): IPatientHistoryLisService =>
  buildHttpService<IPatientHistoryLisService>(client, {
    // The MRN goes in the body, not the path, so it is not left in server access logs.
    fetchPatientHistory: result('POST', () => routePatientHistoryLis('fetchPatientHistory'), { body: (mrn: string) => ({ mrn }), pick: (d: ItemsReply<PatientHistoryReport>) => itemsOf(d) }),
  });
