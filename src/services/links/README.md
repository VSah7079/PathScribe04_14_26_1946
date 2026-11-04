# services/links

Batch 549 (PS-539). Pete's rule (Oct 13, 2026): PathScribe stores no images and no file attachments, only links to them in the hospital's own systems (`docs/architecture/BLOB_STORAGE_API.md` §6).

- `externalLink.ts`:
  - `isHttpsLink(value)`: an `https://` URL to a named host (with a dot, no trailing dot), with no user name or password in it and no spaces. `data:`, `http://`, `javascript:` and plain text are refused.
  - `linkFieldProblem(value)`: `null` for an empty field or a valid link, otherwise `'invalidLink'`.
- **Used by:**
  - the staff signature (`staff/staffFormChecks.ts`, since Batch 544; re-exported there);
  - the facility letterhead logo (`facilities/facilityFormChecks.ts`, `FacilityDictionary/FacilityEditorModal.tsx`);
  - the department logo (`Config/System/DepartmentsSection.tsx`);
  - the gross imaging vendor's address (`Config/System/GrossImagingVendorDictionarySection.tsx`).
- The on-screen message is `links.invalidHttpsLink`.
- **Test:** `externalLink.test.ts`.
