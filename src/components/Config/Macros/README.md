# components/Config/Macros/

Admin macro (text-expansion) editor.

**Pattern:** Thin tab wrapper (`index.tsx`) over the real panel
(`MacroPanel.tsx`).

## Files

- **`MacroPanel.tsx`** — Real macro editor wired to `macroService`. Filters
  to `status === 'Active'` macros for the editable list — correct, matches
  macro lifecycle used elsewhere. No issues.
- **`index.tsx`** — `MacrosTab`, 10-line wrapper. **See Notes — hardcoded
  font list.**

## Notes

- **MINOR DRIFT RISK:** `index.tsx` hardcodes `approvedFonts` as a literal
  array (`['Arial', 'Times New Roman', 'Courier New', 'Roboto']`) instead
  of reading `services/fonts/` (the real font dictionary, editable via
  `Config/System/FontsSection.tsx`). If an admin edits the font dictionary,
  this list silently won't reflect it. Small, real fix — pull from
  `fontService` instead of the literal — not done in this pass since it's
  a behavior change, not a mechanical rename.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
