# components/Config/Actions/

Admin editor for the voice/keyboard-shortcut system action registry.

**Pattern:** Single substantial component over a real service
(`services/actionRegistry/`), no reorganization needed.

## Files

- **`ActionsTab.tsx`** — Real, substantial (347 lines) action registry
  editor. Live keypress capture for recording shortcuts, conflict
  detection, and shortcut suggestions. Wired to
  `mockActionRegistryService`/`IActionRegistryService` (confirmed real in
  the services/ review — "Voice/shortcut action catalog"). Correctly
  named, no issues found.

## Notes

- No issues. Folder is small, single-purpose, and correctly scoped.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
