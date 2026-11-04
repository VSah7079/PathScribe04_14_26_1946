# utils/a11y

Batch 524 (PS-491, WCAG 2.1.1 Keyboard, 4.1.2 Name, Role, Value).

`pressable.ts`:

- **`pressable(handler, { role })`**: spread onto a clickable element that isn't a `<button>` (a card, a row, a tile). It adds `role="button"` (or the role you pass; `null` for none, used for table rows and for rows that hold buttons of their own, since a button can't contain another control), a tab stop, and Enter / Space doing what the click does. Keys pressed inside a nested field or button are left to that element. With no handler it adds nothing.
- **`switchable(checked, onToggle, label, disabled?)`**: an on/off control drawn as a track and thumb. `role="switch"`, `aria-checked`, a name (`aria-label`) and, when disabled, `aria-disabled` with no action.

- **`clickableContainer(handler)`** (Batch 566): for a row or card that holds buttons of its own, which can't itself be a button (axe: nested-interactive). It adds only the click: no role, no tab stop, no keys. The same action must be on a real `<button>` inside (the row's title, say), which is what keyboard and screen-reader users use; the guard checks there is one. With no handler it adds nothing.

Tests: `pressable.test.ts` (Batch 566).

A new control should be a real `<button>` / `<input>` where it can. The guard `src/services/accessibility/a11y.guard.test.ts` fails on a clickable element without one of these.

## Batch 567

- `:where(.ps-row-open-btn)` (`pathscribe.css`): the button inside a `clickableContainer` row. It clears the browser's button look at zero specificity, so the element's own class sets its size, weight and colour; a focus ring shows on keyboard focus.

## Batch 569

- `focusAfterRemoval.ts` (new): `focusTargetAfterRemoval(ids, removedId)`, where keyboard focus goes when the focused item leaves a list: the next item, the one before when it was last, none when the list empties (WCAG 2.4.3). Used by the inbox. Tests: `focusAfterRemoval.test.ts`.

## Batch 570

- `focusAfterRemoval.ts`: `focusTargetAfterRemoval` skips items already gone (two quick deletes); `isNonPointerClick` tells a keyboard or screen-reader click from a mouse click (`detail` 0, or Firefox's `mozInputSource` 0 for a screen reader's click).
