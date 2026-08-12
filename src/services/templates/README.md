# services/templates/

Synoptic template LIBRARY MANAGEMENT ONLY, post-July-2026 split — seeds the CAP/RCPath-derived generic JSON templates into editorStore.

**Pattern:** Single real file.

## Files

- **`templateService.ts`** — Core template seeding/management logic.

## Notes

- The AI-suggestion sub-system that used to live here moved to services/templateSuggestions/ — see that folder's README.
- src/templates/mockDcisTemplate.ts (a DIFFERENT, top-level, non-services/ folder) still needs relocating here or into Config/Templates/ — flagged in PRIORITY_FIXES.md, not yet done.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*