// src/services/reports/reportVersionInstance.ts
// Batch 558 (PS-539 phase 2d): the app's report versions and the reader for
// their signed PDFs, exported from `@/services` as `reportVersionService` and
// `reportVersionPdfReader`. Without an API server (the demo) they are this
// browser's. With one, the server's versions are listed too and their PDFs
// read through the API (httpReportVersionService.ts); a version signed here is
// still kept here, in memory, until sign-out moves to the server (phase 2e).
import { apiServerUrl } from '../apiServer/apiServerUrl';
import { getAccessToken } from '../auth/accessTokenSource';
import { mockReportVersionService } from './mockReportVersionService';
import { createHttpReportVersionApi, createServerBackedReportVersionService } from './httpReportVersionService';
import { createReportVersionPdfReader } from './reportVersionPdf';
import type { IReportVersionService } from './IReportVersionService';

const apiBaseUrl = apiServerUrl('report versions');
const api = apiBaseUrl
  ? createHttpReportVersionApi({ baseUrl: apiBaseUrl, fetch: (...a) => fetch(...a), accessToken: getAccessToken })
  : null;

export const reportVersionService: IReportVersionService = api
  ? createServerBackedReportVersionService(mockReportVersionService, api)
  : mockReportVersionService;

export const reportVersionPdfReader = createReportVersionPdfReader({ server: api });
