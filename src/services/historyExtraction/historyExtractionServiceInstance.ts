// src/services/historyExtraction/historyExtractionServiceInstance.ts
// Batch 621: the app's history extraction service and its setting, exported from `@/services`. The mocks in the demo; the API
// server's versions when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpHistoryExtractionService } from './httpHistoryExtractionService';
import { createHttpHistoryExtractionSettingsService } from './httpHistoryExtractionSettingsService';
import { mockHistoryExtractionService } from './mockHistoryExtractionService';
import { mockHistoryExtractionSettingsService } from './mockHistoryExtractionSettingsService';
import type { IHistoryExtractionService } from './IHistoryExtractionService';
import type { IHistoryExtractionSettingsService } from './IHistoryExtractionSettingsService';

export const historyExtractionService: IHistoryExtractionService = chooseService<IHistoryExtractionService>('historyExtraction', mockHistoryExtractionService, createHttpHistoryExtractionService);
export const historyExtractionSettingsService: IHistoryExtractionSettingsService = chooseService<IHistoryExtractionSettingsService>('historyExtractionSettings', mockHistoryExtractionSettingsService, createHttpHistoryExtractionSettingsService);
