# functions

The Python cloud functions. Run the tests with `python test_main.py`.

- `render_report`: the report renderer (ReportLab). Every surgical and autopsy report PDF and text comes from it, posted by the browser with the report's layout, sections, synoptic answers and labels in the report's language (Batch 392).
  - **Batch 426:** a `workup` block draws one synoptic workup as its own PDF, with no report layout needed:
    - parts, protocol and version, status, version, signer, document id;
    - the answers;
    - for a correction, "Changed in this version".

    This is how an Assist case's synoptic goes to the LIS (`src/services/reports/workupPdf.ts`, `docs/architecture/SYNOPTIC_RESULT_API.md`).
- `receive_interface_message`: the stand-in receiving end for PathScribe's outbound interface messages.

Its rendering logic mirrors the TypeScript report renderer by hand (see the header of `main.py`). Its English labels must match `surgicalReportPdf` in `src/i18n/locales/en.json`, which `surgicalReportLabels.test.ts` checks.

## Batch 427

`render_report` also takes `workups: [...]`: every workup of a case drawn one after another in one PDF. This is for a lab whose LIS takes one PDF per accession.

## Batch 435

`receive_interface_message` accepts every outbound transaction type the browser sends. Its list had stopped at `ORDER_CREATED`, so `REGISTRY_REPORT`, `CANCER_REGISTRY_REPORT`, `PRINT_JOB` and `CRITICAL_ALERT` were refused with 422. It now also takes `WSI_SCAN_MANIFEST`, and checks that manifest's batch, scanner and slides.

The routing list for the engine is `docs/architecture/INTERFACE_TRANSACTIONS.md`. `src/services/interfaceDispatch/interfaceTransactions.guard.test.ts` keeps the browser, this list and that document in step. New Python checks are in `test_main.py`: 82 pass.

## Batch 461: organ-map figures in the PDF

`render_report` accepts `reportFigures: [{ instanceId, mapType, pngBase64, svg, width, height }]`: the anatomical maps the pathologist inserted. `figure_flows` draws each after the report body, at most the text width with its proportions kept; a figure without a readable PNG is skipped and the report still renders. `requirements.txt` states `pillow` (already a reportlab dependency). A long or multi-line synoptic answer (a results grid prints a line per part) now wraps inside its cell instead of running past the margin. Test: `test_report_figures_drawn_in_pdf` in `test_main.py` (85 checks pass). The text output does not include the figures.

## Batch 463

`reportFigures` entries may carry `notice: true` and `fallbackLines` (maps that are part of the report: Mohs). When such a figure has no readable PNG, `figure_notice` prints a boxed notice in its place, never a silent gap: `labels.figureNotDrawn` (in the report's language; English fallback in `DEFAULT_LABELS`) and then each fallback line as text (the Mohs stage lines). An optional inserted figure without an image is still left out. Test: `test_report_figure_notice_when_not_drawn` (92 checks pass). The production renderer (ASP.NET Core, Svg.Skia) is specified in `docs/architecture/ORGAN_MAPPING_API.md` §5.

Production note (Pete, Oct 5, Batch 463): the production report PDF will be rendered by the API server with Microsoft.Playwright / headless Chromium (`docs/architecture/REPORT_RENDERING_SERVICE.md`). This renderer remains the current one until that service exists.

---
*When this folder's contents change meaningfully, update THIS file.*
