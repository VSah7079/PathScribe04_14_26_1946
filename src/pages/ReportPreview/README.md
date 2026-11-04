**Batch 742:** `ReportPreviewRenderer.tsx` shows images placed in a section under that section, and those placed at the end of the text (or under a section the layout lacks) under "Images", as `functions/main.py` prints them (`components/CaseAttachments/PlacedImages.tsx`, `hooks/useReportPlacements.ts`).

## Batch 613 (part B)
`ReportPreviewRenderer` takes `intraoperativeDiagnosis` (drawn after the case header, part of the case report) and `relatedCases` (the section the signer attached, drawn after the body with the shared `RelatedCaseList`).

# pages/ReportPreview/

Renders Orchestration mode's `orchSections` as a formatted clinical report preview.

## Files

- **`ReportPreviewRenderer.tsx`** — template-driven: section headings, typography, and layout come from the resolved `ReportTemplate`, not hardcoded here. Deliberately a placeholder for a future real PDF render — when ReportLab (or equivalent) is wired in, this component is meant to be swapped for a real PDF iframe, not extended indefinitely.
- ~~`ReportPreviewPage.tsx`~~ — **retired in Batch 497** (see below). This folder now holds only `ReportPreviewRenderer.tsx`, the report document used inline by the report page and by its HTML print.
- **`__tests__/ReportPreviewRenderer.sectionLabelConfig.test.tsx`** — tests the section-label configuration resolution specifically.
- **`__tests__/ReportPreviewRenderer.revisionAndReference.test.tsx`** — the revision banner and footer document reference (Batch 495).

*Corrected in the Batch 496 README audit (Oct 9, 2026): the file list was missing `ReportPreviewPage.tsx` and the second test file.*


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`ReportPreviewRenderer.tsx`: the date of birth is tagged (name and MRN already were). Column layout comes in as `--rp-cols` / `--rp-gap` custom properties; it was two inline style properties.

## Batch 367 (PS-74): no inline CSS

`ReportPreviewRenderer.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

`ReportPreviewRenderer.tsx`: `labelStyle()` is gone. A template's label formatting reaches the page, header, footer, section headings and field labels as `--rp-<part>-*` custom properties (`utils/labelStyleVars.ts`, now with a name prefix so a page's settings don't leak into its headings).

## Batch 431

Draft sections come from the case only (no browser copy, which could be older than a save made at another workstation). The window position is a display preference.

## Batch 437

Printing from the preview is audited (`DOCUMENT_PREVIEW_PRINTED`, PS-282).

## Batch 500 (PS-473)

`ReportPreviewRenderer.tsx`: report sections and paragraphs render through `sanitizeRichHtml`, the footer barcode through `sanitizeSvgMarkup`, and a paragraph's placeholder text is escaped. Its revision/reference test now runs under jsdom (DOMPurify doesn't work under happy-dom).

---
*See [pages/README.md](../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 495 — the preview window is routed, permission-checked, and prints revision status and a footer barcode

- **Route fix (front-end gap audit):** `/report-preview/:caseId` — the detachable live-preview window `usePreviewChannel.ts`'s `openPreviewWindow()` opens — was never registered in `App.tsx`, so the pop-out hit the catch-all and redirected to `/login`. Now a route inside `ProtectedRoute`/`MobileRestrictedRoute` but outside both AppShell groups (this page draws its own top bar and wants no AppShell or NavBar). It shows PHI, so it stays behind sign-in.
- **Print permission (PS-283 §4.2.4):** Print is a `CapabilityButton` for `report:case-report:print`, and `handlePrint` calls `beginReportPrint()`; a refusal prints nothing, records nothing, and shows a message (`.rp-topbar-error`).
- **`ReportPreviewRenderer.tsx`:** new optional `revisionStatus` prop draws an amended/addendum/corrected banner with the original sign-out and latest revision dates (PS-283 §4.2.2), and every case with an accession now gets a footer document reference — Code 128 of the accession plus the record version, tagged `data-phi="accession"` (§4.2.3). Template previews with no accession show neither.
- **Per-case access check (found by the route-gating guard once the route existed):** the page now opens its case through `openCaseForViewDefault()` — the same check `/report/:caseId` runs (`resolveCaseAccessGate`: Orchestration, pediatric, other organisation). A restricted or missing case shows the neutral `CaseUnavailable` message, and nothing from the case — loaded or live from the editor — is drawn until the check passes. This also replaced its direct `mockOrchestratorCaseService` import, so the page is off the deployment baseline.
- Tests: `__tests__/ReportPreviewRenderer.revisionAndReference.test.tsx` (4); `SynopticReportPage/modals/printOutputAudit.test.tsx` covers the preview's print, refusal, and restricted-case behaviour.

*Correction (Batch 496 README audit): the surgical/orchestration PDF renderer is not external — it is `render_report` in `functions/main.py` in this repo. It reads only the case header, institution, body parts, sections, synoptic answers, map figures and render scope; it ignores `amendments`, `revisionStatus`, `watermarkText`, `preAnalyticDisclaimerText`, `documentStyle` and the header/footer parts, so none of those appear on the generated PDF yet. That work is in this repo (PS-333), not blocked.*

*Correction (Batch 496 README audit): nothing in the app opens the preview window today — `usePreviewSender()` / `openPreviewWindow()` (`hooks/usePreviewChannel.ts`) have no callers, so the route works only when its address is opened directly. Restoring a pop-out button in the editor, or retiring the page, is an open decision.*

## Batch 497 — the standalone preview window is retired

Pete, Oct 9: *"Retire it."* `ReportPreviewPage.tsx` (`/report-preview/:caseId`) and its hook `hooks/usePreviewChannel.ts` are deleted, with the route, its guard-list entries, the page's own CSS (`rp-shell`, `rp-topbar*`, `rp-live*`, `rp-content`, `rp-loading*`) and its text keys (`reportPreviewPage.*`, all five languages).

**Why:** nothing opened the window — `usePreviewSender()` had no caller — and Pete had already confirmed it as superseded, dead architecture once before (see `hooks/README.md`): the live preview is `ReportPreviewRenderer` inline in the report editor, and printing goes through the report page. The files had come back because a zip can't delete files; Batch 495 then re-added the route from a gap audit without checking that history. That was a mistake, now undone.

**What stays:** `ReportPreviewRenderer.tsx`, including Batch 495's revision banner and footer barcode — the report page and its HTML fallback print both use it.

**Deleting the files by hand:** `DELETED_FILES.txt` at the repo root lists them.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 612 (part C)

`ReportPreviewRenderer` takes `fontUnits`. In points it draws the page at the lab's paper width and side margins (`--rp-page-w`, `--rp-pad-l/-r`) with sizes in CSS points (1 pt = 1.333 px). A style saved in pixels is drawn in pixels, as before. Vertical margins and page breaks are not drawn in this preview.

- Batch 662: the report data now carries `patient.sexAtBirth` (English word) and `patient.nhsNumber`; `patient.sex` stays the stored code.
