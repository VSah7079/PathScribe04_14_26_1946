# pages/ReportPreview/__tests__/

Tests for `ReportPreviewRenderer.tsx`.

## Files

- **`ReportPreviewRenderer.sectionLabelConfig.test.tsx`** — tests the section-label configuration resolution used when rendering `orchSections` against a resolved `ReportTemplate`.
- **`ReportPreviewRenderer.revisionAndReference.test.tsx`** — the amended/addendum/corrected banner and the footer document reference (Batch 495, 4 tests).

*Corrected in the Batch 496 README audit (Oct 9, 2026): added the second test file.*

## Batch 367 (PS-74): no inline CSS

`ReportPreviewRenderer.sectionLabelConfig.test.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

`ReportPreviewRenderer.sectionLabelConfig.test.tsx` now reads those custom properties instead of inline font styles.

---
*See [pages/ReportPreview/README.md](../README.md) for the parent folder.*
