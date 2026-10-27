// src/services/historyExtraction/mockHistoryExtractionService.ts
// Batch 621: browser-storage backed extractions and flags. Saving needs ai:history-extraction:run and flagging needs
// ai:history-extraction:flag (guardConfigWrites, audited). Advisory only: nothing outside the extraction and display code reads this.
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IHistoryExtractionService } from './IHistoryExtractionService';
import { summariseAccuracy, type HistoryExtraction, type HistoryExtractionFlag } from './historyExtraction';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

export const HISTORY_EXTRACTIONS_KEY = 'history_extractions_v1';
export const HISTORY_EXTRACTION_FLAGS_KEY = 'history_extraction_flags_v1';

const loadAll = () => storageGet<HistoryExtraction[]>(HISTORY_EXTRACTIONS_KEY, []);
const loadFlags = () => storageGet<HistoryExtractionFlag[]>(HISTORY_EXTRACTION_FLAGS_KEY, []);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

const unchecked: IHistoryExtractionService = {
  async getForCase(sourceCaseId) { return ok(loadAll().find(e => e.sourceCaseId === sourceCaseId) ?? null); },
  async save(extraction) {
    const all = loadAll();
    storageSet(HISTORY_EXTRACTIONS_KEY, [...all.filter(e => e.sourceCaseId !== extraction.sourceCaseId), extraction]);
    return ok(extraction);
  },
  async flagAsWrong(input) {
    const flags = loadFlags();
    const dup = flags.find(f => f.sourceCaseId === input.sourceCaseId && f.fieldId === input.fieldId && f.sourceTextHash === input.sourceTextHash && f.flaggedBy === input.flaggedBy);
    if (dup) return ok(dup);
    const saved: HistoryExtractionFlag = { ...input, id: `hxf-${flags.length + 1}-${Date.now().toString(36)}`, flaggedAt: new Date().toISOString() };
    storageSet(HISTORY_EXTRACTION_FLAGS_KEY, [...flags, saved]);
    return ok(saved);
  },
  async getFlags(sourceCaseId) { return ok(loadFlags().filter(f => !sourceCaseId || f.sourceCaseId === sourceCaseId)); },
  async getAccuracy() { return ok(summariseAccuracy(loadAll(), loadFlags())); },
};

export const mockHistoryExtractionService: IHistoryExtractionService = guardConfigWrites(unchecked, [
  ['ai:history-extraction:run', ['save']],
  ['ai:history-extraction:flag', ['flagAsWrong']],
]);
