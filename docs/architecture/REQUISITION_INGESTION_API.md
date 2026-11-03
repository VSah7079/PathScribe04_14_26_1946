# Requisition ingestion API (Batch 762)

**Source:** "PathScribe Technical Specification: Automated Batch Requisition & Document Ingestion", version 1.0 (Pete Nimmo, Nov 2, 2026). Product guide: `docs/product/REQUISITION_INGESTION.md`.

**Status:** the browser side is Built (Demo). The server side below is the contract for the API server (ASP.NET Core) and is **Planned**: no server job reads a file share yet.

## 1. Reference only

PathScribe never stores the PDF. A scanned requisition stays where the hospital keeps it (a network share, an ECM, the LIS document store). PathScribe keeps a pointer to it, the same `AttachmentPointer` the case attachments use (`CASE_ATTACHMENTS_API.md`): a stable object key in the hospital's storage, or a permanent https URL. Opening one asks for a short-lived read link (`openDocument`); nothing stores a read link.

Encryption at rest (spec §3) is the storage's own (the hospital's bucket, share or ECM) and the SQL Server database's Transparent Data Encryption for the link records. PathScribe adds no copy to encrypt.

## 2. The job

A scheduled function per source (`RECURRING_JOBS` `requisition.ingest`, every `scheduleMinutes` of the source; `MESSAGE_BUS_API.md` §5). Each run does one batch and ends:

