# Case attachments and the storage adapter (Batch 742)

Pete's "PathScribe Case Image & File Attachments (Release 1)" and his decisions of Oct 30, 2026: a case's photos, files and links are listed in one Attachments window; ticked items are placed **inside a report section**; a PDF, JPG or PNG can be attached from the computer's own file picker. PathScribe still stores no file (`BLOB_STORAGE_API.md` §6): the bytes go to the hospital's own storage through a **storage adapter**, and PathScribe keeps the pointer the adapter hands back.

This is the contract for the India team's API server. The browser side is built (Batch 742); the endpoints, the adapter and the records table are **Planned**.

## 1. Decisions (Pete, Oct 30, 2026)

1. Images print inside the report section they are placed in (under the Gross Description, say), not appended at the end.
2. Files: PDF, JPG and PNG only. A Word file is saved as PDF first; there is no conversion in the browser.
3. Reference only: PathScribe keeps an object key (or a permanent URL), never the bytes. Uploads use per-tenant destinations in the customer's storage; reading uses a fresh read link each time. **Remove from case unlinks only**; the object stays in the customer's storage.
4. One Attachments window and a badge on the case ("Attachments (n)", or "Add Attachments" at none) for gross and intraoperative photos, uploaded files and, once the slide viewer exists, slide regions.
5. **The storage adapter pattern** (Pete): PathScribe is the orchestrator. It asks the infrastructure layer for a destination, sends the bytes there and saves the pointer. How a site stores the file is the adapter's business, configured per deployment, so PathScribe's code never changes for a new site:
   - **Site A, a cloud bucket or VNA:** the destination is a pre-signed PUT to the hospital's bucket (S3, Azure Blob, GCS).
   - **Site B, a network share:** the destination is the adapter's own one-time staging link; a background worker (or SFTP) moves the file to the share (`\\hospital-nas\pathology_uploads\...`).
   - **Site C, the interface engine:** the same staging link; the adapter hands the file to the interface engine (BridgeLink) to deposit in the hospital's repository.
   - **The return contract:** whatever the site, the adapter hands back a stable object key, or a permanent read URL, and nothing else.

## 2. The browser's three calls

The browser (`src/services/caseAttachments/httpAttachmentStorageService.ts`) does the same three steps for every site. Routes follow `HTTP_SERVICES_PATTERN.md` §7 (POST, no id or text in the path).

| Step | Route | Body | Reply |
|---|---|---|---|
| 1. Where do the bytes go? | `POST /api/case-attachments/attachment-storage/request-destination` | `{ caseId, facilityId, fileName, contentType, byteLength, sha256 }` | `UploadDestination`: `{ ticketId, mode: "direct" \| "staged", method: "PUT" \| "POST", uploadUrl, headers, expiresAt, maxBytes?, warnAtBytes? }` |
| 2. Send the bytes | `uploadUrl` from step 1, with `method` and `headers` from step 1 | the file's bytes | 2xx |
| 3. Confirm and get the pointer | `POST /api/case-attachments/attachment-storage/complete-upload` | `{ ticketId }` | `{ pointer: { kind: "objectKey", storageId, objectKey } \| { kind: "url", url }, sourceSystemId }` |
| Read (show or print) | `POST /api/case-attachments/attachment-storage/get-read-link` | `{ pointer, purpose: "view" \| "render" }` | `{ url, expiresAt }` |

