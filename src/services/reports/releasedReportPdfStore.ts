// src/services/reports/releasedReportPdfStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 392 (Pete: send the PDF with every report to the interface engine;
// "hold and retry" when it isn't available). The PDF made for a result at the
// moment it was released, kept so a retry sends the same document. Keyed by
// case, instance and result state (a preliminary and a final of the same
// instance are different documents).
//
// Mock: browser storage, best effort (a full store just means a retry falls
// back to the report versions). Production: a blob column next to the outbound
// result queue, written in the same transaction as the queue entry.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import type { OruResultState } from '@/types/case/OutboundResultQueueEntry';

const STORAGE_KEY = 'released_report_pdfs';

export interface IReleasedReportPdfStore {
  get(caseId: string, instanceId: string, resultState: OruResultState): Promise<string | undefined>;
  put(caseId: string, instanceId: string, resultState: OruResultState, pdfBase64: string): Promise<void>;
}

const keyOf = (caseId: string, instanceId: string, resultState: OruResultState) => `${caseId}|${instanceId}|${resultState}`;

export const mockReleasedReportPdfStore: IReleasedReportPdfStore = {
  async get(caseId, instanceId, resultState) {
    return storageGet<Record<string, string>>(STORAGE_KEY, {})[keyOf(caseId, instanceId, resultState)];
  },
  async put(caseId, instanceId, resultState, pdfBase64) {
    try {
      const all = storageGet<Record<string, string>>(STORAGE_KEY, {});
      storageSet(STORAGE_KEY, { ...all, [keyOf(caseId, instanceId, resultState)]: pdfBase64 });
    } catch {
      // Best effort in the mock (browser storage can be full).
    }
  },
};
