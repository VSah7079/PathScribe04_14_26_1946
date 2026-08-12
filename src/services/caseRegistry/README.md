# services/caseRegistry/

Real accession-number generation and masking — `{PREFIX}{YEAR:2}-{SEQ:4}`-style patterns per organisation, with an optional per-site prefix map and per-specimen-category independent sequence series (Surgical/Non-GYN Cytology/Consultation drawing from separate, non-colliding counters at the same organisation).

**Pattern:** same real stub/active-implementation relationship as `services/cases/`'s `FirestoreCaseService.ts` / `mockCaseService.ts` — `caseRegistryService.ts` (Firestore) is a real, ready implementation of `ICaseRegistryService`, but is not yet the one the running app actually calls; `mockCaseRegistryService.ts` is the active one today, backed by `localStorage` via `services/mockStorage.ts`.

## Files

- **`ICaseRegistryService.ts`** — The shared interface: `getConfig`/`saveConfig` (an organisation's `CaseMaskConfig` — mask pattern, prefix, sequence digit width, annual-reset behavior), `allocateNextCaseNumber` (consumes a real sequence number), `previewNextCaseNumber` (same real resolution, without consuming one — for the admin config screen's live preview).
- **`caseRegistryService.ts`** — Stub only, pending backend cutover; real Firestore transaction logic (`allocateNextCaseNumber` runs inside `runTransaction`, so two concurrent accessions at the same organisation can never receive the same real sequence number).
- **`mockCaseRegistryService.ts`** — The real, active implementation. Seeded with a real `CaseMaskConfig` per real organisation in `organisationService.ts`. Category-driven series: an organisation's base config owns the mask *pattern* (year format, digit width, annual-reset behavior); a `CaseNumberCategoryOverride` (from `SpecimenCategory.accessionPrefix`/`numberSeries`) can override just the *prefix* and draw from its own independent counter, without duplicating the org's structural settings.
- **`mockCaseRegistryService.test.ts`** — Real, direct tests: sequential allocation, independent fallback sequences for two different unconfigured organisations (never a shared, colliding counter), site-prefix resolution, annual reset behavior (and non-reset when `resetSequenceAnnually` is false), category-override series isolation, preview-vs-allocate consistency.

## Real fix, high-priority: facility-timezone-aware accession years

Per Pete's direct clinical-informatics guidance: an accession number is a permanent, legally-binding clinical identifier tied to physical tissue and chain of custody. Its `{YEAR}` component — and whether the annual sequence counter resets for a new year — must be derived from the real facility's own configured timezone (`SystemConfig.facilityTimezone`), never the browser/device generating it. A case accessioned at 11:30pm Dec 31 Tucson time must get a real 2025 accession number even if a reviewing device elsewhere already reads Jan 1 — and the annual sequence reset must fire on the real, facility-local New Year, not whichever New Year the generating device happens to have already crossed.

Both `allocateNextCaseNumber` and `previewNextCaseNumber` take a **required** `timezone` parameter (not optional/defaulted) in both `caseRegistryService.ts` and `mockCaseRegistryService.ts` — a required parameter, not a default, so no real caller can silently fall back to the wrong facility. See `utils/facilityTime.ts` for the real, underlying timezone-conversion logic (`getFacilityDateParts`), and `pages/AccessionPage/AccessionPage.tsx` for the one real caller, which passes `useSystemConfig()`'s real, configured `config.facilityTimezone`.

## Known, real, honest limits

- **Site-level sequence fragmentation is a real, supported feature (`sitePrefixMap`), but not used by every real organisation** — MFT deliberately runs one unified, Trust-wide sequence across all three of its real sites (MRI/WYT/NMGH) rather than forking into per-site counters. `originSiteId` is still captured at accessioning and still drives Mode A hardware routing and cassette/slide label sub-headers; it just doesn't fork the master accession sequence for that specific organisation. This is a real, per-organisation config choice, not a capability gap.
- **No {SPECIMEN_TYPE} token** — deliberately dropped, per the case-vs-specimen-level numbering decision (see `types/config/CaseMaskConfig.ts`'s own header comment). This folder generates one accession number per *case*, not per specimen.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
