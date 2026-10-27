// src/services/reports/httpReportReleasedEventLogService.ts
// Batch 672 (wiring step 3): the API server's version of IReportReleasedEventLogService. The log is
// append-only: there is no update or delete call. The server stamps the id and the time.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, list, queryString, required } from '../apiServer/httpServiceKit';
import type { IReportReleasedEventLogService, ReportReleasedEventLogEntry } from './IReportReleasedEventLogService';

type P<K extends keyof IReportReleasedEventLogService> = Parameters<IReportReleasedEventLogService[K]>;
const BASE = '/api/reports/report-released-event-log';

export const createHttpReportReleasedEventLogService = (client: ApiHttpClient): IReportReleasedEventLogService =>
  buildHttpService<IReportReleasedEventLogService>(client, {
    record: required('POST', () => `${BASE}/record`, { body: (event: P<'record'>[0]) => event }),
    getByCaseId: list('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`, { pick: (d: { items: ReportReleasedEventLogEntry[] }) => d.items }),
  });
