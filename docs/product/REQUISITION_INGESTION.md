# Requisition ingestion and the Requisition Inbox (Batch 762)

**Source:** "PathScribe Technical Specification: Automated Batch Requisition & Document Ingestion", version 1.0 (Pete Nimmo, Nov 2, 2026). Pete's demo decision (Nov 2, 2026): real PDFs, read in the browser. It is part of the accessioning demo video.

**Status:** Built (Demo), browser side. The server's scheduled job is Planned (`docs/architecture/REQUISITION_INGESTION_API.md`).

## Four voices

- **Practitioner:** Paper requisitions are scanned in batches by the department scanner. PathScribe reads the accession barcode on each page and puts the scan on the right case for you: on the report screen, **📄 Requisition** shows it. A scan whose barcode matches no case (or whose barcode can't be read) waits in **Accession → 📥 Requisition Inbox**: view it, then scan or type the accession to link it, or discard it with a reason. A scan that comes in before its case is accessioned is linked on the next run, once the case exists.
- **System administrator:** Configuration → System → Integrations → **Requisition ingestion**: one source per scanner (**＋ Add source**), each belonging to a **Performing facility** (or All facilities), the folder the scanner saves to (or the system that sends scans to the API), how often to look (1 to 1,440 minutes), and the barcode on the separator sheet put between requisitions in one batch scan. Permissions: `requisition:ingestion:run`, `requisition:inbox:review`, `requisition:inbox:resolve` (the roles that open Accession), `case:requisition:view` (the roles with case access), `config:requisition-ingestion:manage` (Admin). Every match, quarantine, link, discard and view is on the audit log.
- **Marketing:** Scan a stack of requisitions once and PathScribe files every page on the right case by its barcode, with nothing copied out of the hospital's own document store and nothing lost: anything it can't place waits in one queue until someone places it.
- **FormedrixAI/partners:** Built and tested in the browser. In the demonstration the "drop folder" is `public/demo-requisitions/` (three fictional files: two batch PDFs and a TIFF that is refused), read when someone presses **Run ingestion now**; the page images are taken out of each PDF and their Code 128 barcodes read with ZXing. The server job, OCR of a printed number without a barcode, and the API a sending system posts to are not built. There is no printable separator sheet yet. Nothing is stored but the link: when the file is moved or deleted where it lives, the case's requisition can no longer be opened.

## What each requirement became

| Spec | Built |
|---|---|
| §1 Reference-only | A case keeps a link to the file where it lives (the same pointer the case attachments use), the page range, the barcode, the time and the source. PathScribe stores no copy; viewing reads the file from where it is and keeps nothing. |
| §2.1 Sources: drop folder or API; PDF only | A source is one location set by its address (Pete, Nov 2, 2026: "a folder on their network, or a 3rd party system … as defined in configuration. There could be multiple URLs"): a folder on the hospital network, a third-party document system read at its https address, or a system that sends scans to the API. As many sources as needed, each read on its own schedule. A file that is not a PDF is refused and named in the run's summary ("Refused: not a PDF"). |
| §2.1 Barcode / OCR | Barcodes (Code 128 and Code 39) on every page. OCR: Planned, on the server. |
| §2.2 Multi-page grouping | A page with a new barcode starts a requisition; a page with no barcode joins the one before; a separator sheet ends it and belongs to none. |
| §2.3 Matched record | Case, accession, storage pointer, pages, barcode, ingestion time, source. Shown on the report screen header (**📄 Requisition**). |
| §2.3 Unmatched Requisitions Quarantine Queue | Accession → **📥 Requisition Inbox**: view, link by scanning or typing the accession, or discard with a reason (Not a requisition, Duplicate scan, Unreadable scan, Other). |
| §3 Access control | Five capabilities, checked in the service (`requisitionService.ts`), each for the facility concerned: the source's facility for running, reviewing, resolving and configuring; the case's facility for opening a case's requisition. |
| Several performing facilities (Pete, Nov 2, 2026) | Each source belongs to a performing facility, or to all facilities. A queued scan carries its source's facility; a person assigned to one laboratory sees, runs and resolves only that laboratory's scanners and scans, and the inbox can be narrowed to one facility. An all-facility source needs someone who works for every facility. Matching is enterprise-wide (an accession names one case). |
| §3 Audit | Requisition Matched, Quarantined, Re-associated, Discarded, Viewed, Source Saved: no file name, no patient name. |
| §3 Encryption at rest | The hospital's storage holds the file; the link records are in the SQL Server database (TDE). |

## Expected requisitions, scans with no case, and the quarantine queue (Pete, Nov 2, 2026)

Decisions (Pete, Nov 2): a scanned requisition is expected for every case except an electronic HIS/LIS order (its order message is the request on record), configurable per facility; a case with none is flagged with a badge, a list and a Missing Requisition case deficiency; it becomes missing a set number of hours after accession (24 by default), never blocking the work.

| Need | Built |
|---|---|
| A case with no requisition | `requisitionService.sweepMissing` (hourly on the server, `requisition.missingSweep`): a case expected to have one with none linked after the grace period is listed under **Cases waiting for a requisition** on the inbox, shows **⚠ Requisition missing** on the report header, and gets a **Missing Requisition** case deficiency (raised by System). Linking its scan closes both (resolution **Requisition Received or Not Required**); so does **No paper requisition** with a reason. How the order came in: `requisitionOriginOf` (no intake type: the laboratory system's feed; an imported order at Accession: electronic, now recorded as `order.externalOrderId`; typed with no order; outside; downtime; lockbox). |
| HIS orders with no paper | Expected requisitions, Configuration: tick which origins need a scan; Electronic HIS/LIS order is unticked by default. |
| A requisition with no case | A scan still in the Unmatched queue after the limit (24 h by default) is marked **No case yet: check for a specimen not received, lost or not accessioned**, moved to the top, and audited (Requisition Without Case). |
| Quarantine review | **View** the pages, link by scanning or typing the accession, or search by patient name or MRN (**Cases found**, within the user's own case access), or **New case from this scan**: Accession opens with the scan attached and links it on submit. |
| Audit | Requisition Quarantined, Re-associated (typed, by search, or the case created from it), Discarded, Viewed, Matched, Missing, Received, Waived, Without Case, Source Saved, Expectation Saved. |

## Serverless

Each source is read by a scheduled function (`requisition.ingest`), the missing check is hourly (`requisition.missingSweep`), and configuration is stateless data. A third-party document system is polled at its https address; a sending system posts to the API; a folder on the hospital network is read by the site agent on the hospital network, which sends only the reference, pages and barcodes (Planned: the agent's requisition pickup, `SITE_AGENT_API.md` §8). Details: `REQUISITION_INGESTION_API.md` §2b.

## For the demo

1. Accession → **📥 Requisition Inbox** → **Run ingestion now**. Before S26-0001 is accessioned: S26-4403 (page 4 of REQ-BATCH-0001) is linked; S26-0001 (pages 1 to 2, a requisition and its continuation page), S26-9999 (no such case) and page 3 of REQ-BATCH-0002 (a smudged label) wait in the queue; REQ-SCAN-0003.tif is refused.
2. **View** shows the scanned pages beside the queue.
3. Accession S26-0001 (the first case made on the Accession screen), come back and **Run ingestion now** again: S26-0001 is linked.
4. Type S26-4403 into the smudged page's field and press Enter: linked by hand (and flagged as a Manual Entry). Discard S26-9999 as a Duplicate scan.
5. Open S26-4403's report: **📄 Requisitions (2)** in the header.

## Files

`services/requisitions/` (types, rules, the service, mock, http, instance, the page images of a PDF, the demonstration engine and runner), `hooks/useRequisitionInbox.ts`, `useRequisitionPreview.ts`, `useCaseRequisitions.ts`, `useRequisitionSources.ts`, `components/Requisitions/` (RequisitionPreview, CaseRequisitionLink, RequisitionInboxLink), `pages/RequisitionInboxPage/`, `components/Config/System/RequisitionIngestionSection.tsx`, `authorization/requisitionCapabilities.ts`, `public/demo-requisitions/`.
