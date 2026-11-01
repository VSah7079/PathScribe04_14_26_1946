# utils/touch/

Batch 735 (Station Touch Specification v1; `docs/product/STATION_TOUCH.md`). Pure rules for the station screens on a tablet:

- `touchLayout.ts`: Auto / Always on / Always off, stored per computer (`utils/workstationSettings.ts`); on when Auto and the main pointer is coarse.
- `scanFieldFocus.ts`: when the station scan field takes focus back (only when nothing else has it, no window open, no text selected), and its input mode (none while scanning).
- `keyboardVisibility.ts`: with the keyboard up, whether to bring the field and its Save button into view, or the field alone (then the Save dock shows); which fields raise the keyboard; finding a field's Save button; the visible part of the page's scroll area.
- `tapTitle.ts`: which tooltip a tap shows (information elements only; buttons and fields do their own job).

---
*See [utils/README.md](../README.md) for how this folder fits the whole utils/ layer.*
