# File and blob storage: the `IBlobStore` contract (PS-539 phase 2c)

The readiness review (`DEPLOYMENT_READINESS_REVIEW.md` §3, row 21) found no server-side file storage: every PDF and upload is held in the browser today, and photos go to the lab's imaging system. This is the contract it asked for, for the India team's API server.

**Pete's rule (Oct 13, 2026): PathScribe stores no images and no file attachments; it keeps links to them.** Photos, scanned or referral PDFs, signatures and logos live in the hospital's own systems (the imaging system, the document system), and PathScribe records a link. The files PathScribe stores are only the ones it makes itself: report documents, signed report versions, held releases and exports.

It sits under two contracts already written:
- released report documents (`REPORT_DOCUMENT_STORE_API.md`): one immutable PDF per release;
- export files (`ASYNC_EXPORT_API.md`): working copies, deleted after 7 days.

Both use the store described here.

## 1. What is stored as a file, and where it is today

| What | Today | Server container (§3) |
|---|---|---|
| Released report documents | browser storage, `src/services/reportDocuments/mockReportDocumentService.ts` | `report-documents` |
| Signed report versions (the PDF saved at each sign-out) | `pdfBase64` in `src/types/reports/ReportVersionRecord.ts`, with the bytes' hash `pdfSha256`. *Batch 558:* with the API server, only a version signed in this browser carries `pdfBase64` (in memory); a version the server lists carries only the hash, and its PDF is read through the API (§11) | `report-versions` |
| Held release PDFs (the release delay) | `pdfBase64` in `src/types/reportRelease/HeldRelease.ts`, made when the report is held | `held` (mutable): the bytes wait there during the delay and are copied into `report-documents` when it ends; a recalled report's bytes are deleted, so a report never released leaves nothing under clinical retention |
| Print job PDFs with no stored document | `pdfBase64` in `src/types/printing/PrintJob.ts` | none: a print job names its report document (Batch 538); a one-off print (a preview) is streamed and never stored |
| Export files | built in the browser | `exports` |
| Staff signature images | `signatureUrl` (`src/services/users/IUserService.ts`): a link since Batch 544 (it was a file read into a data URL on Configuration → Staff) | **none: a link** (§6) |
| Gross and block-face photos | sent to the lab's imaging system; PathScribe keeps only its URL (`src/services/imageAssociation/mockImageUploadService.ts`, `ImageAssociation`) | **none: a link.** A lab without an imaging system can't capture photos in PathScribe (the camera says so); it links to wherever it keeps them |
| Images linked to a report (Batch 609) | the https link, type and caption (`src/services/imageAssociation/caseReportImages.ts`); fetched when the report PDF is made, drawn into it, never kept | **none: a link.** The PDF is the stored record, as for a letterhead logo |
| Referral results sent as PDF | a URL reference (`pdfAttachmentUrl`, `src/types/events/ReferralResultEventPayload.ts`) | **none: a link** |
| Facility letterhead logo | a URL (`headerLogoUrl`, `src/types/config/FacilityBranding.ts`) | **none: a link** |
| Organ-map figures (the map image inserted into a report) | the SVG, with a base64 PNG data URL (`pngDataUrl`), on the case, and copied with both hashes (`svgSha256`, `pngSha256`) into each report version (`src/services/organMapping/organMapFigures.ts`) | **kept, as PathScribe's own output.** PathScribe draws these maps from the report's answers, so they are not images someone attached and the rule allows them: the PNG stays with the report version that used it (`report-versions`), with its hash, so the map in a signed version can be checked |

Not stored either: whole-slide images (the image management system; PathScribe stores references only); enhancement-request screenshots and tumor-board calendar files, which are built in the browser and sent by email.

## 2. The interface

