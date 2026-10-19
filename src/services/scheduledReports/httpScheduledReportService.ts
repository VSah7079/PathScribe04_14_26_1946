// src/services/scheduledReports/httpScheduledReportService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IScheduledReportService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/SEARCH_REPORTING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IScheduledReportService } from './IScheduledReportService';

type P<K extends keyof IScheduledReportService> = Parameters<IScheduledReportService[K]>;
const BASE = '/api/scheduled-reports/scheduled-report';

export const createHttpScheduledReportService = (client: ApiHttpClient): IScheduledReportService =>
  buildHttpService<IScheduledReportService>(client, {
    assessRecipients: result('GET', (savedReportId: P<'assessRecipients'>[0], recipientUserIds: P<'assessRecipients'>[1]) => `${BASE}/assess-recipients${queryString({ savedReportId, recipientUserIds })}`),
    list: result('GET', () => `${BASE}/list`),
    create: result('POST', () => `${BASE}/create`, { body: (draft: P<'create'>[0]) => (draft) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], draft: P<'update'>[1]) => ({ id, draft }) }),
    setActive: result('POST', () => `${BASE}/set-active`, { body: (id: P<'setActive'>[0], active: P<'setActive'>[1]) => ({ id, active }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0]) => ({ id }) }),
    runNow: result('POST', () => `${BASE}/run-now`, { body: (id: P<'runNow'>[0]) => ({ id }) }),
    runDue: result('POST', () => `${BASE}/run-due`),
  });
