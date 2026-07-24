# components/Common/

Shared, reusable UI primitives used across multiple pages.

## Files

- **`ConfirmModal.tsx`** — **MOVED HERE** (was
  `components/UI/ConfirmModal.tsx`, a whole folder that existed for this
  one file). Reusable dark confirmation dialog, explicitly meant to
  replace `window.confirm()` throughout the app. Genuinely used — the
  sole consumer, `Sidebar.tsx`, wires it to the real "Remove Synoptic
  Report" delete confirmation on the main case reporting page. `UI/` is
  now deleted (was already empty of anything else). See Notes for why
  this file matters beyond its own folder.
- **`InlineCommentThread.tsx`** — **MOVED HERE** (was
  `components/PatientReportPage/Comments/InlineCommentThread.tsx` — the
  page that folder was named for was deleted earlier this session as
  dead code, leaving this genuinely shared component sitting alone in a
  folder named after something that no longer existed). Per-field comment
  thread (add/resolve, audit-logged), used by
  `Config/Templates/TemplateRenderer.tsx`. No issues.
- **`SuffixSelect.tsx`** — Name suffix (Jr./Sr./II/III/IV/V) dropdown with
  free-text "Other…" fallback. Deliberately CSS-system-agnostic (takes
  className props rather than hardcoding classes) since it's reused across
  two different class systems (`ps-input-dark` on AccessionPage,
  `ps-conf-input` on Config screens). No issues.
- **`LookupModal.tsx`** — Shared full-screen search-and-select modal shell
  (overlay, header, close-on-Escape/overlay-click), used across
  SearchPage's SNOMED/ICD-10/ICD-O/Specimen/Synoptic/Flags/Pathologist/
  Attending lookups. No issues.
- **`Dropdown.tsx`** — A minimal, genuinely custom single-select
  dropdown, built because a native `<select>`'s closed box can be
  restyled via CSS (see `.ps-conf-select`) but its *open* option list is
  OS-rendered and largely ignores CSS regardless of browser — no CSS-only
  fix exists once a native select is actually open. First real usage:
  `Config/Staff/StaffTab.tsx`'s "add a role" dropdown, which visibly
  looked inconsistent with the app's dark theme once opened. Deliberately
  simple (single-select, fires `onSelect` immediately, no search/keyboard
  nav) — extend if a future use case genuinely needs more, don't
  over-build ahead of need. ~36 other native `<select>` elements remain
  across `Config/System/` alone; this is the proof-of-concept, not a full
  sweep — logged as its own `PRIORITY_FIXES.md` item.
- **`LogoutWarningModal.tsx`** — **MOVED HERE**, consolidating what were
  TWO separate implementations of the same "unsaved changes, log out
  anyway?" dialog: this one (was `pages/WorklistPage/LogoutWarningModal.tsx`)
  and a second one at `pages/SynopticReportPage/modals/LogoutWarningModal.tsx`
  with a genuinely different prop interface (`show`/`onCancel`/`onConfirm`
  vs. this one's `isOpen`/`onClose`/`onLogout`) and its own uncorrected
  `zIndex: 25000` bug. Consolidated specifically because
  `SynopticReportPage.tsx` is a critical, high-traffic file where two
  same-named components with different behavior is a real support-analyst
  confusion risk during an on-call situation, not just a style
  inconsistency — raised directly by Pete. All 3 real consumers
  (`WorklistPage.tsx`, `Home.tsx`, `SynopticReportPage.tsx`) now import
  this one component.

## Deleted this pass

- **`Button/Button.test.tsx`** — Confirmed empty scaffold (`export {};`,
  no actual test content), with no corresponding `Button.tsx` component
  anywhere in this folder or elsewhere. Never had real content — not a
  case of a test outliving its component, just an unfilled template file
  that was never cleaned up. `Common/Button/` is now an empty folder,
  worth deleting outright.

## Notes

- **RESOLVED:** `ConfirmModal.tsx` used to live in its own single-file
  folder, `components/UI/` — about as generic a name as possible,
  containing exactly one file. Moved here, next to `LookupModal.tsx` (the
  same category of thing — a shared modal shell), which is where it
  always should have been. `UI/` is deleted.
- **RESOLVED — PRIORITY_FIXES.md #8, modal-overlay shell consolidation,
  now fully closed across all 14 originally-identified files.** The
  pattern flagged here (`Common/LookupModal.tsx`/`Common/ConfirmModal.tsx`
  barely adopted despite being real, working shared solutions) turned
  into a complete sweep — see the top-level `components/README.md`'s
  Fixes Applied section for the full file list and what was found along
  the way, including two further real duplicate components
  (`LogoutWarningModal.tsx` above, and `Home.tsx`'s own separate copies
  of the Quick Links / Safety modals, eliminated by reuse rather than
  reformatted a third time).
- Methodology note, still relevant for future folders: "right file in
  the right place" includes checking for patterns reimplemented in many
  places that should be consolidated into a shared folder — not just
  whether an individual file's own location matches its dependency
  direction (the `specimenTypes.ts` class of check).

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
