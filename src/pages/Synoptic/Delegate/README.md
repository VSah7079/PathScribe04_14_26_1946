# pages/Synoptic/Delegate/

Case delegation UI.

## Files

- **`DelegateModal.tsx`** — drag-and-drop staff assignment onto delegation-type lanes (built on `@dnd-kit`: `DndContext`, `useDraggable`/`useDroppable`, `DragOverlay`).

## Batch 353

**`DelegateModal.tsx`:**
- It sends a `DelegationRequest` to `delegationService.delegate()`. The service decides between assigning the chosen synoptic and delegating the case (`planDelegation`).
- It gets delegation types through `delegationTypeService`. It is off the mock-import baseline.
- Inline styles converted: the type zone's selected and drag-over states are classes coloured from `--ps-hue`, and the drag offset is `--drag-transform`.

## Batch 381 (PS-359)

`DelegateModal`:
- **Confirm checks `delegationMissing`:** type, recipient, and the synoptic report when handing one over are locked. The note is required when the type requires it or the organisation switched on "Note on every delegation", and the note field shows in either case.
- **Permission:** the button is a `CapabilityButton` for `case:delegation:create`, and a refusal from the service is shown.
- **Voice:** "confirm delegation" (`DELEGATE_CONFIRM`) now works; it was seeded but nothing listened.
- **Still inline:** building the staff and pool lists and filtering them. Not moved this batch.
- **No listeners yet:** `DELEGATE_PEER_REVIEW`, `DELEGATE_FORMAL_CONSULT` and `DELEGATE_FULL_TRANSFER` don't name any of the seeded delegation types (REASSIGN, POOL, SECOND_OPINION, …), so they're still unwired.

---
*See [pages/README.md](../../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 567 (WCAG 2.1 AA, 4.1.2)

- `DelegateModal.tsx`: a delegation type's zone can hold a button (clear the recipient), so it is no longer a button. Clicking it still picks the type; the type's name is the button (`aria-pressed`). The clear button has a name.
