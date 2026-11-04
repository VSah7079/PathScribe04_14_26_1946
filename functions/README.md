## Batch 742 — images inside their report section (Pete, Oct 30, 2026)

`render_report` takes `sectionImages: [{id, sectionId, sectionLabel, caption, kind, imageBase64, format, widthPx, heightPx}]`, built by the report page (`src/services/imageAssociation/reportSectionImages.ts`). Each image is drawn right under the section node whose `id` is its `sectionId` (narrative and AI sections alike), at 300 DPI or better (`section_image_size`: never enlarged past 300 DPI, at most the text width and 120 mm high), with its caption. `kind: "unavailable"` (or bytes that can't be read) prints the Image Unavailable notice in its place; `kind: "document"` prints "Attached document: … Its pages follow the report." (the browser adds the PDF's pages). An item placed at the end of the text (`report-end`), or under a section the layout doesn't have, prints under "Images" after the body. Each prints once. The text output lists them too. Four labels (`imagesTitle`, `imageUnavailable`, `documentAttached`, `documentAttachedNoCaption`) in `DEFAULT_LABELS` and in `surgicalReportPdf`. Python test: `test_section_images_print_inside_their_section` (**260 checks pass**, 249 before). Built on the copy of this folder from Oct 24, 2026. **Redeploy `functions/`.**

## Batch 613 (part B) — intraoperative diagnosis and related cases

`render_report` now draws two blocks sent in the payload: `intraoperativeDiagnosis` (after the case header and any revision banner, before the body) and `relatedCases` (after the body and maps, before the confidentiality line), in the PDF and in the text. Nothing is drawn when they are absent. Related cases are the snapshots the signer saw (`src/services/relatedCases/relatedCaseTypes.ts`) printed as recorded. Ten new labels (`intraopDiagnosis`, `relatedCasesTitle`, `relatedCasesNotice`, `relatedCaseReleased`, `relatedCaseSpecimens`, `relatedCaseDiagnosis`, `relatedCaseSignedBy`, `relatedCaseOrdering`, `relatedCaseCopyTo`, `relatedCaseClient`) are in `DEFAULT_LABELS` and in `surgicalReportPdf`. Checks in `test_main.py`. Redeploy `functions/`.

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

## Batch 612 (part C) — font sizes in points

`report_layout.py`: a style with `units: "pt"` (or a request with `fontUnits: "pt"`) is in points, printed at the number given with an 8 pt floor; a style with none or `legacy_px` is pixels, as before (0.75 pt a pixel, 7 pt floor). A field label's own size keeps printing as points (8 pt floor in a points template). `main.py` and `cytology_report.py` use it. Python tests: `test_font_units_rules`, `test_surgical_pdf_points_templates`. **Redeploy `functions/`.**

## Batch 609 (part A): page setup, Document Style, header and footer parts

`render_report` and the cytology template now read `pageSetup` (size A4/Letter/Legal/A3/A5, orientation, margins) and `documentStyle` (header, body, footer: font family, size in px, weight, underline, case) from the request; before this they always drew A4 portrait with fixed fonts. The shared rules are in `report_layout.py`:

- margins never below 12.7 mm; font size in px, 0.75 pt each, floored at 7 pt;
- Arial, Helvetica, Calibri, Verdana print as Helvetica; Times New Roman, Georgia as Times; Courier New as Courier; Korean stays Pretendard; the cytology template stays in embedded Liberation Sans;
- the header parts replace the institution block (first page only) and the footer parts the confidentiality line (every page, above the barcode band) when they draw something; footer parts have no page numbers;
- a request without `pageSetup` renders exactly as before.

Tests: new functions in `test_main.py` (201 checks pass). **Deploy:** redeploy this folder (`report_layout.py` is new).

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

## Batch 498: watermark, revision status, footer barcode, pre-analytic disclaimer (PS-283, PS-333)

The app had been sending `watermarkText`, `amendments`/`revisionStatus` and `preAnalyticDisclaimerText` for several batches; this renderer ignored them (found in the Batch 496 README audit). Now:

- **`watermarkText`** — drawn diagonally three times per page, in translucent red under the text, sized to stay inside the page width. Only sent while a case is in the post-sign-out release buffer.
- **`revision`** `{type, revisionCount, originalSignOutAt, latestRevisionAt}` — an amber banner after the case header (AMENDED / CORRECTED / REPORT WITH ADDENDUM, with "Originally signed out … · Revised …"), and the revision flag repeated in every page's footer. Dates arrive already written in the report's locale (`services/reports/buildReportRenderRevision.ts`). `amendments` and `revisionStatus` are still sent but not read.
- **Footer reference on every page** — a Code 128 barcode of `caseHeader.accession` (the scanner already opens a case from it; decoded with zbar in testing) and "Document {{accession}} · record version {{version}}" from `documentVersion`. An accession the barcode can't encode keeps the readable reference.
- **`preAnalyticDisclaimerText`** — a boxed paragraph before the report body.
- The text output (`outputFormat: 'text'`) carries the revision lines, the disclaimer and the reference too.
- New wording comes through `labels` (`revisionAmendment`, `revisionAddendum`, `revisionCorrection`, `revisionDatesWithOriginal`, `revisionDatesLatestOnly`, `documentReference`, `documentReferenceNoVersion`), English fallback in `DEFAULT_LABELS` (kept equal to `en.json` by `surgicalReportLabels.test.ts`).

