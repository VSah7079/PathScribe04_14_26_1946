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
- **`Dropdown.tsx`** — **NEW.** A minimal, genuinely custom single-select
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
- **FOUND, not fixed — real consolidation opportunity.** The modal-overlay
  shell pattern (`Common/LookupModal.tsx` already does this) is
  independently reimplemented in at least 14 other files instead of being
  reused: `Config/Protocols/SynopticEditor.tsx`, `Config/Protocols/protocolShared.tsx`,
  `Config/Templates/TemplateRenderer.tsx`, `AppShell/AppShell.tsx`,
  `InternalNotes/InternalNotesDrawer.tsx`, `EnhancementRequest/EnhancementRequestModal.tsx`,
  `Editor/PathScribeEditor.tsx`, `pages/AuditLogPage.tsx`,
  `pages/WorklistPage/ResourcesModal.tsx`,
  `pages/WorklistPage/LogoutWarningModal.tsx`, `pages/ConfigurationPage.tsx`,
  `pages/SynopticReportPage/SynopticReportPage.tsx`, and more. Each
  hand-rolls the same backdrop/blur/close-on-click-outside shell. Raised
  by Pete: `Common/` being this thin, in a codebase this size, was itself
  the signal that shared patterns exist but aren't consolidated here.
  **Cheaper fix path than originally scoped:** `Flags/FlagManagerModal.tsx`
  shows the codebase already has a *working* shared solution —
  `pathscribe.css`'s `ps-modal-dark`/`ps-modal-dark-header`/etc. classes,
  used with `ReactDOM.createPortal`. Most of the 14 offending files could
  likely just adopt those existing classes rather than needing a brand
  new shared component built from scratch. **Stronger still:**
  `components/UI/ConfirmModal.tsx` is an already-built, purpose-stated
  ("replaces `window.confirm()` throughout the app") reusable component
  using that same CSS pattern — with exactly **1 real consumer in the
  entire app**. The opportunity here isn't "build something," it's "use
  what's already built and barely adopted." **Logged for later, not
  attempted this pass** — still a scoped project of its own (~14 call
  sites), not a quick fix folded into a folder review.
- Methodology note for future folders: "right file in the right place"
  now explicitly includes checking for exactly this — patterns
  reimplemented in many places that should be consolidated into a shared
  folder — not just whether an individual file's own location matches its
  dependency direction (the `specimenTypes.ts` class of check). Applying
  this standard going forward for the rest of `components/`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
