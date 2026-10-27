// src/services/healthStatus/httpHealthStatusService.ts
// Batch 669h (footer): the API server's version of IHealthStatusService, built from the shared HTTP kit.
// Route: GET /api/health/health-status/check (docs/architecture/HEALTH_STATUS_API.md). The answer is read
// strictly (parseHealthStatus); anything else is a failed check.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { methodPath } from '../apiServer/httpServiceKit';
import type { IHealthStatusService } from './IHealthStatusService';
import { HEALTH_CHECK_FAILED } from './IHealthStatusService';
import { parseHealthStatus } from './healthStatusContract';

const BASE = '/api/health/health-status';

export function createHttpHealthStatusService(client: ApiHttpClient): IHealthStatusService {
  return {
    async check() {
      try {
        const r = await client.get<unknown>(methodPath(BASE, 'check'));
        if (!r.ok) return { ok: false, error: HEALTH_CHECK_FAILED };
        const parsed = parseHealthStatus(r.data);
        return parsed ? { ok: true, data: parsed } : { ok: false, error: HEALTH_CHECK_FAILED };
      } catch {
        return { ok: false, error: HEALTH_CHECK_FAILED };
      }
    },
  };
}
