// src/services/reportChangeLog/reportChangeLogInstance.ts
// Batch 616 (PS-483): the app's report change log (exported from `@/services`). Mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReportChangeLogService } from './httpReportChangeLogService';
import { mockReportChangeLogService } from './mockReportChangeLogService';
import type { IReportChangeLogService } from './IReportChangeLogService';

export const reportChangeLogService: IReportChangeLogService = chooseService<IReportChangeLogService>('report change log', mockReportChangeLogService, createHttpReportChangeLogService);
