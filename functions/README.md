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

---
*When this folder's contents change meaningfully, update THIS file.*
