// src/services/historyExtraction/httpHistoryExtractionSettingsService.ts
// Batch 621: the API server's version of IHistoryExtractionSettingsService (HTTP_SERVICES_PATTERN.md §7).
// Contract: docs/architecture/HISTORY_AI_EXTRACTION_API.md
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IHistoryExtractionSettingsService } from './IHistoryExtractionSettingsService';

type P<K extends keyof IHistoryExtractionSettingsService> = Parameters<IHistoryExtractionSettingsService[K]>;
const BASE = '/api/ai/history-extraction-settings';

export const createHttpHistoryExtractionSettingsService = (client: ApiHttpClient): IHistoryExtractionSettingsService =>
  buildHttpService<IHistoryExtractionSettingsService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getForFacility: result('GET', (facilityId: P<'getForFacility'>[0]) => `${BASE}/get-for-facility${queryString({ facilityId })}`),
    set: result('POST', () => `${BASE}/set`, { body: (input: P<'set'>[0]) => input }),
    remove: result('POST', () => `${BASE}/remove`, { body: (facilityId: P<'remove'>[0]) => ({ facilityId }) }),
  });
