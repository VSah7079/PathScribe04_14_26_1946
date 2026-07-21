# components/Flags/

Quality/administrative flag UI — the auto-created-flag banner and the
full flag manager modal.

## Files

- **`AutoCreatedBanner.tsx`** — Small warning banner when LIS-driven flags
  were auto-created, listing their codes. No issues.
- **`FlagManagerModal.tsx`** — Full flag assignment UI: target-level rows
  (Case/All Specimens/per-specimen) with applied flag chips, catalog
  search filtered by target level.

  **REBUILT July 2026 — two real bugs found, architecture restored to
  this file's own originally-documented design.** The file's own header
  comment always said `FOOTER — Cancel (reverts all changes) | Save
  (commits + closes)`, but the implementation had drifted into
  persisting every click immediately (with a 5-second "undo toast"
  patched on top), despite that header. That drift caused:

  1. **False dirty-warning on close with zero edits.** `openFlagManager`
     re-fetches the case fresh and filters flags (`flagDefinitionId &&
     !deletedAt`) — that filter could legitimately differ from what was
     already loaded even with no user interaction, and the page's
     content-diff dirty-check would (correctly, given what it saw) flag
     it as changed.
  2. **The "Discard changes?" prompt never actually discarded
     anything.** Flags persisted the instant "+Apply" was clicked
     (`addFlagLocally()` + immediate `onApplyFlags()` in the same click
     handler) — clicking "Discard changes" only cleared local UI state
     and closed the modal; it never called `onRemoveFlag()` or reversed
     the already-committed write. A pathologist applying a flag by
     mistake and clicking Discard would find the flag still applied.

  **Fix:** nothing touches the real backend until Save is clicked. All
  edits happen on a local draft (`localCase`, cloned from the `caseData`
  prop at open); `handleSave` diffs the draft against the original
  snapshot and calls `onApplyFlags`/`onRemoveFlag` only for what actually
  changed, once, in one pass. Cancel/Discard is now genuinely accurate —
  nothing was ever written, so there's truly nothing to lose. The
  `undoStack`/5-second-timer machinery is gone entirely; `FlagChip`'s
  existing per-row Undo (clears `deletedAt` on the same draft instance —
  this part was already correct) is the safety net for removals, per-row
  rather than a blocking dialog on the whole modal.

  New prop: `onDirtyChange?: (dirty: boolean) => void` — reports whether
  the local draft currently differs from what was loaded, so the parent
  page can be aware a real unsaved edit is sitting in an open modal (see
  `pages/SynopticReportPage/`'s wiring — separate README, if one exists
  for `pages/`).

  **Still true, unchanged:** uses real shared `pathscribe.css` classes
  (`ps-modal-dark`/`ps-modal-dark-header`/etc.) via `ReactDOM.createPortal`
  for its dialogs, rather than reinventing inline overlay styles — see
  `Common/README.md`'s modal-consolidation note, where this file is still
  good evidence a working shared CSS pattern already exists.

  **Consistency note:** this rebuild brings Flags in line with
  `CaseTeamModal.tsx`'s existing correct pattern (also converted to
  draft-then-save in the same pass) — both now share one model: edit a
  local draft freely, commit once on Save, nothing real happens on
  Cancel.

## Notes

- Both real bugs above were found via a specific, reproducible user
  report (dirty-flag warning appearing after opening/closing Flags with
  no edits) and traced to root cause before fixing — not inferred from
  code review alone.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
