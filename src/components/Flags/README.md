# components/Flags/

Quality/administrative flag UI — the auto-created-flag banner and the
full flag manager modal.

## Files

- **`AutoCreatedBanner.tsx`** — Small warning banner when LIS-driven flags
  were auto-created, listing their codes. No issues.
- **`FlagManagerModal.tsx`** (722 lines) — Full flag assignment UI:
  target-level rows (Case/All Specimens/per-specimen) with applied flag
  chips, catalog search filtered by target level. **FIXED this pass:**
  stale header path comment (`src/components/FlagManagerModal.tsx`,
  missing the `Flags/` subfolder). **Worth knowing:** its own comment
  documents local `ApplyFlagPayload`/`DeleteFlagPayload` types as a
  stopgap for a "missing caseFlagsApi" — checked `IFlagService.ts`, no
  real equivalent exists there, so this isn't duplicating a real type,
  it's genuinely filling a gap. **Good example, not a bug:** uses real
  shared `pathscribe.css` classes (`ps-modal-dark`/`ps-modal-dark-header`/
  etc.) via `ReactDOM.createPortal` for its confirm-discard modal, instead
  of reinventing inline overlay styles — see the modal-consolidation note
  in `Common/README.md`, where this file is cited as evidence a working
  shared pattern already exists in the CSS system.

## Notes

- No other issues found.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