- **Step 2 never carries a PathScribe token.** The destination is the hospital's bucket (a pre-signed link) or the adapter's staging link, which authorizes itself with a one-time token in the link. The bucket or staging host must allow the PathScribe origin in CORS for that method and those headers.
- **Errors** (the `error` code in a failed reply): `notConfigured` (the site has no attachment storage), `tooLarge` (over `maxBytes`), `refused` (type, checksum or malware scan), `expired` (the ticket or link ran out), `unavailable` (anything else). Step 2 maps HTTP 413 to `tooLarge`, 403 to `expired`, other refusals to `refused`.
- `warnAtBytes` lets a site change the size the screen warns at (Pete's 25 MB is the default); `maxBytes` is the hard limit.

## 3. What the adapter must do

1. **Check permission first:** step 1 needs `case:attachment:upload` for the case and facility (`AUTHORIZATION_API.md`); the read link needs case access.
2. **Pick the destination for the tenant and facility** from deployment configuration (never from the browser).
3. **Object keys hold no patient data**: `{tenant}/{yyyy}/{mm}/{random}`, as in `BLOB_STORAGE_API.md` §4. The file name travels in the body for the adapter's own record only.
4. **Verify before completing:** the bytes arrived, their SHA-256 matches `sha256`, the first bytes are a PDF, JPEG or PNG whatever the name says, and the size is within `maxBytes`.
5. **Malware scanning is the adapter's job** (at the bucket, the staging area or the worker). A file that fails is deleted from staging and step 3 answers `refused`. This replaces the "no malware scanning" line of `BLOB_STORAGE_API.md` §7, which assumed no uploads at all.
6. **Read links** are HTTPS, read-only, for one object, valid at most 15 minutes, never stored. `purpose: "render"` is used when the server draws the image into a report.
7. **Retention, legal hold and deletion are the customer's**, in their storage. Remove from case only unlinks; PathScribe never deletes the object.
8. **Tickets expire** (15 minutes is the demo's figure); bytes staged without a completed ticket are swept.

## 4. PathScribe's own records

PathScribe keeps two kinds of row, both pointers.

**The attachment** (`src/types/caseAttachments/CaseAttachment.ts`), one per uploaded file or typed link:

```sql
CREATE TABLE cases.CaseAttachment (
  AttachmentId    NVARCHAR(64)  PRIMARY KEY,   -- Pete's asset_id
  CaseId          NVARCHAR(64)  NOT NULL,      -- PathScribe's case key (an accession-based id, not a UUID)
  SourceType      NVARCHAR(20)  NOT NULL,      -- gross | intraop | slide_region | external_link (Pete's enum)
  Origin          NVARCHAR(10)  NOT NULL,      -- upload | link
  PointerKind     NVARCHAR(10)  NOT NULL,      -- objectKey | url
  StorageId       NVARCHAR(100) NULL,          -- with an object key
  ObjectKey       NVARCHAR(400) NULL,
  Url             NVARCHAR(2000) NULL,         -- a permanent https URL
  FileName        NVARCHAR(200) NULL,          -- often names the patient: PHI, never logged
  MimeType        NVARCHAR(40)  NOT NULL,      -- application/pdf | image/jpeg | image/png
  FileSizeBytes   BIGINT        NULL,
  Sha256          CHAR(64)      NULL,
  SourceSystemId  NVARCHAR(200) NOT NULL,      -- the storage id, or a link's host
  SpecimenId      NVARCHAR(64)  NULL,          -- the material it belongs to, when known
  BlockId         NVARCHAR(64)  NULL,
  Status          NVARCHAR(10)  NOT NULL,      -- linked | unlinked
  CreatedBy       NVARCHAR(100) NOT NULL,
  CreatedAt       DATETIME2(3)  NOT NULL,
  UnlinkedBy      NVARCHAR(100) NULL,
  UnlinkedAt      DATETIME2(3)  NULL
);
```

Gross and intraoperative photos are **not** copied here: they stay where they are (the `DigitalAsset` links on the specimen, block and intraoperative finding), and the window lists them from there.

**The placement** (`CaseReportImage` in `src/services/imageAssociation/caseReportImages.ts`, Batch 609, extended): what is in the report and where. Adds `SectionId`, `SectionLabel`, `Origin` (attachment id or case photo id) and `MimeType`. A placement with no section prints on its own page after the report (the cytology report, and records made before Batch 742).

## 5. Rules the server keeps

- **Signed reports:** a report pending release or finalized takes or loses a placement only while an amendment or addendum is in draft (`reportEditStateFor`, `services/caseAttachments/reportEditState.ts`). An attachment still placed in the report can't be removed from the case.
- **Limit:** 12 placements per report (`MAX_REPORT_IMAGES`), as since Batch 609.
- **Audit**, with no file name, caption or link path in the detail: `Case Attachment Uploaded` (type, size, storage, mode), `Case Attachment Linked` (host), `Case Attachment Unlinked`, `Report Image Linked` (how many, which section heading), `Report Image Unlinked`.

## 6. Printing (Pete's decision 1)

The report page sends `sectionImages` to the report renderer (`functions/main.py`; `src/services/imageAssociation/reportSectionImages.ts` builds it): for each placement with a section, the image's bytes and pixel size, or `unavailable`, or `document`. The renderer draws each image right under the section node with that id, at 300 DPI or better (never enlarged past it), at most the text width and 120 mm high, with its caption; prints the Image Unavailable notice in place of one that can't be fetched; names a document (its pages are added after the report). Anything placed at the end of the report text, or under a section the layout no longer has, prints under "Images" at the end of the text. The in-app preview shows the same.

With the API server, **the server fetches the bytes** (read links from the adapter; for typed links, only the tenant's allowed hosts, no private addresses, a size cap and a time-out, as in `BLOB_STORAGE_API.md` §6), not the browser. The production renderer (`REPORT_RENDERING_SERVICE.md`) must draw `sectionImages` the same way.

## 6a. Assist mode (Pete, Oct 30, 2026)

In Assist mode the primary LIS writes the report and PathScribe sends each synoptic workup back (`dispatchAssistSynopticResult.ts`). So on an Assist case:

- **Nothing is placed in a report.** The window keeps references only: attach, link, open, remove, and the case's own photos. No tick boxes, sections or Insert into Report (Batch 743). `insertIntoReport` refuses with `assistCase`; a placement made before that can still be taken out. Pete: leave sending images to the LIS out for now.
- **The LIS is the custodian (Pete's dev note, Planned).** PathScribe does not go looking for an Assist case's files. The primary LIS ingests, scans or photographs them, stores them in the hospital's repository and pushes the secure URLs through the interface engine; PathScribe receives the pointers and lists them in the window, for context, AI cross-referencing and synoptic work during the session. The design, on the existing LIS ingestion layer (`src/services/lisIngestion/`, `LIS_INGESTION_API.md`):
  - `NormalizedLisUpdate` gains `attachments?: { url, mimeType?, title?, kind?: 'gross' | 'intraop' | 'external_link', externalId?, specimenLabel? }[]`;
  - the HL7 v2 adapter reads them from OBX segments with value type RP (reference pointer), and the JSON webhook adapter from an `attachments` array; FHIR `DocumentReference` and `Media` map the same way when FHIR is phased in;
  - the staging queue de-duplicates them as it does any update; the Assist worker records each as a `CaseAttachment` with `origin: 'lis'` and the LIS as its `sourceSystemId`, keyed by the LIS's id so a resend updates rather than duplicates;
  - an attachment the LIS withdraws is unlinked, never deleted (the LIS keeps the file);
  - the window shows them as "From the LIS", with **Remove from case** not offered (the LIS owns them);
  - audit: "Case Attachment Received From LIS" with the count and the LIS's id, no titles or links.

## 7. Status

| Part | Status |
|---|---|
| Browser: the window, badge, file checks, three-step upload, placements in sections, signed-report rule | **Built (demo), Batch 742** |
| `functions/main.py` drawing images inside sections | **Built, Batch 742** (Python checks in `test_main.py`) |
| Demo storage | an in-memory stand-in for a "direct" site (`mockAttachmentStorageService.ts`): files last for the browser tab only |
| The adapter, the three endpoints, the records tables, server-side fetching at render | **Planned** (API server) |
| Slide regions from the slide viewer's "Add to report" | **Planned**, with the viewer |
| Cytology report drawing images inside its sections | **Not built**: the cytology report still prints them after its pages |
| Assist mode: references only, no placing in a report (§6a) | **Built (demo), Batch 743** |
| Assist mode: the LIS pushing attachment URLs through the interface engine (§6a) | **Planned** (Pete's dev note) |
| Sending images to the LIS with an Assist case's workups | **Left out** for now (Pete, Oct 30, 2026) |
| Conversion of Word files | **Not planned** for Release 1 (Pete) |
