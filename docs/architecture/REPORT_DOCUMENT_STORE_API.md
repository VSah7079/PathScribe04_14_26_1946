# Released report documents: one stored PDF per release (Batch 538)

**Decision.** Pete, Oct 12, 2026 (PS-539 decision D2): "PDF that leaves PathScribe, and the browser only shows previews. As long as the preview matches exactly what gets sent out when the interface server is delivering mine pdf."

**What this contract guarantees:**

1. **The server makes every report PDF that leaves PathScribe:** surgical, autopsy, preliminary, corrected, addendum and cytology. It renders from the signed report content, with the report renderer (`REPORT_RENDERING_SERVICE.md`).
2. **A released report is rendered once and stored as a report document,** with the SHA-256 of its bytes. A document is never changed or deleted. Retention follows the case.
3. **Every channel sends that document's bytes**:
   - the result message (ORU^R01);
   - print;
   - e-fax;
   - file drop;
   - the fallback channels;
   - every retry and resend.

   Each queue entry records the document's id and hash. A retry of an entry that has a document id sends that document, never re-renders, and never picks a newer PDF.
4. **"View as sent" shows the stored bytes,** so what a person sees after release is byte-for-byte what went out.
5. **The preview is drawn by the same renderer from the same payload.** Only two things differ: the watermark (an unsigned print says "PRELIMINARY — SUBJECT TO CHANGE"), and the signature line and sign-out time, which don't exist until the report is signed.

The browser implements points 2 to 5, and since Batch 539 every PDF in point 1 comes from the report renderer (cytology included). These gaps remain:
- the bytes are kept in browser storage, one storage entry per document and a small list of records (since Batch 549; before, all documents shared one entry). In the demo the browser's storage limit still applies, and a document that can't be stored is logged and the release goes out without a document id;
- a surgical final released without a PDF of its own (the end of the release delay, a sign-out with no one on the page) uses the signed PDF saved at sign-out (`producedBy: saved-version`), which the browser asked the renderer for;
- queue entries made before Batch 538 have no document id. Their retries behave as before: the kept PDF or the saved report version. So do the per-specimen cytology messages of facilities not on consolidated case messages, which the renderer makes again on each send;
- when the release's PDF can't be made, no document is stored. Each channel is held with the error, and a later retry of an entry without a document falls back as above;
- an Assist (structured result) release stores its document the same way; its signed time is still the time the message is built, not the sign-out time (open).

The API server must implement the contract below. The browser's version is `src/services/reportDocuments/`.

## 1. The document

```
ReportDocument {
  id:          string            // "rdoc-…", assigned by the server
  caseId:      string
  reportType:  PRELIMINARY | FINAL | CORRECTED | ADDENDUM
  source:      SURGPATH | CYTOLOGY
  instanceId?: string            // the report instance (correction, addendum) or cytology record
  releasedAt:  ISO-8601
  producedBy:  report-renderer | browser-cytology | saved-version
  sha256:      string            // lower-case hex, over the PDF bytes (sha256sum report.pdf)
  byteLength:  number
  createdAt:   ISO-8601
}
```

The `producedBy` values:
- **`saved-version`:** a release that brings no PDF of its own (the end of the release delay for a surgical sign-out). It uses the signed PDF saved with the report versions at sign-out. *Batch 558:* that PDF is read through `reportVersionPdf.ts`, checked against the version's `pdfSha256` and, for a version the API server holds, read with `purpose=send` (`BLOB_STORAGE_API.md` §11). A PDF that fails its check holds the release.
- **`browser-cytology`:** a cytology report drawn in the browser. Only documents stored by Batch 538 have it; since Batch 539 the renderer makes cytology too (`report-renderer`).

**Storage.**
- The record goes in SQL; the bytes go in blob storage. The record is written **in the same transaction as the release** (the outbox pattern of `LIVE_UPDATES_SIGNALR.md`), so a release can't exist without its document; the bytes are put in place just before and locked just after (`BLOB_STORAGE_API.md` §4).
- The table grants INSERT and SELECT only. Blob containers are immutable (WORM, or versioning with deletes denied) for the retention period.

## 2. Endpoints

