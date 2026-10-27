// src/services/historyExtraction/httpHistoryExtractionService.ts
// Batch 621: the API server's version of IHistoryExtractionService (HTTP_SERVICES_PATTERN.md §7). One route per method.
// Contract: docs/architecture/HISTORY_AI_EXTRACTION_API.md
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IHistoryExtractionService } from './IHistoryExtractionService';

type P<K extends keyof IHistoryExtractionService> = Parameters<IHistoryExtractionService[K]>;
const BASE = '/api/ai/history-extraction';

export const createHttpHistoryExtractionService = (client: ApiHttpClient): IHistoryExtractionService =>
  buildHttpService<IHistoryExtractionService>(client, {
    getForCase: result('GET', (sourceCaseId: P<'getForCase'>[0]) => `${BASE}/get-for-case${queryString({ sourceCaseId })}`),
    save: result('POST', () => `${BASE}/save`, { body: (extraction: P<'save'>[0]) => extraction }),
    flagAsWrong: result('POST', () => `${BASE}/flag-as-wrong`, { body: (input: P<'flagAsWrong'>[0]) => input }),
    getFlags: result('GET', (sourceCaseId?: P<'getFlags'>[0]) => `${BASE}/get-flags${queryString({ sourceCaseId })}`),
    getAccuracy: result('GET', () => `${BASE}/get-accuracy`),
  });
