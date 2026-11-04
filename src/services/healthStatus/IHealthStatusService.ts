// src/services/healthStatus/IHealthStatusService.ts
// Batch 669h (footer): the system status the Home footer shows. The demo's mock or the API server's
// version is chosen in healthStatusServiceInstance.ts (docs/architecture/HEALTH_STATUS_API.md).
import type { ServiceResult } from '../types';
import type { HealthStatus } from './healthStatusContract';

export interface IHealthStatusService {
  /** Checks the system once. A failure (no answer, unreadable answer) is an error result, never "operational". */
  check(): Promise<ServiceResult<HealthStatus>>;
}

export const HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED';
