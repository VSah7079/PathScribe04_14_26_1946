# pages/AccessionPage/

Orchestration Stage 0 entry point — Stage 0 Requirements §6.1. Captures
patient/case info and specimen list, generates the case ID, evaluates
Grossing Template assignment per specimen, and creates the Case.

## Files

- **`AccessionPage.tsx`** (1,745 lines) — the page itself. Extensively
  self-documented inline (SPECIMEN MODEL, ID generation scheme,
  skeleton-scope notes are all explained in the file's own header and
  section comments) — that documentation wasn't duplicated here.
  Genuinely solid: good error handling throughout (`try`/`catch`/`toast`
  on every async submit path, not silent failures), a real 4-dimension
  access-control-aware case-ID generation scheme with an honestly
  documented limitation (temporary scan-and-increment, not yet wired to
  the real Case Registry — see the file's own "ID generation" comment
  for why), and a self-flagged, deliberately-not-fixed stale-closure
  limitation in the voice-command effect (see its own
  `eslint-disable-next-line` comment).

  **Fixed this review:** 4 unnecessary `as any` casts, verified
  non-load-bearing by removing them and running `npx tsc --noEmit -p .`
  project-wide (zero new errors) — see `DEAD_CODE_TRACKING.md` for the
  specifics of each. A 5th `as any` (a native `<select>`'s `onChange`)
  was narrowed to `as 'M' | 'F' | 'U'` rather than removed, since some
  assertion is genuinely needed there.

  **Correction to this entry:** previously flagged here (and in
  `PRIORITY_FIXES.md` item #19) as "found, not fixed" — using
  `window.confirm()` directly for the unsaved-import-replace gate
  instead of the shared `ConfirmModal`. That was fixed in a later
  session than the one that wrote this entry; the code's own comment
  at the fix site confirms it ("Real fix: was window.confirm() —
  replaced with the shared..."). This README simply never got updated
  to match — corrected now, found while doing an unrelated README pass
  and actually checking the current code rather than trusting what was
  already written here.

  **Real bugs found and fixed in a later session** (`PRIORITY_FIXES.md`
  items #43–45):
  - The Specimens tab label showed a misleading count — the form seeds
    one empty placeholder specimen row, and the label read "Specimens
    (1)" from page load, before any real data existed. Now counts only
    specimens with an actual description entered.
  - The Case-Level Deficiency modal was genuinely broken — its trigger
    button lived on the Case & Patient tab, but the modal itself was
    accidentally written into the Specimens tab's JSX, so clicking it
    did nothing visible at all. Moved to the same tab-independent
    location `CaseCommentModal` already correctly uses.
  - `ReportDeficiencyModal` (below) now takes a `context: 'case' |
    'specimen'` prop and filters which deficiency types are selectable
    accordingly — a type like "Missing Requisition" only makes sense
    case-wide, "Container Damaged" only makes sense per-specimen; both
    used to show up in both contexts.
  - The page had zero connection to the app's shared unsaved-changes
    system (`DirtyStateContext`) — filling in real patient/specimen
    data and navigating away lost everything with no warning at all.
    Wired up fully: reactive dirty-state tracking (reusing the page's
    own existing `hasUnsavedProgress()` check), a `beforeunload`
    handler for browser refresh/tab-close, and — a real gap found only
    by testing live, not obvious from reading the code — a genuinely
    missing confirmation dialog. The shared `DirtyStateContext`
    correctly blocks navigation when dirty, but renders no UI of its
    own anywhere; every page using it has to supply its own dialog
    reacting to `pendingPath`/`confirmNavigate`/`cancelNavigate`, or
    the user just gets silently stuck. Added one, reusing the same
    `ConfirmModal` component already used for the import-replace gate.

  **Facility + Location fields (later session).** The "Submitting
  Client" dropdown was renamed to "Submitting Facility" — a real
  consistency fix, not just cosmetic: internal variable names
  (`clientId`/`clients`/`selectedClient`) were deliberately left
  unchanged (out of scope for this pass — see
  `components/ClientDictionary/README.md`'s own note on the same
  decision), so if you're reading the code rather than the rendered
  page, the naming won't match what a user sees. Right next to it, per
  direct confirmation ("add the Client and Location as fields to be
  seen in the accession page"): a new, facility-scoped **Location**
  dropdown (`services/locations/` — see that folder's own README),
  letting a tech record which ward/room/bed a manually-accessioned
  specimen came from, independent of whether any HL7 message is
  involved at all. Optional; repopulates and resets whenever the
  selected facility changes, so a location never silently carries over
  from a different facility. Sets the new `Case.order.locationId` +
  `locationDisplay` (`types/case/Case.ts`), mirroring the existing
  `clientId`/`clientName` pair exactly.

- **`IntraopMergePromptModal.tsx`** — Closes the loop from the original
  Intraop spec: "when the formal order finally arrives from the LIS,
  PathScribe should look for a match." A newly-accessioned case is that
  moment. Non-blocking — declining loses nothing, the entry stays in the
  Intraop Queue exactly as if this prompt didn't exist. No structural
  issues. **Fixed this review:** 2 inline `style={{ marginTop }}`
  overrides replaced with new `.ps-intraop-note-group` and
  `.ps-intraop-merge-intro--footer` classes, added next to the rest of
  the `.ps-intraop-*` family in `pathscribe.css`.

- **`ReportDeficiencyModal.tsx`** — Manual deficiency reporting, distinct
  from the auto-detected order-import dictionary mismatch. Raised, not
  raised-and-resolved — actual resolution happens later from the
  dedicated Deficiencies work queue (`pages/DeficienciesPage.tsx`),
  independent of this case's own lifecycle. Clean — no inline styles, no
  dead code, correctly reuses `ps-conf-*`/`ps-ms-*` shared classes.
  **Updated in a later session:** now takes a `context: 'case' |
  'specimen'` prop (see `AccessionPage.tsx`'s entry above) and filters
  its `deficiencyTypes` dropdown to only what's actually applicable to
  that context, always keeping the currently-selected type visible even
  if it wouldn't otherwise match — an admin can reclassify a type's
  level after the fact, and an existing record's own edit dropdown
  shouldn't lose its own selection because of that.

## Notes

All three files in this folder were fully reviewed and clean of inline
styles as of the original pass; confirmed still true after the later
session's additions above (verified via `grep -n "style="` across the
whole folder, zero matches).

**`AccessionPage.tsx`, added for Phase B of the "Interface Exception &
Case-Binding Module," per direct confirmation**: a real, deliberately
de-emphasized checkbox — "This is a temporary/downtime placeholder
identity" — right after the Patient ID field. Reuses the existing,
real `.ps-accession-checkbox-row` class (found and confirmed already
in use elsewhere in this same file) rather than inventing new CSS;
checking it reveals a real reason-code dropdown
(`types/patients/BreakGlassReasonCode.ts`'s standard taxonomy). Sets
`MasterPatientRecord.isDowntimeRecord`/`downtimeReasonCode` at the
moment of creation via `resolveOrCreatePatient()` — the flag a real
downtime record needs before `services/patients/`'s
`breakGlassRebind()` will ever act on it. Verified still zero inline
styles after this addition (re-checked, not just carried forward from
the earlier claim above).
