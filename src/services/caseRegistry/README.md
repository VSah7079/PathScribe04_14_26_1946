# services/caseRegistry/

Real accession-number generation and masking. Each **CaseMask** is a complete, self-contained mask (prefix, pattern such as `{PREFIX}{YEAR:2}-{SEQ:4}`, digit width, annual-reset flag and its own sequence counter) defined at exactly one scope point: a **Department**, a **performing-lab Facility**, or the **Enterprise** (a Facility with `isEnterprise: true`). Nothing is merged between levels: for a given case, the most specific scope that has a mask defined is used whole. If none has one, the default `{PREFIX}{YEAR:2}-{SEQ:4}` scheme with prefix `O` is used, so an unconfigured case never blocks accessioning. Admins manage masks in Configuration › System › Case Mask Configuration (`components/Config/System/CaseMaskConfigSection.tsx`).

This replaced the earlier one-record-per-organisation `CaseMaskConfig` model (with `sitePrefixMap`, `siteIndependentSequence`, department overrides and `{SITE}`/`{CAT}`/`{DEPT}` tokens merged at allocation time). Those fields and tokens no longer exist; supported tokens are `{PREFIX}`, `{YEAR:4}`, `{YEAR:2}` and `{SEQ:N}` (`types/config/CaseMask.ts`).

**Pattern:** same stub/active-implementation relationship as `services/cases/`'s `FirestoreCaseService.ts` / `mockCaseService.ts` — `caseMaskService.ts` (Firestore) is a stub of `ICaseMaskService` pending backend cutover; `mockCaseMaskService.ts` is the active one today, backed by `localStorage` via `services/mockStorage.ts` and exported from `services/index.ts` as `caseMaskService`.

## Files

- **`ICaseMaskService.ts`** — The shared interface: `getMask`/`getAllMasks`/`saveMask`/`deleteMask` (one `CaseMask` per scope point), `allocateNextCaseNumber(candidates, timezone)` (consumes a sequence number from the first candidate that has a mask), `previewNextCaseNumber(candidates, timezone)` (same resolution, without consuming one — for the admin screen's live preview).
- **`resolveCaseMaskScopeCandidates.ts`** — Pure function. Given a case's Department and performing-lab Facility, returns the ordered scope points to try: department, then facility, then its Enterprise (a single hop via `parentId`; never the same Facility twice). The caller (`pages/AccessionPage/AccessionPage.tsx`) passes the result to the service.
- **`renderCaseMask.ts`** — Pure token substitution, shared by both services and the admin screen's draft preview.
- **`caseMaskService.ts`** — Stub only, pending backend cutover; Firestore layout `/caseMasks/{scopeType}::{scopeId}`, with `allocateNextCaseNumber` inside `runTransaction` so two concurrent accessions can never receive the same sequence number.
- **`mockCaseMaskService.ts`** — The active implementation. Seeded with three department masks carried forward from the old Department fields: Surgical Tissue `S`, Fluid Cytology `NG`, Histology-Only Consultation `CS`. Writes are wrapped by `guardConfigWrites` (see Batch 428 below).
- **`mockCaseMaskService.test.ts`**, **`resolveCaseMaskScopeCandidates.test.ts`** — Tests: seed data, default fallback, most-specific-wins and fall-through, sequential allocation, preview never consumes a number, annual reset, `deleteMask` falling through; and candidate ordering for every facility/enterprise shape.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the folder now holds the per-scope CaseMask services (`ICaseMaskService`, `mockCaseMaskService`, `caseMaskService`, `resolveCaseMaskScopeCandidates`, `renderCaseMask`); the old `CaseRegistryService` files, `CaseMaskConfig` type, site-prefix map and `{CAT}`/`{DEPT}` tokens described here before no longer exist.*

## Real fix, high-priority: facility-timezone-aware accession years

Per Pete's direct clinical-informatics guidance: an accession number is a permanent, legally-binding clinical identifier tied to physical tissue and chain of custody. Its `{YEAR}` component — and whether the annual sequence counter resets for a new year — must be derived from the real facility's own configured timezone (`SystemConfig.facilityTimezone`), never the browser/device generating it. A case accessioned at 11:30pm Dec 31 Tucson time must get a real 2025 accession number even if a reviewing device elsewhere already reads Jan 1 — and the annual sequence reset must fire on the real, facility-local New Year, not whichever New Year the generating device happens to have already crossed.

Both `allocateNextCaseNumber` and `previewNextCaseNumber` take a **required** `timezone` parameter (not optional/defaulted) in both `caseMaskService.ts` and `mockCaseMaskService.ts` — a required parameter, not a default, so no real caller can silently fall back to the wrong facility. See `utils/facilityTime.ts` for the real, underlying timezone-conversion logic (`getFacilityDateParts`), and `pages/AccessionPage/AccessionPage.tsx` for the one real caller, which passes `useSystemConfig()`'s real, configured `config.facilityTimezone`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): file names updated to `caseMaskService.ts` / `mockCaseMaskService.ts`.*

## Known, real, honest limits

- **No per-site counter inside one mask.** A site that needs its own prefix or its own sequence gets its own CaseMask at the `facility` scope (performing labs only — a purely submitting facility never numbers cases). There is no longer a `sitePrefixMap` or `siteIndependentSequence` setting. `originSiteId` is still captured at accessioning and still drives Mode A hardware routing and cassette/slide label sub-headers.
- **No {SPECIMEN_TYPE} token** — deliberately dropped, per the case-vs-specimen-level numbering decision. This folder generates one accession number per *case*, not per specimen.

*Corrected in the Batch 496 README audit (Oct 9, 2026): removed `sitePrefixMap`/`siteIndependentSequence` and the `types/config/CaseMaskConfig.ts` reference, which no longer exist; per-site numbering is now a facility-scope CaseMask.*

## Batch 428: Configuration permissions

- `mockCaseMaskService`: `saveMask`, `deleteMask` need `config:case-masks:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
