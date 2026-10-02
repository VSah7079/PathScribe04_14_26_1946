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

## Batch 429: view-only sections, equipment log for the bench

The Action Registry tab is view only without `config:actions:manage`; the category buttons stay usable.

## Batch 430: personal settings per person; view-only fields

Search and filter fields here are marked `data-config-nav`, so they keep working when the section is shown view only.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
