# MolecularOrderQueuePage

The molecular order queue screen.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 669 (mol-3)

The demo outcome line is translated: `simulatedResultMessage` (services/molecularOrders/orderQueueView.ts) picks the key, so `already-applied`, `case-not-found` and the other processor codes read through `molecularOrderQueue.outcome.*`. Pressing Positive again says the reflex genotyping order already exists instead of adding another.
