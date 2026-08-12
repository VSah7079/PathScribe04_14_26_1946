# components/Config/Search/

Search bar for the Configuration page itself (find the right settings tab).

**Pattern:** Single component, deliberately narrow v1 scope stated in its
own header.

## Files

- **`ConfigSearchBar.tsx`** — Scores and matches against
  `CONFIG_SEARCH_INDEX` (label/synonyms/description) from
  `constants/configSearchIndex.ts` (outside this zip, not reviewed here),
  navigates to the matched tab on selection. Own header explicitly states
  v1 scope is "find the right tab," not deep-linking to a specific field
  within it. No issues within what's visible.

## Notes

- `constants/configSearchIndex.ts` wasn't in this review pass
  (`src/constants/` isn't part of the components/ or services/ zips) — if
  a future pass covers `src/constants/`, confirm this index stays in sync
  with actual Config tabs.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
