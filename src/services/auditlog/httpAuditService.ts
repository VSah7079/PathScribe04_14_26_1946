// src/services/auditlog/httpAuditService.ts
// Batch 616 (PS-484): the API server's version of IAuditService (contract:
// docs/architecture/STAFF_ADMIN_API.md §1). The server stamps the time and the
// acting user from the bearer token; the browser sends the entry and the scan station it was done at (the server cannot know the station; the demo's mock stamps it the same way). The
// audit table is append-only: there is no update or delete call.
import { getEffectiveScanStationId } from '../../utils/effectiveScanStation';
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { AuditFilterParams, AuditLog, ErrorFilterParams, ErrorLog, IAuditService, NewAuditLog, NewErrorLog } from './IAuditService';

interface Items<T> { items: T[] }

type Args<K extends keyof IAuditService> = Parameters<IAuditService[K]>;
const BASE = '/api/auditlog/audit';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpAuditService = (client: ApiHttpClient): IAuditService =>
  buildHttpService<IAuditService>(client, {
    getAuditLogs: result('POST', () => route('getAuditLogs'), { body: (f?: AuditFilterParams) => ({
      type: f?.type === 'all' ? undefined : f?.type, user: f?.user === 'all' ? undefined : f?.user,
      dateFrom: f?.dateFrom, dateTo: f?.dateTo, search: f?.search,
    }), pick: (d: Items<AuditLog>) => d.items ?? [] }),
    logEvent: result('POST', () => route('logEvent'), { body: (e: NewAuditLog) => ({ ...e, stationId: getEffectiveScanStationId() }) }),
    getErrorLogs: result('POST', () => route('getErrorLogs'), { body: (f?: ErrorFilterParams) => ({
      severity: f?.severity === 'all' ? undefined : f?.severity,
      resolved: f?.resolved === 'all' || f?.resolved === undefined ? undefined : f.resolved,
      search: f?.search,
    }), pick: (d: Items<ErrorLog>) => d.items ?? [] }),
    logError: result('POST', () => route('logError'), { body: (e: NewErrorLog) => e }),
    resolveError: result('POST', () => route('resolveError'), { body: (id: Args<'resolveError'>[0]) => ({ id }) }),
  });