```csharp
public interface IBlobStore
{
    // Writes the bytes, checks the SHA-256 the caller computed, and records the blob (§4) in the caller's transaction.
    Task<BlobRef> PutAsync(BlobPut put, Stream content, CancellationToken ct = default);

    // Reads the bytes and checks them against the stored SHA-256; a mismatch throws BlobIntegrityException (no bytes returned).
    Task<Stream> OpenReadAsync(BlobId id, CancellationToken ct = default);

    // A short-lived, read-only link to one blob, issued after the caller's capability check (§5).
    Task<Uri> GetReadLinkAsync(BlobId id, TimeSpan lifetime, string downloadFileName, CancellationToken ct = default);

    // Deletes a blob whose retention has ended and that has no legal hold. Refuses otherwise.
    Task DeleteAsync(BlobId id, string reason, CancellationToken ct = default);

    Task SetLegalHoldAsync(BlobId id, bool hold, string reason, CancellationToken ct = default);
}

public readonly record struct BlobId(Guid Value);
public sealed record BlobPut(string Container, string ContentType, string Sha256, string TenantId, string? FacilityId,
                             string? CaseId, string RetentionClass, DbTransaction? Transaction, string CreatedBy);
public sealed record BlobRef(BlobId Id, string Container, string Sha256, long ByteLength, string ContentType, DateTimeOffset CreatedAt);
```

Implementations, chosen per deployment (decision D5):

| Deployment | Implementation | Immutability | Read links |
|---|---|---|---|
| Azure | Azure Blob Storage | **Version-level** immutability (blob versioning on): a time-based retention and a legal hold per blob, set after the record commits (§4) | User-delegation SAS (signed with Entra ID), HTTPS only |
| AWS | Amazon S3 | S3 Object Lock, per object (`PutObjectRetention`, `PutObjectLegalHold`), set after the record commits | Presigned URLs |
| Private cloud or on site | Any S3-compatible store with Object Lock (e.g. MinIO) | Object Lock, per object, as for S3 | Presigned URLs, or the API streams the file |

**Locks are per blob, not per container.** A container-level policy or default retention would lock bytes the moment they are written, before the record exists, and the same date would apply to every file, whatever its jurisdiction or legal hold. So containers have no default retention; each blob is locked on its own once its record has committed.

**Governance, not compliance, mode** (S3 and MinIO): compliance mode can never be shortened or removed, even by the account root, so a report released on the wrong patient could never be taken out. Governance mode, with the bypass permission granted to no person and only to a break-glass role used under the documented two-person procedure, keeps files safe from everyday deletion while leaving that door. Azure's equivalent is an unlocked version-level policy with the same control.

One contract test suite runs against every implementation, as for the message bus (§10).

## 3. Containers

Each container is per tenant, private (no public access), encrypted at rest, and in the tenant's hosting region (decision D5).

| Container | Immutable | Retention class | Who reads it, through the API |
|---|---|---|---|
| `report-documents` | **yes** (write once; no update, no delete before retention ends) | `clinical-report` | `report:case-report:print` for the case (`REPORT_DOCUMENT_STORE_API.md`) |
| `held` | no | until the delay ends or the report is recalled | the release job only |
| `report-versions` | **yes** | `clinical-report` | the report page's Version History, with the case's access check |
| `exports` | no | `export` (7 days, 1–30) | the requester only (`ASYNC_EXPORT_API.md`) |

## 4. The blob record

