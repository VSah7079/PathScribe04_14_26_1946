// src/services/reportChangeLog/httpReportChangeLogService.ts
// Batch 616 (PS-483): the API server's report change log. Contract: REPORT_CHANGE_LOG_API.md (the read route is the one already there; the write route is the same path).
// The log holds field-level before/after text from the report, so it is PHI: the server stores it
// with the case and the browser never caches it.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';
import type { IReportChangeLogService, ReportChangeEntry } from './IReportChangeLogService';

type Args<K extends keyof IReportChangeLogService> = Parameters<IReportChangeLogService[K]>;
const BASE = '/api/report-change-log/report-change-log';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpReportChangeLogService = (client: ApiHttpClient): IReportChangeLogService =>
  buildHttpService<IReportChangeLogService>(client, {
    record: result('POST', () => route('record'), { body: (entry: Omit<ReportChangeEntry, 'id'>) => entry }),
    listForCase: result('GET', (caseId: Args<'listForCase'>[0]) => `${route('listForCase')}${queryString({ caseId })}`, { pick: (d: ItemsReply<ReportChangeEntry>) => itemsOf(d) }),
  });
