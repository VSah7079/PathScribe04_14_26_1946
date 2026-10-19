# src/components/RelatedCases/

Batch 613 (part B). Screens for related cases; all rules live in `src/services/relatedCases/`.

- `RelatedCasePicker.tsx`: one inline picker (nothing pre-ticked; ordering and copy-to physicians per case; optional Select all). Used by the sign-out view and the Patient summary.
- `RelatedCaseList.tsx`: the one layout for a chosen case; the report preview, the sign-out view and the summary sheet all use it, and `functions/main.py` draws the same fields in the same order.
- `RelatedCasesSignOutPanel.tsx`: the sign-out part: picker, notice of cases the user cannot open (`RestrictedCasesNotice`), full preview of the chosen reports. Saves the choice at once.
- `PatientSummaryPanel.tsx`: the Patient History part: picker, Print summary, and the print sheet (isolated by body class `ps-summary-printing`).
- `RelatedCasesAmendedNotice.tsx`: flag on a signed report when an attached case was amended later.
