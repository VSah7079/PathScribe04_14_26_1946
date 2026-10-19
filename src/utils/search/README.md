# utils/search/

The Search page's decisions, kept out of `pages/SearchPage.tsx` (standing rule 2). The server side of search is `services/caseSearch/`.

## Files

- **`resolveSearchDateRange.ts`** (+ `.test.ts`, Batch 349, PS-101): an identifier search with untouched dates covers every date. The hidden 30-day default used to hide older cases.
- **`buildCaseSearchRequest.ts`** (Batch 350):
  - `draftToCriteria` / `buildCaseSearchRequest`: the page's draft to the request the server runs. Only set filters are sent.
  - `normalizeCaseSearchDraft`: a stored draft, from any version, with every field present.
  - `applyIdentifierToDraft`: what the identifier box resolved to (a requisition number goes to the order-number filter).
  - `countDraftFilters`: the badge count. The date range counts only when it applies.
  - List helpers.
- **`describeCaseSearch.ts`** (Batch 350): the summary line and the "26–50" range.
  - Names are looked up: people, facilities, flags and protocols.
  - Statuses, priorities and sexes are translated. The old summary showed raw status codes.
- **`caseSearchCsv.ts`** (Batch 350): the CSV export.
  - Headings, statuses and priorities are translated.
  - Dates use the user's locale. A date of birth never shifts a day, and a timestamp is shown as the facility's date.
  - It used to have English headings and US dates, and covered only the rows on screen.
- **`caseSearchLabels.ts`** (Batch 350): translation keys and pill hues for statuses, priorities, sexes and sort orders.
- **`searchDateShortcuts.ts`** (Batch 350): the 7-day to 1-year and All shortcuts, calculated on the facility's calendar.
- **`searchSession.ts`** (Batch 350): this tab's search navigation state.
  - Holds the last search (filters, page, page size, sort), the "returning to Search" mark, and whether a case was opened from Search or the Worklist.
  - Results are not kept: they are fetched again on return, so the tab never holds patient data. The old page kept the whole result list in session storage.
  - UI code uses these functions instead of browser storage: AppShell's breadcrumb, WorklistTable, and the report page's Back.
- **`suggestSpecimens.ts`** (Batch 350): the specimen typeahead, from the specimen dictionary only. A hard-coded list of 24 English names is gone.
- **`lookupFilter.ts`** (Batch 350): text filter and grouping for the protocol and flag pickers.
- **`caseSearchUtils.test.ts`**: tests for the Batch 350 files.

## Batch 613 (part A) — case search reporting

- **`caseReportLabels.ts`**: translation keys and lookups for report values (group names, column headings, statuses, dates); shared by the screen and the CSV.
- **`caseReportCsv.ts`**: the report's CSV (a row per group with a total, or a row per case with the chosen columns); every cell quoted, formula cells neutralised. File name `pathscribe-case-report-<facility date>.csv`.
- `buildCaseSearchRequest.ts`, `describeCaseSearch.ts`: carry the synoptic answer filters (sent only when complete, counted, shown in the summary).

## Batch 351

- **`buildCaseSearchRequest.ts`**
  - Sends the new filters.
  - The date basis and pathologist role are sent only when they matter: the basis only with a date range, the role only with a pathologist.
  - A stored draft with an unknown basis or role falls back to the default.
  - `countMoreFilters` gives the "More filters" badge.
- **`caseSearchLabels.ts`:** label keys for the new options.
  - It reuses `caseStatusDisplay.revision.*`, `autopsyIntake.caseAuthority.*` and `jurisdictionNames.*`.
  - It also holds the autopsy jurisdiction list.
- **`describeCaseSearch.ts`:** summary parts for every new filter. The date wording follows the basis ("signed out 01/09/2026 — today"), and the role is named with the pathologists.
- **`caseSearchCsv.ts`:** a sign-out date column.

## Batch 473 — Case-type key migration

`caseSearchLabels.ts`'s autopsy-authority label map key renamed in step with `AutopsyCaseAuthority`: `medicolegal_forensic` → `statutory_judicial` (the i18n key path it points at, `autopsyIntake.caseAuthority.statutory_judicial`, renamed to match in all 5 locales). No behavior change. See `services/autopsy/README.md`.

---
*See [utils/README.md](../README.md) for how this folder fits utils/.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 543

`caseSearchCsv.ts`: cells are written with `csvQuoted` (`utils/csv.ts`), which neutralizes formula cells (finding F8).

## Batch 583

- `caseReturnTarget.ts` (new): where a case report's Back and breadcrumb go, and what they say, from where the case was opened (`'search'` → Search; otherwise Worklist). Used by `HeaderBar.tsx` (PS-101).
