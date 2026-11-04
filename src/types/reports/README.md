# types/reports/

The real report lifecycle beyond the synoptic itself — amendment/addendum, version history, informal review, and LIS-side external correction tracking.

## Files

- **`AmendmentRecord.ts`** — the real Amendment/Addendum record. Replaced a fully decorative earlier feature (a modal that looked functional but never persisted anything at all).
- **`ReportVersionRecord.ts`** — the real, PDF-based report-version schema (mode, trigger, `createdBy`, `pdfBase64`, `generationError`, `synopticAnswersSnapshot`) — a real snapshot taken at every sign-out/amendment release, already relied on elsewhere in the app.
- **`FieldLineage.ts`** — field-level audit trail (DR-2), scoped to fields that were actually part of a delta at reseed time, not every field on the synoptic.
- **`InformalReviewRequest.ts`** — real, tracked informal-review requests, deliberately separated from the Delegation workflow, with their own Worklist tile.
- **`LisAmendmentNotice.ts`** — real, tracked record of an external correction made directly in the LIS, outside PathScribe (the "Disconnected Modification" risk) — surfaces so the signing pathologist knows their own structured synoptic data may now be stale.
- **`PatientEncounterSnapshot.ts`** — real, immutable snapshot of the resolved patient/encounter context at the moment a report version is created, so a later merge, demographic correction, or discharge never silently rewrites history (Patient/Encounter Management Subsystem, Phase 5).

## Batch 366 (PS-68)

`ReportVersionRecord.ts` is the one release record; the unused `types/case/ReportSnapshot.ts` was removed. Its header now carries two points from that design for the API server:
- store the PDF by reference, not inline;
- keep a SHA-256 of its bytes, checked on retrieval.

## Batch 461

`ReportVersionRecord.organMapFigures?: OrganMapFigureVersion[]` (each with `svgSha256` / `pngSha256`) and `pdfSha256?`. The header note on where hashes are taken is partly superseded: the version now records these hashes itself.

---
*See [types/README.md](../README.md) for how this folder fits the whole types/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master types/README.md if this folder's overall PURPOSE changes.*

## Batch 558 (PS-539 phase 2d: report versions through the API)

- Batch 558: `ReportVersionRecord.pdfSha256` is the hash of the PDF's bytes (it was the base64 text's); `pdfBase64` is absent on a version the API server lists.
