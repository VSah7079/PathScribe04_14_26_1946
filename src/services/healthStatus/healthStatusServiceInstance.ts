// src/services/healthStatus/healthStatusServiceInstance.ts
// Batch 669h (footer): `healthStatusService` in `@/services`: the mock in the demo, the API server's version
// when a server address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpHealthStatusService } from './httpHealthStatusService';
import { mockHealthStatusService } from './mockHealthStatusService';
import type { IHealthStatusService } from './IHealthStatusService';

export const healthStatusService: IHealthStatusService = chooseService<IHealthStatusService>('health', mockHealthStatusService, createHttpHealthStatusService);
