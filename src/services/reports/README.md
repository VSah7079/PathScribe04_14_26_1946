# services/reports/

The amendment/versioning system — Pete's actively-developed current work as of July 2026. Three tightly-coupled interfaces correctly bundled together (not a templates/-style bundling mistake).

**Pattern:** Standard interface/mock pattern (no firestore stubs yet — genuinely new work, not a gap).

## Files

- **`IAmendmentService.ts`** — Amendment/addendum draft lifecycle — open-drafts-per-pathologist worklist query, exit-gate rule (an open draft can't be cleared by review, only committed). **Real addition:** `getAll()` — previously this interface had no way to query amendments across all cases at all (`getByCaseId` requires already knowing the case; `getOpenDraftsForPathologist` is scoped to one pathologist's open drafts). Added for `components/Contribution/QualityTab.tsx`'s real "Recently Amended" list, replacing what was previously hardcoded mock data there.
- **`ILisAmendmentNoticeService.ts`** — Inbound 'Disconnected Modification' LIS notices requiring pathologist action.
- **`IReportVersionService.ts`** — Version snapshot creation per case. **Phase 5 addition (Patient/Encounter Management Subsystem):** every real `create()` call now also captures a real, immutable `PatientEncounterSnapshot` (see `types/reports/PatientEncounterSnapshot.ts`) — the resolved patientId/encounterId and their real demographic/encounter state at the EXACT moment of sign-out or amendment release. Distinct from `pdfBase64`: the PDF freezes the rendered, visual content, but this is a real, structured, separately-queryable record — directly tested to prove it stays exactly what it was even after a later, real demographic correction to the live patient record (`mockReportVersionService.test.ts`'s own immutability test). Fully defensive: a genuinely failed or absent lookup (case not found, lookup throws) never blocks or fails the real version creation itself — a signed-out report must never be held up by a secondary, ancillary lookup. Wired into `mockReportVersionService.create()` itself, not the three separate call sites in `SynopticReportPage.tsx` — so it can't be forgotten at one of them.

## Notes

- **Real, honest scope boundary, closed**: the snapshot is now surfaced in the UI too — see `pages/SynopticReportPage/modals/VersionHistoryModal.tsx`, opened via a new header chip (`HeaderBar.tsx`'s `onOpenVersionHistory`), matching the established `DeficiencyHistoryModal` pattern. Also closes a second, related gap found in the same pass: `pdfBase64` had been generated and stored via `reportVersionService.create()` from three real call sites for a while, but nothing anywhere ever let a user actually view a historical signed PDF — this modal does, reusing the same base64→blob→`window.open` pattern the live print pipeline already uses.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*