```sql
CREATE TABLE files.Blob (
  BlobId         UNIQUEIDENTIFIER PRIMARY KEY,
  Container      NVARCHAR(64)   NOT NULL,
  StorageKey     NVARCHAR(400)  NOT NULL,       -- {tenant}/{yyyy}/{mm}/{BlobId}: never a patient name or accession
  ContentType    NVARCHAR(100)  NOT NULL,
  ByteLength     BIGINT         NOT NULL,
  Sha256         CHAR(64)       NOT NULL,       -- lower-case hex over the bytes
  TenantId       NVARCHAR(64)   NOT NULL,
  FacilityId     NVARCHAR(64)   NULL,
  CaseId         NVARCHAR(64)   NULL,
  RetentionClass NVARCHAR(40)   NOT NULL,
  RetainUntil    DATETIME2(3)   NULL,           -- NULL: as long as the case record (§8)
  LegalHold      BIT            NOT NULL DEFAULT 0,
  CreatedBy      NVARCHAR(100)  NOT NULL,
  CreatedAt      DATETIME2(3)   NOT NULL DEFAULT SYSUTCDATETIME(),
  DeletedAt      DATETIME2(3)   NULL,
  DeletedReason  NVARCHAR(400)  NULL
);
CREATE INDEX IX_Blob_Case ON files.Blob (CaseId) WHERE CaseId IS NOT NULL;
CREATE INDEX IX_Blob_Expiry ON files.Blob (RetainUntil) WHERE DeletedAt IS NULL AND LegalHold = 0;
```

