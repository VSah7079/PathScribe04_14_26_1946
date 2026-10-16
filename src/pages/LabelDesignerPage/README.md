# pages/LabelDesignerPage/

- **`LabelDesignerPage.tsx`** — the real, working drag-and-drop label
  designer. See `services/labelDesigner/README.md` for the full
  architectural account (why this is a new, parallel data model rather
  than a reuse of `components/TemplateBuilder/`'s own report-oriented
  node system; the real Enterprise/facility hierarchy and per-group
  lockdown policy).

**Real, direct correction — this file physically lives here but is no
longer a standalone, routed page.** First built with its own real route
(`/label-designer`) and a home-page tile; per direct follow-up ("Label
Designer isn't a tile, its a tab in configuration"), both were removed.
The component is now registered directly as the `'label_designer'` tab
inside `components/Config/System/index.tsx` — see that folder's own
`README.md` for the registration details. Left physically in `pages/`
rather than moved into `components/Config/System/` itself, since it is
still a real, complete page-level component (its own data fetching,
canvas, full layout), not a small, config-form-shaped section like its
sibling tabs — a real, deliberate judgment call, not an oversight.

*Superseded (Batch 367):* this note used to say the page used inline
`style={{...}}` throughout. It doesn't: see the Batch 367 section below.

## Batch 367 (PS-74): no inline CSS

`LabelDesignerPage.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368

`LabelDesignerPage.tsx` takes `labelLayoutService` and `facilityService` from `@/services`, and is off the deployment baseline.

## Batch 451 — screen-level test evidence for Priority 2 tickets

`LabelDesignerPage.test.tsx`: real barcodes on the canvas per label type, a bad payload shows a placeholder, and the Export ZPL panel (PS-256). `safeBarcodeSvg` moved to `utils/labels/safeBarcodeSvg.ts`, which now escapes its placeholder text.

## Batch 460 (PS-245)

Selected fields have eight resize handles (pointer capture). Placing, moving, resizing and typing are kept inside the label through `services/labelDesigner/labelFieldGeometry.ts`.
- Fields past the edge are outlined, with a warning and "Fit to label".
- The save's refusal is translated.
- A moved field keeps its grab point.

Tests: `LabelDesignerPage.test.tsx` (handle resize stops at the edge, handles only on the selected field, typed width capped, out-of-bounds warning, fit and refusal).

## Batch 500 (PS-473)

The canvas barcode renders through `sanitizeSvgMarkup`. The page test passes the sanitiser through (it needs happy-dom for its drag tests, where DOMPurify doesn't work); the sanitiser is tested on real Code 128, DataMatrix and QR SVGs under jsdom.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

The design canvas is a named group (`a11y.labelCanvas`); a click on empty canvas, or Escape, clears the selection. `MmInput` takes a `label`.

## Batch 548

Loading text here now uses `components/Common/LoadingState.tsx`: nothing for 300 ms, a placeholder, then "still working" from 3 s.
