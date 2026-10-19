// src/services/reportRelease/reportReleaseInstance.ts
// Batch 616 (PS-483): the app's report release buffer (exported from `@/services`). Mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReportReleaseService } from './httpReportReleaseService';
import { mockReportReleaseService } from './mockReportReleaseService';
import type { IReportReleaseService } from './IReportReleaseService';

export const reportReleaseService: IReportReleaseService = chooseService<IReportReleaseService>('report release', mockReportReleaseService, createHttpReportReleaseService);
