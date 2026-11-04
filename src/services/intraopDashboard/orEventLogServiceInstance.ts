// src/services/intraopDashboard/orEventLogServiceInstance.ts
// Batch 616: the app's or event log, exported from `@/services` as `orEventLogService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpOrEventLogService } from './httpOrEventLogService';
import { mockOrEventLogService } from './mockOrEventLogService';
import type { IOrEventLogService } from './IOrEventLogService';

export const orEventLogService: IOrEventLogService = chooseService<IOrEventLogService>('intraop', mockOrEventLogService, createHttpOrEventLogService);
