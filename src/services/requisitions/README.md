# src/services/requisitions/

Batch 762 (Pete's "Automated Batch Requisition & Document Ingestion" specification, v1.0, Nov 2, 2026). Scanned
requisitions are matched to their case by the barcode on the page and linked, never copied. Product guide:
`docs/product/REQUISITION_INGESTION.md`; server contract: `docs/architecture/REQUISITION_INGESTION_API.md`.

| File | What it does |
|---|---|
| `requisitionTypes.ts` | Sources, links, the Unmatched queue, runs, the ingestion report. |
| `requisitionRules.ts` | Pure rules: PDF only, page grouping (new barcode, continuation page, separator sheet), lookup keys, the page address, a range's pages, a run's outcome, a source's problems. |
| `IRequisitionService.ts` | The contract and its refusal codes. |
| `requisitionService.ts` | `createRequisitionService(deps)`: match, link, quarantine, link a queued scan once its case exists, re-associate, discard, view. Checks the five capabilities and writes the audit trail (no file name). |
| `mockRequisitionService.ts` | The demo's wiring (mockStorage, caseRouter, the audit service; the demo source). |
| `httpRequisitionService.ts` | The API server's version (`/api/requisitions/requisition/*`). |
| `requisitionServiceInstance.ts` | Chooses between them (`chooseService('requisitions', …)`). |
| `requisitionPages.ts` | The JPEG page image of each PDF page (pdf-lib). |
| `demoRequisitionEngine.ts` | The demonstration's stand-in for the server job: reads `public/demo-requisitions/`, refuses non-PDFs, reads each page's Code 128 / Code 39 barcode with ZXing, groups the pages. |
| `requisitionIngestionRunner.ts` | Run ingestion now (every enabled source the user may run, then the missing check): in the browser only without an API server. |

Expected requisitions (in `requisitionService.ts`): `sweepMissing` flags a case expected to have a requisition with none linked after the grace period (and raises a Missing Requisition case deficiency), closes flags whose scan arrived, and marks scans with no case after the limit; `waiveMissing` records why no paper is coming; `findCasesToLink` searches for the case to link. Rules: `requisitionOriginOf`, `expectationFor`, `requisitionIsMissing`, `unmatchedIsOverdue`, `sourceLocationValid`.

Tests: `requisitionService.test.ts`, `requisitionRules.test.ts`, `demoRequisitionEngine.test.ts`, `httpRequisitionService.test.ts`.
