**Batch 743:** `reportEditState.ts`: an Assist case (`reportingMode: 'assist'`) gets `lisOwnsReport`: the LIS writes its report, so nothing is placed in one; the window keeps references only.

# services/caseAttachments/

Batch 742 (Pete, "PathScribe Case Image & File Attachments (Release 1)" and his decisions of Oct 30, 2026). A case's attached files and links, and what the Attachments window lists. PathScribe keeps pointers only; the bytes of an attached file go to the hospital's own storage through the **storage adapter**. Contract: `docs/architecture/CASE_ATTACHMENTS_API.md`.

- `IAttachmentStorageService.ts`: the adapter contract: `requestDestination` → `transfer` → `completeUpload` (a stable object key or permanent URL back), and `getReadLink` (a fresh, short-lived link to show or print). Same three steps whether the site is a cloud bucket, a network share or the interface engine.
- `mockAttachmentStorageService.ts`: the demo's stand-in (a "direct" site); keeps bytes in this tab's memory only, under keys that name no patient.
- `httpAttachmentStorageService.ts`: the API server's version; the bytes go straight to the destination, never with a PathScribe token (`transferToDestination`).
- `attachmentStorageServiceInstance.ts`: `chooseService('attachmentStorage', …)`.
- `attachmentFiles.ts`: PDF, JPG and PNG only, read from the first bytes (a Word file is asked to be saved as PDF), the 25 MB warning, SHA-256.
- `caseAttachments.ts`: `attachExternalFile` (`case:attachment:upload`), `addAttachmentLink` (`case:attachment:link`), `unlinkAttachment` (`case:attachment:unlink`; unlinks only, refused while placed in the report). Audited with no file name.
- `attachmentCatalog.ts`: the window's rows in four groups (gross, intraop, slide, external), read from the case's own photos (never copied) and the attachments; the badge count; the sections offered and the one pre-selected; what the preview prints where.
- `reportEditState.ts`: a signed report changes only with an amendment or addendum in draft.

Placing in the report is `../imageAssociation/caseReportImages.ts` (`insertIntoReport`, `takeOutOfReport`).

---
*When this folder's contents change meaningfully, update THIS file.*
