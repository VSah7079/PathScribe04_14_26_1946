// src/services/reportDocuments/reportDocumentInstance.ts
// Batch 556 (PS-539 phase 2d): the app's report document store, exported from
// `@/services` as `reportDocumentService`. Without an API server (the demo) it is
// this browser's store. With one, documents are read through the API too
// (httpReportDocumentService.ts), and a release made here is still kept here,
// in memory, until the release moves to the server.
import { apiServerUrl } from '../apiServer/apiServerUrl';
import { getAccessToken } from '../auth/accessTokenSource';
import { mockReportDocumentService } from './mockReportDocumentService';
import { createHttpReportDocumentApi, createServerBackedReportDocumentService } from './httpReportDocumentService';
import type { IReportDocumentService } from './reportDocumentService';

const apiBaseUrl = apiServerUrl('report documents');

export const reportDocumentService: IReportDocumentService = apiBaseUrl
  ? createServerBackedReportDocumentService(mockReportDocumentService, createHttpReportDocumentApi({ baseUrl: apiBaseUrl, fetch: (...a) => fetch(...a), accessToken: getAccessToken }))
  : mockReportDocumentService;
