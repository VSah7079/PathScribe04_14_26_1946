// src/services/historyExtraction/IHistoryExtractionService.ts
// Batch 621: the metadata kept beside historical cases (what the AI read from their text) and the "flag as wrong" record.
// Advisory only (historyExtraction.ts). Contract: docs/architecture/HISTORY_AI_EXTRACTION_API.md
import type { ServiceResult } from '../types';
import type { HistoryExtraction, HistoryExtractionAccuracy, HistoryExtractionFlag, HistoryExtractionFlagInput } from './historyExtraction';

export interface IHistoryExtractionService {
  /** The stored extraction for one historical case, or null. */
  getForCase(sourceCaseId: string): Promise<ServiceResult<HistoryExtraction | null>>;
  /** Needs ai:history-extraction:run. Replaces what is stored for that case. */
  save(extraction: HistoryExtraction): Promise<ServiceResult<HistoryExtraction>>;
  /** Needs ai:history-extraction:flag. Records that an extraction, or one field of it, was wrong. Changes nothing else. */
  flagAsWrong(input: HistoryExtractionFlagInput): Promise<ServiceResult<HistoryExtractionFlag>>;
  getFlags(sourceCaseId?: string): Promise<ServiceResult<HistoryExtractionFlag[]>>;
  /** Counts for measuring accuracy: extractions made, fields extracted, flags raised. */
  getAccuracy(): Promise<ServiceResult<HistoryExtractionAccuracy>>;
}
