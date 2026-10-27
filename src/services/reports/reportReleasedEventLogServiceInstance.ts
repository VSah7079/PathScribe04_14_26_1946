// src/services/reports/reportReleasedEventLogServiceInstance.ts
// Batch 672 (wiring step 3): the app's reportReleasedEventLogService. The mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReportReleasedEventLogService } from './httpReportReleasedEventLogService';
import { mockReportReleasedEventLogService } from './mockReportReleasedEventLogService';
import type { IReportReleasedEventLogService } from './IReportReleasedEventLogService';

export const reportReleasedEventLogService: IReportReleasedEventLogService = chooseService<IReportReleasedEventLogService>('reports', mockReportReleasedEventLogService, createHttpReportReleasedEventLogService);
