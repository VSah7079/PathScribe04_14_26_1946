// src/services/quality/qaActivityRecordServiceInstance.ts
// Batch 616: the app's qa activity records, exported from `@/services` as `qaActivityRecordService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpQaActivityRecordService } from './httpQaActivityRecordService';
import { mockQaActivityRecordService } from './mockQaActivityRecordService';
import type { IQaActivityRecordService } from './IQaActivityRecordService';

export const qaActivityRecordService: IQaActivityRecordService = chooseService<IQaActivityRecordService>('qa', mockQaActivityRecordService, createHttpQaActivityRecordService);
