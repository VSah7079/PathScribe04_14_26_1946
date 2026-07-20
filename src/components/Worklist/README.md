# components/Worklist/

The case worklist table and its pool-claim workflow.

## Files

- **`WorklistTable.tsx`** (1573 lines, one of the largest single
  components in the app) — The core case list: sorting, filtering,
  responsive card/table switching, divider rows, virtualization. Cleanly
  self-organized into clear internal sections (Types/Constants/Color
  Palettes/Date Helpers/Sorting/Status Styles/Sub-components/main
  component). Own comment documents a real, already-fixed bug worth
  knowing about: `formatDate()` used to be a bespoke local function
  hardcoded to MM/DD/YYYY regardless of jurisdiction — every date in the
  worklist rendered US-format even for UK clients. Fixed by switching to
  the real jurisdiction-aware `utils/formatDate.ts`, which already existed
  fully built but had zero callers anywhere in the app before this. No
  local modal-overlay duplication (checked, per the newly-broadened
  review standard) and no open TODO/FIXME markers. Not read line-by-line
  at this size beyond the sections above; no other issues surfaced.
- **`PoolClaimModal.tsx`** — Accept/Pass workflow when a pathologist
  clicks a pool case, case status-locked to `'claimed'` while open. Real,
  clean, wired to `mockCaseService`. No issues.

## Notes

- No issues found. Good example of a large file that stays maintainable
  through clear internal section organization rather than being split
  into many smaller files — a reasonable choice given how interdependent
  the sort/filter/responsive-layout logic is.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