- **Order of writing:** the bytes first, unlocked, under a key no record names yet; then the blob record and the domain row that points to it (a report document, a report version), in one transaction; then, after that commits, the per-blob lock (retention date, and legal hold if the case has one). A recurring job (`MESSAGE_BUS_API.md`) deletes unlocked bytes with no record older than a day, so a failed transaction leaves nothing behind. This is what "written in the same transaction as the release" means in `REPORT_DOCUMENT_STORE_API.md`: the record and the release commit together; the bytes are in place before, and locked after.
- **No indefinite lock:** WORM storage needs a date. `RetainUntil` NULL ("as long as the case record") is stored in the lock as a finite date (the jurisdiction's period from now), extended by the retention job before it runs out.
- The storage key holds no patient data, so a storage log or a leaked link never names a patient.
- The table grants INSERT, SELECT, and UPDATE of `LegalHold`, `RetainUntil`, `DeletedAt` and `DeletedReason` only, each by its own job or endpoint. Nothing updates `Sha256` or `StorageKey`.

## 5. Reading

- **Through the API, never directly.** The browser asks the API for a file (`GET /api/files/{blobId}/link` or a domain endpoint such as `GET /api/report-documents/{id}`). The API checks the capability and access for that file's case and facility, then answers with a read link valid for at most 15 minutes, or streams the file.
- **The link** is read-only, for one blob, HTTPS only, and sets `Content-Disposition: attachment` with the file name (a cross-origin link ignores the `download` attribute).
- **Integrity:** every server-side read checks the SHA-256. A mismatch returns 409 `DOCUMENT_INTEGRITY` (the same code as `REPORT_DOCUMENT_STORE_API.md`), sends nothing, and alerts the Admin and Lab Director.
- **Audit:** opening a stored file (report document, version) is audited as `DOCUMENT_RENDERED` with the file's id and no patient data in `detail`.

## 6. Images and attachments: links only

Pete, Oct 13, 2026: like all images and file attachments, photos are not stored by PathScribe, even for a lab without an imaging system; PathScribe stores links.

- **What a link is:** an `https://` URL to a named host (no user name or password in it) into a system the hospital controls (its imaging system, document management system or intranet), with the source system's id and, where the screen asks for one, a fallback URL (`ImageAssociation`, `resolveImageUrlWithFallback.ts`). For the staff signature a `data:` URL, an `http://` URL or a file is refused today (`isHttpsLink`, `src/services/staff/staffFormChecks.ts`). Since Batch 549 the same check (`isHttpsLink`, now shared in `src/services/links/externalLink.ts`) applies to the facility and department letterhead logo (`headerLogoUrl`) and the gross imaging vendor's base URL: an empty field is fine, anything else must be an https link.
- **Who can open it:** the hospital's system decides, with its own sign-in. PathScribe never fetches the content on the server to show it, cache it or copy it. The one exception is the report renderer, which fetches a letterhead logo (and, once reports carry signatures, a signature image) at render time to draw it into the report PDF it makes; the PDF is then the stored record. When the server fetches a link:
  - only from the tenant's allowed hospital domains, never a private, loopback or link-local address, with no redirects followed, a size cap and a short time-out;
  - the image's bytes and SHA-256 go into the stored PDF, so a signature or logo changed at the source later doesn't change a released report;
  - if a signature can't be fetched, the report isn't rendered without it: rendering fails and says why.
- **Photos:** the camera capture (`src/components/GrossingHardware/CameraCaptureControl.tsx`) sends the photo to the lab's imaging system (through `IImageUploadService.upload`; with the API server, the API passes the bytes on to the vendor and keeps nothing) and keeps the URL it gets back; with no imaging system configured it says so and stores nothing (`mockImageUploadService.ts`).
- **Signatures:** Configuration → Staff takes a link to the person's signature image (Batch 544), not a file. A link that isn't `https://` is refused (`src/services/staff/staffFormChecks.ts`). A signature saved earlier as an image opens with the field empty and a note that a link is needed, so the record can still be saved (`signatureLinkOnOpen`).
- **Audit (Planned, with the API server):** opening a linked image or attachment from a PathScribe screen is audited with the link's source system and no patient data in `detail`.

## 7. No file uploads

PathScribe keeps no uploaded file (Pete's rule above), so there is no upload endpoint for files to keep, no staging area and no malware scanning. (A camera photo passes through to the imaging system, §6.) Report documents, report versions, held releases and exports are written by the server only. Data imports that read a file in the browser (CSV dictionaries, the action registry) read it, check it and save the rows; the file itself is never kept.

## 8. Retention, legal hold and disposal

- **Retention classes:**
  - `clinical-report`: kept at least as long as the case record. The period is set per jurisdiction in configuration, never in code.
  - `export`: 7 days (1–30).
  - `held`: until the delay ends or the report is recalled.
- **Immutable containers** enforce the retention period in storage too (immutability policy or Object Lock), so not even an administrator with storage access can delete or overwrite a file early.
- **Legal hold:** set and cleared per case by staff with a capability for it (added with the server, phase 2e). A held file is never deleted, whatever its retention.
- **Disposal:** a recurring job deletes files whose retention has ended and which have no hold. It writes `DeletedAt` and an audit entry, and keeps the record with its hash. This follows the same pattern as the specimen disposal report (`src/services/retentionPolicy/`).

## 9. Operations

- **Replication:** geo-redundant within the tenant's region or jurisdiction (e.g. zone-redundant plus a paired region inside the same country where the market requires it, section 10 of the review).
- **Backups:** the mutable containers, `exports` and `held`, are working copies with no versioning (`ASYNC_EXPORT_API.md` §6). The immutable containers are their own protection against deletion (their versioning is what version-level immutability needs).
- **Keys:** encryption at rest with provider-managed keys by default, or customer-managed keys where a hospital asks for them.
- **Monitoring:** storage used per container and tenant, integrity failures (alert), orphan sweeps, and disposal counts.

## 10. Contract tests (every implementation)

1. A put with a wrong SHA-256 is refused, and nothing is recorded.
2. A read of a changed blob throws the integrity error and returns no bytes.
3. A locked blob can't be deleted before `RetainUntil`, or while on legal hold, and its original bytes stay readable. A second put to the same key is refused (`If-None-Match: *`; on S3 and MinIO an overwrite would otherwise only add a version).
4. A read link works for its lifetime only, for that blob only, and is read-only.
5. Only the server writes: there is no write link for any browser, and an image or attachment field accepts an `https://` link only (no `data:` URL, no file).
6. Bytes with no record (unlocked) are deleted by the orphan sweep after a day; bytes with a record are never touched.
7. Disposal deletes only expired, unheld blobs, and records each deletion.
8. A recalled held release leaves nothing in `held` and nothing in `report-documents`.

## 11. Status

| Part | Status |
|---|---|
| This contract | **Written, Batch 543** |
| `IBlobStore` implementations, the files API, the disposal and orphan jobs | **Planned** (India team, phase 2e) |
| Images and attachments as links only (Pete, Oct 13) | **Decided**; staff signatures switched to links in **Batch 544** |
| The https check on the letterhead logo (facility and department) and the gross imaging vendor's address | **Done, Batch 549** |
| The browser using the files API when the API server is configured | **Browser side built for report documents, Batch 556** (`src/services/reportDocuments/httpReportDocumentService.ts`), **and for report versions, Batch 558** (`src/services/reports/httpReportVersionService.ts`; both below). The endpoints are Planned (phase 2e). Held releases need no browser endpoint (below). Exports went through the API in Batch 550. With an API server configured, the browser keeps no patient data in its storage (PS-485). |

**The browser and the files API (Batch 556).** Every reader of a released document (View as sent, retries, fallbacks, print, the ORU, the cytology case report) goes through one store:
- It reads a document released in this browser from this browser's memory (until the release moves to the server, phase 2e).
- Any other document it reads through `GET /api/report-documents/{id}`, checking its SHA-256 again.
- The list is `GET /api/cases/{caseId}/report-documents` plus this browser's.

When the server's list can't be read, the screen says the list may be incomplete. The cytology case report then refuses to print rather than print something else.

**Report versions through the API (Batch 558).** Every reader of a signed version's PDF (Version History, the result message, the release after the hold period) goes through one reader, `src/services/reports/reportVersionPdf.ts`:
- A version signed in this browser carries its PDF (in memory with the API server, until sign-out moves to the server in phase 2e). It is checked against the version's `pdfSha256` before it is used.
- A version the server lists carries only `pdfSha256`. Its PDF is read through `GET /api/cases/{caseId}/report-versions/{versionNumber}/pdf?purpose=view|send`, and the bytes' hash must match both the `X-Content-SHA256` header and the version's `pdfSha256`.
- The list is `GET /api/cases/{caseId}/report-versions` (records only: a `pdfBase64` in the list is ignored) plus this browser's, each version once. When the server's list can't be read, Version History says the list may be incomplete.

Endpoint rules for the server (the same as report documents, `REPORT_DOCUMENT_STORE_API.md` §2):
- Both endpoints need `report:case-report:print` for the case.
- The PDF endpoint recomputes the hash before answering; a mismatch is 409 `DOCUMENT_INTEGRITY`, with nothing sent.
- `purpose=view` is a person opening it, audited as `DOCUMENT_RENDERED` (document `report-version`); `purpose=send` is a channel sending it, recorded with that channel's audit.
- Where the API is on another host, the response sends `Access-Control-Expose-Headers: X-Content-SHA256`.
- `pdfSha256` is the SHA-256 of the PDF's bytes. *Batch 558 correction:* the browser's own store hashed the base64 text before; versions saved that way are still accepted by the reader, and new ones hash the bytes.
- The server numbers versions. Until then, a version signed in this browser is numbered after the server's versions as well as this browser's, and an amendment of an instance the server holds is sent as a correction. If the server's list can't be read at that moment, the version is still saved (a sign-out is never lost), numbered from this browser's alone.

A PDF that fails its check is refused: Version History says so, and a result message or release is held with the reason. An older version is never sent in its place.

*Batch 559 (the two items left open in Batch 558):*
- A result message's workup version counts the workup's signed versions. When the server's list of versions can't all be read, that count could be too low, so the message is held ("the workup version is not known") and sent when retried.
- A result sent with a signed version's PDF carries the PDF's hash in the message (`reportPdfSha256`) and records it on the queue entry (`pdfSha256`).

**Held releases (Batch 558 check).** The PDF held during the release delay (`HeldRelease.pdfBase64`) is read only by the release job when the delay ends (`releaseReport.ts`). Once `VITE_SERVER_JOBS` lists `release.dueSweep`, that job runs on the server and the browser never reads a held PDF, so there is no browser endpoint for held releases. The server's job reads them from the `held` container with its service identity.
