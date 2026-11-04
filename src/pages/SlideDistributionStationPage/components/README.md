**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

# SlideDistributionStationPage/components

Panels of the slide distribution station (`DestinationControlPanel`, `QueuePanel`, and others).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).
