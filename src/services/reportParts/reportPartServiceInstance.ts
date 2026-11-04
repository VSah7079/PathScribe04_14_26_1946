// src/services/reportParts/reportPartServiceInstance.ts
// Batch 616 (PS-483): the app's report part library (exported from `@/services`). Mock in the demo; the API
// server's with an address, which fires the same "parts changed" event after a change so open tabs refresh.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReportPartService } from './httpReportPartService';
import { mockReportPartService, notifyChanged } from './mockReportPartService';
import type { IReportPartService } from './IReportPartService';

export const reportPartService: IReportPartService = chooseService<IReportPartService>('report parts', mockReportPartService, c => createHttpReportPartService(c, notifyChanged));
