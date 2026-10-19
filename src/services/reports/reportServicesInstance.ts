// src/services/reports/reportServicesInstance.ts
// Batch 616 (PS-483): the report services as the app uses them (exported from `@/services`). The mock in the
// demo; the API server's with an address. Report versions and report PDFs keep their own instance
// (reportVersionInstance.ts, Batch 558).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAmendmentService, createHttpInformalReviewService, createHttpLisAmendmentNoticeService } from './httpReportServices';
import { createHttpOutboundLisSyncQueueService, createHttpOutboundResultQueueService } from './httpOutboundQueueServices';
import { mockAmendmentService } from './mockAmendmentService';
import { mockInformalReviewService } from './mockInformalReviewService';
import { mockLisAmendmentNoticeService } from './mockLisAmendmentNoticeService';
import { mockOutboundLisSyncQueueService } from './mockOutboundLisSyncQueueService';
import { mockOutboundResultQueueService } from './mockOutboundResultQueueService';
import type { IAmendmentService } from './IAmendmentService';
import type { IInformalReviewService } from './IInformalReviewService';
import type { ILisAmendmentNoticeService } from './ILisAmendmentNoticeService';
import type { IOutboundLisSyncQueueService } from './IOutboundLisSyncQueueService';
import type { IOutboundResultQueueService } from './IOutboundResultQueueService';

export const amendmentService: IAmendmentService = chooseService<IAmendmentService>('reports', mockAmendmentService, createHttpAmendmentService);
export const informalReviewService: IInformalReviewService = chooseService<IInformalReviewService>('reports', mockInformalReviewService, createHttpInformalReviewService);
export const lisAmendmentNoticeService: ILisAmendmentNoticeService = chooseService<ILisAmendmentNoticeService>('reports', mockLisAmendmentNoticeService, createHttpLisAmendmentNoticeService);
export const outboundLisSyncQueueService: IOutboundLisSyncQueueService = chooseService<IOutboundLisSyncQueueService>('reports', mockOutboundLisSyncQueueService, createHttpOutboundLisSyncQueueService);
export const outboundResultQueueService: IOutboundResultQueueService = chooseService<IOutboundResultQueueService>('reports', mockOutboundResultQueueService, createHttpOutboundResultQueueService);
