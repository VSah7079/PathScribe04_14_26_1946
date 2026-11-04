# services/reportAppearance

Report appearance. `saveDocumentStyle.ts`: the default header, body and footer text styles, checked against `config:report-appearance:manage`.

## Batch 612 (part C)

- `fontUnits.ts`: a style's `units` (`pt` or `legacy_px`), the points a size prints at (8 pt floor; legacy 0.75 pt a pixel, 7 pt floor), the CSS size the preview draws, and the conversion plan. Mirrors `functions/report_layout.py`.
- `convertToPoints.ts`: **Convert to points** for the lab's header, body and footer styles (needs `config:report-appearance:manage`) and for one template (saved through the template service). Each conversion writes an audit entry (`REPORT_FONT_UNITS_CONVERTED`) with the sizes before and after, no case or patient data.
- `previewPage.ts`: the custom properties that draw a points template's preview at the paper's real width and side margins.

## Batch 609 (part A)

- `renderDocumentStyle.ts`: the lab's header, body and footer styles as the render request carries them (`documentStyle`); the surgical request uses the template's resolved style.

## Batch 431: the lab's page size and margins

`pageSetup.ts` (new). Pete: page size is lab policy, set by the printer stock.
- Set in Configuration → System → Document Style ("Page size and margins"). Saving needs `config:report-appearance:manage`.
- The template preview opens at this size. Trying another size or margin in the preview is for that preview only.
- The first read carries over what the preview remembered before (`ps_preview_page_size`, `ps_preview_margins`).
- Margins are kept between 5 and 50 mm; an unknown size falls back to A4.
- **Open (PS-345):** the PDF renderer (`functions/main.py`) still prints A4.

---
*Parent: [services/](../README.md).*

## Batch 606

`renderPageSetup()` gives the lab page size (mm) and margins; sent as `pageSetup` in the surgical and cytology report render requests. The renderer does not read it yet.
