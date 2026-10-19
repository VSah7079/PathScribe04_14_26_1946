# components/Config/Actions/

Admin editor for the voice/keyboard-shortcut system action registry.

**Pattern:** Single substantial component over a real service
(`services/actionRegistry/`), no reorganization needed.

## Files

- **`ActionsTab.tsx`** — Real, substantial (~410 lines; updated in the Batch 496 README audit) action registry
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

## Batch 437

The shortcut editor reports unsaved changes (a recorded shortcut is set by key presses, which the page can't see) (PS-128). The registry CSV export is audited (PS-282).

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 543

CSV exports neutralize formula cells (finding F8, `utils/csv.ts`); the disposal report export is audited (F9).

**Batch 614:** the shortcut recorder uses `shortcutFromPress` (Mac Option and AltGr rules shared with the hotkey matcher), and an always-on command shows its "Alt+J, then X" route under its key.