1. List the new files in the source. A source is one location, configured by its address (Pete, Nov 2, 2026): a folder on the hospital network (`fileShare`: a `\\server\share` path or an smb, nfs, file or https address), a third-party document system the server reads at its https address (`documentSystem`: an ECM, the LIS document store, a scanning service; the credentials are the API server's, never the browser's), or a system that posts scans to the API (`api`). There can be as many sources as needed.
2. Refuse anything that is not a PDF (§2.1). The file is left where it is and the run's report names it (`notPdf`), or `unreadable` when the PDF cannot be opened.
3. For each page, read the barcode (and, on the server, OCR the accession or requisition number when no barcode reads). The rules are `src/services/requisitions/requisitionRules.ts`, shared with the demonstration:
   - a page with a new barcode starts a requisition;
   - a page with no barcode (a continuation page) joins the requisition before it;
   - a separator sheet (the source's `separatorBarcode`, default `PATHSCRIBE-SEPARATOR`) ends the requisition and belongs to none;
   - pages before any barcode form a requisition with none.
4. Match each requisition's barcode to a case: the accession as read, then without a container suffix (`S26-4403-A` → `S26-4403`).
5. A match is linked (`RequisitionLink`: case id, accession, pointer, page range, barcode, source, time, `matchedBy: automatic`). No match goes to the Unmatched Requisitions queue (`UnmatchedRequisition`, reason `noMatch` or `noBarcode`).
6. Running again over the same file and pages adds nothing. A queued requisition whose barcode matches a case created since is linked on the next run.

The job runs as its own service identity with `requisition:ingestion:run`. In the demonstration, **Run ingestion now** on the Requisition Inbox does the same in the browser from `public/demo-requisitions/` (`demoRequisitionEngine.ts`); with an API server configured the browser offers no run and never reads a share.

## 2b. Serverless (CLAUDE.md rule 11)

Nothing here needs a long-running process in PathScribe's cloud:

- **Third-party document system** (`documentSystem`) and **sending system** (`api`): the scheduled function `requisition.ingest` polls the system's https address with the API server's own credentials, or the system posts to the stateless `recordIngestion` route. Each run does one batch and ends.
- **A folder on the hospital network** (`fileShare`): a cloud function cannot reach a `\\server\share` inside the hospital, so the folder is read by the **site agent** already installed on the hospital network for printers and shares (`SITE_AGENT_API.md` §8, file-share pickup). The agent watches the folder, reads each PDF's barcodes on the hospital network, groups the pages, and posts only the report (file reference, page ranges, barcodes) to `recordIngestion`. The PDF never leaves the hospital; opening one from a case asks the agent for a short-lived read link. **Planned:** the agent's `requisitions` pickup kind (today `PICKUP_IMPORT_KINDS` takes `orders` and `results`, and the agent refuses PDFs) and its read link.
- **The missing-requisition check** is the hourly scheduled function `requisition.missingSweep`.
- Configuration (sources, expected requisitions) is stateless data edited on REST routes; no screen starts, stops or restarts anything.

The demonstration stands in for all of this in the browser (Run ingestion now; the check when the inbox opens).

## 2a. Several performing facilities

Each source has a `facilityId` (a performing-lab facility) or `null` (every facility). Links, queued scans and runs carry their source's `facilityId`. Every check passes the facility as the authorization context (`AUTHORIZATION_API.md`, facility scope): `{ facilityId }`, or `{ allFacilities: true }` for an all-facility source, so a person assigned to some facilities is refused the others, and only someone who works for every facility can act on an all-facility source. Lists (`getSources`, `getInbox`) are filtered with `evaluate` per facility (nothing written per row). Moving a source to another facility needs the capability for both. Opening a case's requisition is checked with the case (`{ caseId }`), so the case's own facility decides. Matching is enterprise-wide: an accession names one case wherever it is performed.

## 3. Calls

Base `/api/requisitions/requisition`. Reads are GET, everything else POST (`HTTP_SERVICES_PATTERN.md` §7). A refusal is a fixed code: `NOT_PERMITTED`, `NOT_FOUND`, `INVALID`, `ALREADY_CLOSED`; no server text reaches the screen.

| Method | Route | Capability | Body | Answer |
|---|---|---|---|---|
| `getSources` | GET `/get-sources` | `requisition:inbox:review` or `config:requisition-ingestion:manage` | | `RequisitionSource[]` |
| `saveSource` | POST `/save-source` | `config:requisition-ingestion:manage` | `RequisitionSourceInput` (empty `id` adds one) | `RequisitionSource`; `INVALID` when a name, location or separator barcode is empty or the schedule is outside 1 to 1,440 minutes |
| `recordIngestion` | POST `/record-ingestion` | `requisition:ingestion:run` (the source's facility); `NOT_FOUND` for an unknown source | `IngestionReport` (`sourceId`, `files[]`: each read with its page groups, or rejected with its reason) | `IngestionRun` (files, matched, unmatched, rejected) |
| `getInbox` | GET `/get-inbox` | `requisition:inbox:review` | | `RequisitionInbox`: the open Unmatched queue (newest first), the last 20 links, the last 10 runs |
| `linksForCase` | POST `/links-for-case` | `case:requisition:view` | `{ caseId?, accession? }` | `RequisitionLink[]` |
| `reassociate` | POST `/reassociate` | `requisition:inbox:resolve` | `{ unmatchedId, accession }` | `RequisitionLink` (`matchedBy: manual`, `linkedBy`); `NOT_FOUND` for an unknown accession; `ALREADY_CLOSED` when the item was linked or discarded already |
| `discard` | POST `/discard` | `requisition:inbox:resolve` | `{ unmatchedId, reason }` (`notARequisition`, `duplicateScan`, `unreadable`, `other`) | `UnmatchedRequisition` (status `discarded`). The file itself is not touched. |
| `openDocument` | POST `/open-document` | `case:requisition:view` (a link) or `requisition:inbox:review` (an unmatched item) | `{ linkId }` or `{ unmatchedId }` | `{ url }`: a short-lived read link, with `#page=<first page>` |

Types: `src/services/requisitions/requisitionTypes.ts`. Contract: `IRequisitionService.ts`. Server version: `httpRequisitionService.ts`.

## 4. Audit (spec §3)

Every match, quarantine, resolution and view is written to the audit trail, literal English, with no file name (a scanned file's name can name the patient, as for case attachments) and no patient name:

| Event | When | Case |
|---|---|---|
| `Requisition Matched` | a requisition linked by the job (type `system`) | the accession |
| `Requisition Quarantined` | a requisition put in the Unmatched queue (type `system`) | none |
| `Requisition Re-associated` | linked by hand | the accession |
| `Requisition Discarded` | discarded, with the reason | none |
| `Requisition Viewed` | opened from the case or from the queue | the accession, for a linked one |
| `Requisition Source Saved` | a source added or changed | none |

A link typed into the queue's field is also flagged as a Manual Entry (`PATIENT_VERIFICATION.md`), like every station scan field.

## 5. Not built

- The server job, OCR, the API that a sending system posts scans to, and the site agent's requisition pickup and read link for a hospital folder (§2b).
- A printable separator sheet (print the barcode from any label tool; the value is in Configuration).
