# services/reportDocuments/

Batch 538 (Pete, Oct 12, 2026: the server makes every PDF that leaves PathScribe, and the browser only shows previews, "as long as the preview matches exactly what gets sent out").

A released report is **one stored document**:
- It is made once, at release. A report held for the release delay keeps its bytes on the hold and is stored when the delay ends, so a recalled report leaves no document.
- It is stored with the SHA-256 of its bytes and never changed.
- Every channel sends those bytes and records the document id and hash: the result message (surgical, cytology, Assist), print, e-fax, file drop and the fallback channels, and their retries. Exceptions are listed under "Still to do".

Contract for the API server: [`docs/architecture/REPORT_DOCUMENT_STORE_API.md`](../../../docs/architecture/REPORT_DOCUMENT_STORE_API.md).

## Files

- **`reportDocuments.ts`** (pure): types and `pdfSha256` (over the bytes, the digest `sha256sum` prints), plus `shortHash` for display.
- **`reportDocumentService.ts`**: the store.
  - `store`, `read` (checked against the hash: `integrity` when it doesn't match) and `listByCase`. There is no update or delete.
  - `captureReleaseDocument`: one render per release, stored once, the same result for every caller.
  - `documentPdf`: a stored document as a channel's PDF.
- **`mockReportDocumentService.ts`**: the browser's store, through `mockStorage` (key `report_documents`, cleared by the demo reset). It is in memory only when an API server is configured (PS-485).

## Where it is used

- **`reports/publishReportReleasedEvent.ts`** (`releaseDocument`): makes and stores the release's document before any channel, then puts its id on the event, the delivery release context, retries and fallbacks.
- **`reports/resolveOruReportPdf.ts`, `prepareOruR01Dispatch.ts` and the dispatchers:** the result queue entry records `reportDocumentId` and `pdfSha256`, and a retry sends that document.
- **`cytology/` (case report, correction, addendum, preliminary):** the message carries the release's document, and its queue entry records it.
- **`delivery/deliverReport.ts`:** a resend reads `release.documentId`. `REPORT_DELIVERY` carries `reportDocumentId` and `pdfSha256`, and the entry records the hash when sent.
- **`printing/dispatchPrintJob.ts`:** the job records the document id and hash, and keeps no copy of the bytes; a reprint reads the document (`redispatchPrintJob.ts`). A job whose document wasn't stored keeps its bytes as before.
- **`reportRelease/releaseReport.ts`:** a held report keeps its PDF on the hold; the end of the delay publishes it, and `releaseDocument` stores it then.
- **`reports/dispatchAssistSynopticResult.ts`:** the Assist structured result stores its PDF as a document, and a rebuild for a retry reads it.
- **`pages/SynopticReportPage/modals/VersionHistoryModal.tsx`:** "Released documents", with "View as sent" on the stored bytes (audited).

## Still to do

- The cytology report is still drawn in the browser (`producedBy: browser-cytology`). The server template comes next (PS-539 D2).
- The server keeps the bytes in blob storage and the record in SQL. In the browser all documents share one storage entry; a document that can't be stored is logged and the release goes without a document id.
- Entries made before Batch 538, and per-specimen cytology messages (facilities not on consolidated case messages), have no document id; their retries behave as before.
- A release whose PDF couldn't be made stores no document; a later retry falls back to the kept PDF or the saved report version.
- An Assist result's signed time is the time the message is built, not the sign-out time.

## Batch 539

Cytology documents are made by the report renderer too (`producedBy: 'report-renderer'`); `browser-cytology` remains only on documents Batch 538 stored. A released cytology case's "Print case report" opens its newest stored case document (`cytology/cytologyCaseReportForPrint.ts`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Each document's bytes are kept in their own storage entry (`report_documents:<id>`), with a small list of records in `report_documents`. Before, every document was in one entry, so each new document rewrote all the others and the browser's limit for one entry came closer. Documents stored the old way are still read. If the record can't be saved, its bytes are removed and the store says `notSaved`. Open since Batch 538.

## Batch 556 (PS-539 phase 2d: report documents through the API)

- `httpReportDocumentService.ts` (Batch 556, new) reads released documents through the API server: `GET /api/report-documents/{id}?purpose=view|send` and `GET /api/cases/{caseId}/report-documents`.
  - **Hash check:** the SHA-256 is checked again against `X-Content-SHA256`, and a different id is refused. A missing hash header reads as "couldn't be fetched" (a misconfigured server), not as a changed document.
  - **Where documents are read from:** `createServerBackedReportDocumentService` reads this browser's documents first (releases made here, in memory until the release moves to the server), then the server's. It lists both, and marks the list `meta.partial` when the server's can't be read.
- `reportDocumentInstance.ts` (new) is `reportDocumentService` in `@/services`: the mock in the demo, the server-backed store with an API server. Every reader goes through it.
- `ReportDocumentError` gains `notPermitted` and `unavailable`. `documentPdf` sets `documentError` and reads with `purpose 'send'`. `sentDocumentProblem` gives the screen's message.
- Tests: `httpReportDocumentService.test.ts`.
