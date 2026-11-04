// src/services/reportDocuments/mockReportDocumentService.ts
// Batch 538: the browser's report document store. Through mockStorage, so in
// the demo it is kept in this browser, and with the API server configured it is
// held in memory only (PS-485). Browser storage can fill up: a document that
// can't be saved is reported ('notSaved') and the release goes on without it.
//
// Batch 549 (open since Batch 538): one storage entry per document's bytes
// (`report_documents:<id>`) and one small list of records (`report_documents`),
// instead of every document in one entry, which made each new document rewrite
// all the others and brought the browser's size limit for one entry closer.
import { storageGet, storageSet, storageClear } from '../mockStorage';
import type { ReportDocument } from './reportDocuments';
import { createReportDocumentService } from './reportDocumentService';

export const REPORT_DOCUMENTS_STORAGE_KEY = 'report_documents';
/** The storage entry holding one document's bytes. */
export const reportDocumentBytesKey = (id: string) => `${REPORT_DOCUMENTS_STORAGE_KEY}:${id}`;

type IndexEntry = ReportDocument & { pdfBase64?: string };

export const mockReportDocumentService = createReportDocumentService({
  readIndex: () => storageGet<Record<string, IndexEntry> | null>(REPORT_DOCUMENTS_STORAGE_KEY, null),
  writeIndex: all => {
    storageSet(REPORT_DOCUMENTS_STORAGE_KEY, all);
    // storageSet swallows a full store; check every record landed.
    const back = storageGet<Record<string, IndexEntry> | null>(REPORT_DOCUMENTS_STORAGE_KEY, null);
    return !!back && Object.keys(all).every(id => !!back[id]);
  },
  readBytes: id => storageGet<string | null>(reportDocumentBytesKey(id), null),
  writeBytes: (id, pdfBase64) => {
    storageSet(reportDocumentBytesKey(id), pdfBase64);
    return storageGet<string | null>(reportDocumentBytesKey(id), null) === pdfBase64;
  },
  removeBytes: id => storageClear(reportDocumentBytesKey(id)),
  now: () => new Date(),
  newId: () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`),
});