Still not read: `documentStyle`, `headerAssembly`, `footerAssembly` (template styling and header/footer parts). PDF/A and deterministic re-rendering remain open (PS-333).

Tests: 5 new functions in `test_main.py` read the page text back with **pypdf** (needed only for tests: `pip install pypdf`) — every-page watermark and footer on a multi-page report, revision banner and dates, disclaimer, translated wording, unencodable accession. **113 checks pass** (92 before).

---
*When this folder's contents change meaningfully, update THIS file.*

## Batch 518

`receive_interface_message` accepts three new transaction types: `ACCESSION_EVENT`, `REFERRAL_MANIFEST` and `MOLECULAR_ORDER` (PS-122). `test_main.py` covers them; all 116 checks pass.

## Batch 520 (PS-280): report delivery by e-fax and file drop

- **`report_delivery.py` (new).** `receive_interface_message` accepts `REPORT_DELIVERY`: a signed report PDF to fax or drop as a file. The receiver **delivers it** before recording it:
  - **e-fax** goes through an email-to-fax gateway (SMTP; provider-neutral);
  - **file drop** writes the PDF plus a JSON metadata file to a named target, either a folder or an SFTP server with host-key checking. Files are written as `.part` and renamed, and nothing is ever overwritten.
- **Responses.** 200 once delivered; 503 when the channel or target isn't set up here; 502 when the gateway or target refused or couldn't be reached; 422 for an invalid payload. The stored record keeps the PDF's size and SHA-256, not the PDF.
- **Settings.** Environment variables: `FAX_SMTP_*`, `FAX_FROM_ADDRESS`, `FAX_TO_PATTERN`, `FILE_DROP_TARGETS`. Full contract and the serverless notes: `docs/architecture/REPORT_DELIVERY_API.md`.
- **Dependency.** `requirements.txt` adds `paramiko` (SFTP).
- **Tests.** `test_report_delivery.py` (new, 44 checks) runs over real connections: a local SMTP server, a local SFTP server, a temporary folder. Run it with `python test_report_delivery.py`. `test_main.py`'s 116 checks still pass.

## Batch 539 (PS-539 D2): the cytology template

`render_report` takes `"template": "cytology"` and hands the request to **`cytology_report.py`** (new). The browser composes every line of the report in its language (`src/services/cytology/cytologyRenderPayload.ts`); this template lays them out:
- A4, 15 mm margins, checked at import against the 0.5 inch printing minimum;
- embedded fonts only: Liberation Sans (`fonts/LiberationSans-*.ttf`, moved from the browser, `fonts/LiberationSans-LICENSE.txt`) or Pretendard for Korean, chosen per document;
- each document (a case report's first page, then each specimen) on a new page; the accession barcode on each report's first page; a continuation line with "Page X of Y" (in the document's language) on the others;
- section headings kept with their first line; an addendum on its own page when the lab says so; line breaks typed in a field kept;
- an optional watermark (an unsigned preview) on every page;
- the same bytes for the same request: the creation date is the signing time, the document ID is fixed.

Each PDF carries `pathscribe-template:cytology` in its Keywords; the browser refuses a PDF without it, so a release made against an older deployment is held, never sent blank. Text output is not offered for cytology (400).

**Deploy:** this folder must be redeployed (`firebase deploy --only functions`) before the Batch 539 zip is used; until then every cytology preview and release fails with "the report renderer has not been updated" and releases are held for retry. No new Python dependency.

Tests: 7 new functions in `test_main.py` (148 checks pass): the lines drawn, byte-identical output, embedded fonts and margins, continuation lines and per-document page numbering, cover and documents, the addendum page, watermark, an unencodable barcode, the logo, line breaks, mixed languages, and the HTTP entry point.

## Batch 618 (PS-336)

`render_report` reads `technicalBranding` (`facilityName`, `address`, `city`, `state`, `zip`) and prints one line under the case header, "Technical component performed at: ...", in the report language (`labels.technicalComponentAt`). Director and CLIA number are never drawn. The browser sends the block on signed-out reports only. Tested in `test_main.py` (239 checks).

## Batch 652 — Specimen pipeline gaps

The surgical report PDF is now repeatable: two renders of the same request are byte-identical (`invariant=1`, fixed producer text, creation date from `signedAt` when the request has one, else reportlab's fixed date, never the clock). `signing_time(payload)` reads `signedAt`, then `workup.signedAt`, then the first `workups[].signedAt`. Since Batch 661 the browser sends a top-level `signedAt` (the case's `finalizedAt`) on a signed case, so its PDF carries the signing date; an unsigned case still carries the fixed date. A different request, image or font is still a different file, so the stored SHA-256 of a released version stays the fingerprint that counts. Tested in `test_main.py` (`test_surgical_pdf_same_bytes_every_time`).

## Batch 652 (defect fixes)

`main.py` `_page_decorator`: the watermark's faint red fill is set inside its own saved graphics state and the footer barcode is drawn with an explicit opaque black fill, so the barcode scans on a pending-release print. Test: `test_footer_barcode_is_solid_black_under_a_watermark` in `test_main.py`.
