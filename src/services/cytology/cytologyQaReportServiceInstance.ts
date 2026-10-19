// src/services/cytology/cytologyQaReportServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyQaReport service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyQaReportService } from './httpCytologyQaReportService';
import { mockCytologyQaReportService } from './mockCytologyQaReportService';
import type { ICytologyQaReportService } from './ICytologyQaReportService';

export const cytologyQaReportService: ICytologyQaReportService = chooseService<ICytologyQaReportService>('cytology', mockCytologyQaReportService, createHttpCytologyQaReportService);
