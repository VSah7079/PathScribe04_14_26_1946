// src/services/reportTemplates/reportTemplateServiceInstance.ts
// Batch 616: the app's report templates service, exported from `@/services` as `reportTemplateService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReportTemplateService } from './httpReportTemplateService';
import { mockReportTemplateService } from './mockReportTemplateService';
import type { IReportTemplateService } from './IReportTemplateService';

export const reportTemplateService: IReportTemplateService = chooseService<IReportTemplateService>('report-templates', mockReportTemplateService, createHttpReportTemplateService);
