// src/services/historyExtraction/IHistoryExtractionSettingsService.ts
// Batch 621: the AI extraction of historical reports setting: OFF by default, set for the enterprise, with a performing-facility override.
import type { ServiceResult } from '../types';
import type { HistoryExtractionSetting, HistoryExtractionSettingInput } from './historyExtraction';

export interface IHistoryExtractionSettingsService {
  getAll(): Promise<ServiceResult<HistoryExtractionSetting[]>>;
  getForFacility(facilityId: string): Promise<ServiceResult<HistoryExtractionSetting | null>>;
  /** Needs config:history-extraction:manage. */
  set(input: HistoryExtractionSettingInput): Promise<ServiceResult<HistoryExtractionSetting>>;
  /** Needs config:history-extraction:manage. Removes a facility's own setting (the enterprise's then applies). */
  remove(facilityId: string): Promise<ServiceResult<void>>;
}