| Call | Capability | Notes |
|---|---|---|
| `POST /api/cases/{caseId}/report-preview` `{ purpose: "print" }` | `report:case-report:print` | Renders the current content with the same payload builder as the release; returns `application/pdf`; stored nowhere. |
| *(no endpoint)* release | (the release's own: sign-out, `…preliminary:release`, amendment) | The server renders and stores the document inside the release transaction; the response carries `{ documentId, sha256 }`. |
| `GET /api/cases/{caseId}/report-documents` | `report:case-report:print` | The case's documents (metadata only), oldest first. |
| `GET /api/report-documents/{id}` | `report:case-report:print` for the document's case | Returns `application/pdf` plus headers `X-Content-SHA256` and `X-Report-Document-Id`. *Batch 556:* also the record's `X-Case-Id`, `X-Report-Type`, `X-Report-Source`, `X-Released-At`, `X-Produced-By` and `X-Created-At`, so the browser can show what it opened. It refuses a document with another id, or whose bytes don't match `X-Content-SHA256` (shown as an integrity failure). A response with no `X-Content-SHA256` is treated as a misconfigured server, "couldn't be fetched", not as a changed document. The server recomputes the hash before answering. A mismatch returns **409 `DOCUMENT_INTEGRITY`**, raises an alert to Admin and Lab Director, and sends nothing. Every read is audited: `DOCUMENT_RENDERED`, document `report-document`, for a person viewing it (`purpose=view`, below). |

There is no PUT, PATCH or DELETE.

**Reading documents (Batch 556):**
- **CORS:** where the API is on another host than the app, the response sends `Access-Control-Expose-Headers: X-Content-SHA256, X-Report-Document-Id, X-Case-Id, X-Report-Type, X-Report-Source, X-Released-At, X-Produced-By, X-Created-At`. Otherwise the browser can't see them.
- **`?purpose=view|send`** (*Batch 556*):
  - `view` is a person opening it (View as sent), audited as `DOCUMENT_RENDERED`;
  - `send` is a channel sending it (a retry, a fallback, a print, the result message), recorded with that channel's own audit and not as a rendering.

  With the API server, the server's audit is the record. The browser's own `recordDocumentOutput` entry stays in this browser's in-memory log only.
- **System retries:** an automatic retry runs under whoever is signed in on that browser until the retries move to the server (phase 2e, `VITE_SERVER_JOBS`). The server's own jobs read documents with a service identity, never a user's token.

## 3. Channels and retries

| Channel | Where the document id is kept | On a retry |
|---|---|---|
| Result message (ORU^R01), surgical, preliminary, autopsy | `OutboundResultQueueEntry.reportDocumentId`, `pdfSha256` | `prepareOruR01Dispatch(…, { documentId })` sends that document |
| Cytology result message (case report, correction, addendum, preliminary) | `CytologyOutboundResultQueueEntry.reportDocumentId`, `pdfSha256` | The same, through `buildCytologyCaseReportMessage({ pdf })` / `buildCytologyPreliminaryMessage` |
| e-fax, file drop | `ReportDeliveryQueueEntry.release.documentId`. The `pdfSha256` is recorded when sent, and `REPORT_DELIVERY` carries `reportDocumentId` and `pdfSha256`. | `deliverReport` reads the document. Before Batch 538 a correction's retry sent the case's newest signed PDF (the pre-correction sign-out), and a preliminary's was held for good. |
| Print | `PrintJob.reportDocumentId`, `pdfSha256`, with the bytes | Retry and redirect reprint the same bytes (as before) |
| Fallback channels after a dead letter | `DeliveryRetryRecord.release.documentId` | `sendReleaseFallback` sends the release's document |
| Held for the release delay | The bytes stay on the hold (`HeldRelease.pdfBase64`); nothing is stored while held. | When the delay ends, the release is published and the document is stored then, so a report recalled during the delay leaves no document. The bytes stored are the ones held: no new PDF is made. |

**Rules for the server:**
- **The receiver.** The interface engine (and the development receiver `functions/main.py`, which already records each PDF's SHA-256) should compare the received bytes with `pdfSha256` and reject a mismatch. *Batch 559:* the result message (ORU) carries the hash itself, `reportPdfSha256`, whenever PathScribe knows it (a stored document, or a signed version's PDF checked against its hash), and a result sent with a signed version's PDF records `pdfSha256` on its queue entry too.
- **Rendering errors.** A release whose PDF can't be rendered is still a release. Every channel gets the same error and is held for retry. The server should then render once, store the document against the release, and have every later retry use it. (The browser doesn't do that yet: see the gaps above.)

## 4. Determinism

Byte-identical re-rendering is **not** relied on: the release renders once and stores the result. The renderer should still be deterministic, as the Playwright service requires in §4 of `REPORT_RENDERING_SERVICE.md`:
- a fixed creation date, from the signature time;
- no random `/ID`;
- embedded fonts.

That way an auditor can re-render a stored release from its content and compare. The interim ReportLab renderer is not yet deterministic (PS-333).

## 5. Status

| Part | Status |
|---|---|
| Browser: document store, hash, one render per release, ids on every queue (result messages, cytology, Assist, delivery, print), retries and fallbacks use the document, "View as sent" with the hash (Version History, "Released documents") | **Built, Batch 538** (`src/services/reportDocuments/`), with the gaps listed at the top |
| Preview and release from one payload builder (surgical and autopsy report page) | **Built, Batch 538** |
| Cytology rendered by the server (preview and release; the jsPDF renderer removed); a released cytology case's "Print case report" opens its stored document | **Built, Batch 539** (`functions/cytology_report.py`, `src/services/cytology/cytologyRenderPayload.ts`). Needs the `functions/` redeploy. |
| The browser reading documents through these endpoints when the API server is configured (`httpReportDocumentService.ts`). It reads this browser's own releases first, then the server's, lists both, re-checks the hash, and says when the server's list couldn't be read | **Built, Batch 556** |
| Server storage, endpoints, integrity alert, receiver hash check | **Planned** (India team, with PS-539) |
