# pages/Synoptic/UI/

Small, generic UI primitives shared across the Synoptic page family — not page-specific enough to live in `SynopticReportPage/components/`.

## Files

- **`SaveToast.tsx`** — small, generic save-confirmation toast (message + visible props).

**Batch 349 (PS-100):** `SaveToast.tsx` shows the message's kind (✓, ℹ, ⚠, ✕; it used to show a green check for failures too), is an alert for warnings and errors, and closes on a click or its × (`saveToast.close`).


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`SaveToast.tsx`: a message marked `containsPhi` is tagged `data-phi` (see `../useSynopticToast.ts`).

---
*See [pages/README.md](../../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).
