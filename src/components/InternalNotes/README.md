# components/InternalNotes/

## Files

- **`InternalNotesDrawer.tsx`** — Slide-in drawer for internal case notes,
  explicitly documented as reusable across `FullReportPage`/
  `SynopticReportPage`. Uses the inline-style modal/drawer pattern —
  already logged as one of the ~14 instances in the modal-consolidation
  opportunity (see `Common/README.md`). No other issues. *(Since
  changed: its remaining `style` props pass only CSS custom properties,
  per the app-wide no-inline-CSS guard (Batch 367) — checked in the
  Batch 496 README audit.)*

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. The "Internal Note" type label is translated. The note-type selection colours moved from inline variables to modifier classes in `pathscribe.css`; each type's own colour stays a custom property.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.
