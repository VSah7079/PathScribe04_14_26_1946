# services/reportAppearance

Report appearance. `saveDocumentStyle.ts`: the default header, body and footer text styles, checked against `config:report-appearance:manage`.

## Batch 431: the lab's page size and margins

`pageSetup.ts` (new). Pete: page size is lab policy, set by the printer stock.
- Set in Configuration → System → Document Style ("Page size and margins"). Saving needs `config:report-appearance:manage`.
- The template preview opens at this size. Trying another size or margin in the preview is for that preview only.
- The first read carries over what the preview remembered before (`ps_preview_page_size`, `ps_preview_margins`).
- Margins are kept between 5 and 50 mm; an unknown size falls back to A4.
- **Open (PS-345):** the PDF renderer (`functions/main.py`) still prints A4.

---
*Parent: [services/](../README.md).*
