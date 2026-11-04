// src/services/scheduledReports/scheduledReportServiceInstance.ts
// Batch 617 (PS-514): the app's scheduledReport service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpScheduledReportService } from './httpScheduledReportService';
import { mockScheduledReportService } from './mockScheduledReportService';
import type { IScheduledReportService } from './IScheduledReportService';

export const scheduledReportService: IScheduledReportService = chooseService<IScheduledReportService>('scheduledReports', mockScheduledReportService, createHttpScheduledReportService);
