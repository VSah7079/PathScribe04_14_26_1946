// src/services/stationScans/httpStationScanEventService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 726: the API server's version of IStationScanEventService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route per
// interface method; the calls are in docs/architecture/STATION_TRACKING_API.md.
// A query names cases, so it is a POST with the query as the body (nothing that
// names a patient goes in a URL).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IStationScanEventService } from './IStationScanEventService';

type P<K extends keyof IStationScanEventService> = Parameters<IStationScanEventService[K]>;
const BASE = '/api/station-scans/station-scan-event';

export const createHttpStationScanEventService = (client: ApiHttpClient): IStationScanEventService =>
  buildHttpService<IStationScanEventService>(client, {
    recordMany: result('POST', () => methodPath(BASE, 'recordMany'), { body: (events: P<'recordMany'>[0]) => ({ events }) }),
    query: result('POST', () => methodPath(BASE, 'query'), { body: (q: P<'query'>[0]) => q }),
    activitySummary: result('POST', () => methodPath(BASE, 'activitySummary'), { body: (q: P<'activitySummary'>[0]) => q }),
  });
