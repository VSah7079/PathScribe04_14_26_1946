# services/caseReports/

**Batch 613: saved case-search reports.** A report definition (`CaseReportDefinition`) is the Search page's whole draft plus its grouping and columns. It is saved through the saved-search service under the context `caseReport`, so it is private to its owner like a saved search.

- **`caseReportDefinition.ts`**: the type, an empty definition, and `normalizeCaseReportDefinition` (reads back any stored version safely: unknown grouping becomes pathologist, unknown columns are dropped, an older draft gets the new fields).
- **`savedCaseReports.ts`** (+ test): list, save (a name is required), rename, delete, record a use. Built from a store and a user id so it tests without modules.
- **`caseReportStore.ts`**: wired to `mockSavedSearchService` and the session user.

Schedules that run saved reports: `services/scheduledReports/`. The report engine: `services/caseSearch/caseSearchReport.ts`.
